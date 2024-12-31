use crate::error::AppError;
use rodio::{Decoder, OutputStreamHandle, Sink, Source};
use std::fs::File;
use std::io::{BufReader, Cursor, Read, Seek, SeekFrom};
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Condvar, Mutex};
use std::time::Duration;
use tauri::{Runtime, State, Emitter};
use reqwest;
use futures_util::StreamExt;

pub struct AudioState {
    pub sink: Arc<Mutex<Option<Sink>>>,
    pub stream_handle: OutputStreamHandle,
    pub buffer: Arc<Mutex<Vec<u8>>>,
    pub is_stream_ended: Arc<AtomicBool>,
    pub decoder: Arc<Mutex<Option<Decoder<Cursor<Vec<u8>>>>>>,
    pub data_available: Arc<(Mutex<bool>, Condvar)>,
}

struct StreamingSource {
    buffer: Arc<Mutex<Vec<u8>>>,
    is_stream_ended: Arc<AtomicBool>,
    decoder: Arc<Mutex<Option<Decoder<Cursor<Vec<u8>>>>>>,
    position: usize,
    data_available: Arc<(Mutex<bool>, Condvar)>,
}

impl StreamingSource {
    fn new(
        buffer: Arc<Mutex<Vec<u8>>>,
        is_stream_ended: Arc<AtomicBool>,
        decoder: Arc<Mutex<Option<Decoder<Cursor<Vec<u8>>>>>>,
        data_available: Arc<(Mutex<bool>, Condvar)>,
    ) -> Self {
        StreamingSource {
            buffer,
            is_stream_ended,
            decoder,
            position: 0,
            data_available,
        }
    }

    fn reset(&mut self) {
        self.position = 0;
        *self.decoder.lock().unwrap() = None;
    }

    fn try_seek(&mut self, pos: Duration) -> std::result::Result<(), rodio::source::SeekError> {
        let sample_rate = self.sample_rate() as f64;
        let target_sample = (pos.as_secs_f64() * sample_rate) as usize;

        let total_samples = {
            let buffer = self.buffer.lock().unwrap();
            buffer.len() / 4 // Assuming 16-bit stereo
        }; // The lock is released here

        if target_sample >= total_samples {
            return Err(rodio::source::SeekError::NotSupported {
                underlying_source: "streaming",
            });
        }

        self.position = target_sample * 4;
        self.reset();
        Ok(())
    }
}

impl Read for StreamingSource {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        let mut total_read = 0;
        while total_read < buf.len() {
            let buffer = self.buffer.lock().unwrap();
            if self.position < buffer.len() {
                let remaining = buffer.len() - self.position;
                let to_read = std::cmp::min(remaining, buf.len() - total_read);
                buf[total_read..total_read + to_read]
                    .copy_from_slice(&buffer[self.position..self.position + to_read]);
                self.position += to_read;
                total_read += to_read;
            } else if self.is_stream_ended.load(Ordering::Relaxed) {
                break;
            } else {
                drop(buffer);
                let (lock, cvar) = &*self.data_available;
                let mut available = lock.lock().unwrap();
                if !*available {
                    available = cvar.wait(available).unwrap();
                }
                *available = false;
            }
        }
        Ok(total_read)
    }
}

impl Seek for StreamingSource {
    fn seek(&mut self, pos: SeekFrom) -> std::io::Result<u64> {
        let buffer_len = self.buffer.lock().unwrap().len() as u64;
        let new_pos = match pos {
            SeekFrom::Start(offset) => offset,
            SeekFrom::Current(offset) => (self.position as i64 + offset).try_into().unwrap(),
            SeekFrom::End(offset) => (buffer_len as i64 + offset).try_into().unwrap(),
        };

        if new_pos > (buffer_len as i64).try_into().unwrap() {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "Invalid seek position",
            ));
        }

        self.position = new_pos as usize;
        self.reset();
        Ok(self.position as u64)
    }
}

impl Iterator for StreamingSource {
    type Item = i16;

    fn next(&mut self) -> Option<Self::Item> {
        loop {
            let mut decoder = self.decoder.lock().unwrap();
            if let Some(ref mut dec) = *decoder {
                if let Some(sample) = dec.next() {
                    return Some(sample);
                }
            }

            drop(decoder);

            let buffer = self.buffer.lock().unwrap();
            if self.position < buffer.len() {
                let new_buffer = buffer[self.position..].to_vec();
                self.position = buffer.len();
                drop(buffer);

                let mut decoder = self.decoder.lock().unwrap();
                *decoder = Decoder::new(Cursor::new(new_buffer)).ok();
            } else if self.is_stream_ended.load(Ordering::Relaxed) {
                return None;
            } else {
                // Wait for more data
                drop(buffer);
                let (lock, cvar) = &*self.data_available;
                let mut available = lock.lock().unwrap();
                if !*available {
                    available = cvar.wait(available).unwrap();
                }
                *available = false;
            }
        }
    }
}

impl Source for StreamingSource {
    fn current_frame_len(&self) -> Option<usize> {
        self.decoder
            .lock()
            .unwrap()
            .as_ref()
            .and_then(|d| d.current_frame_len())
    }

    fn channels(&self) -> u16 {
        self.decoder
            .lock()
            .unwrap()
            .as_ref()
            .map(|d| d.channels())
            .unwrap_or(2)
    }

    fn sample_rate(&self) -> u32 {
        self.decoder
            .lock()
            .unwrap()
            .as_ref()
            .map(|d| d.sample_rate())
            .unwrap_or(44100)
    }

    fn total_duration(&self) -> Option<Duration> {
        let buffer = self.buffer.lock().unwrap();
        let total_samples = buffer.len() / 2 / self.channels() as usize;
        Some(Duration::from_secs_f64(
            total_samples as f64 / self.sample_rate() as f64,
        ))
    }

    fn try_seek(&mut self, pos: Duration) -> std::result::Result<(), rodio::source::SeekError> {
        self.try_seek(pos)
    }
}

#[tauri::command]
pub async fn play_url_stream<R: Runtime>(
    _app: tauri::AppHandle<R>,
    state: State<'_, AudioState>, 
    url: String
) -> std::result::Result<(), AppError> {
    // Create HTTP client first
    let client = reqwest::Client::new();
    let response = client.get(&url)
        .send()
        .await
        .map_err(|e| AppError::NetworkError(e.to_string()))?;

    // Get data after response is received
    let mut sink_guard = state.sink.lock().unwrap();
    if let Some(sink) = sink_guard.take() {
        sink.stop();
    }

    // Reset stream state
    {
        let mut buffer = state.buffer.lock().unwrap();
        buffer.clear();
        state.is_stream_ended.store(false, Ordering::Relaxed);
    }
    *state.decoder.lock().unwrap() = None;

    // Create new sink with streaming source
    let sink = Sink::try_new(&state.stream_handle)
        .map_err(|e| AppError::SinkCreationError(e.to_string()))?;

    let streaming_source = StreamingSource::new(
        state.buffer.clone(),
        state.is_stream_ended.clone(),
        state.decoder.clone(),
        state.data_available.clone(),
    );
    sink.append(streaming_source);
    
    // Start background streaming task
    let buffer = state.buffer.clone();
    let is_stream_ended = state.is_stream_ended.clone();
    let data_available = state.data_available.clone();
    
    tokio::spawn(async move {
        let mut bytes_stream = response.bytes_stream();
        while let Some(chunk) = bytes_stream.next().await {
            if let Ok(data) = chunk {
                let mut buffer = buffer.lock().unwrap();
                buffer.extend_from_slice(&data);
                
                // Signal new data available
                let (lock, cvar) = &*data_available;
                let mut available = lock.lock().unwrap();
                *available = true;
                cvar.notify_one();
            }
        }
        is_stream_ended.store(true, Ordering::Relaxed);
    });

    sink.play();
    *sink_guard = Some(sink);

    Ok(())
}

#[tauri::command]
pub async fn play_local_file<R: Runtime>(
    _app: tauri::AppHandle<R>, // Add app parameter for consistency
    state: State<'_, AudioState>, 
    file_path: String
) -> std::result::Result<(), AppError> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err(AppError::FileNotFound(file_path));
    }

    let mut sink_guard = state.sink.lock().unwrap();
    if let Some(sink) = sink_guard.take() {
        sink.stop();
    }

    let file = File::open(&file_path).map_err(|e| AppError::FileOpenError(e.to_string()))?;
    let buf_reader = BufReader::new(file);

    let source = Decoder::new(buf_reader).map_err(|e| AppError::DecodeError(e.to_string()))?;

    let sink = Sink::try_new(&state.stream_handle)
        .map_err(|e| AppError::SinkCreationError(e.to_string()))?;

    sink.append(source);

    *sink_guard = Some(sink);

    Ok(())
}

#[tauri::command]
pub async fn play_arraybuffer<R: Runtime>(
    app: tauri::AppHandle<R>,
    state: State<'_, AudioState>,
    buffer: Vec<u8>,
) -> std::result::Result<(), AppError> {
    let duration: u64;
    {
        // Clone buffer for first usage
        let cursor = Cursor::new(buffer.clone());
        let source = Decoder::new(cursor).map_err(|e| AppError::DecodeError(e.to_string()))?;
        duration = source.total_duration()
            .ok_or_else(|| AppError::DecodeError("Could not get duration".to_string()))?
            .as_millis() as u64;
    }

    let mut sink_guard = state.sink.lock().unwrap();
    if let Some(sink) = sink_guard.take() {
        sink.stop();
    }

    // Use original buffer here
    let cursor = Cursor::new(buffer);
    let source = Decoder::new(cursor).map_err(|e| AppError::DecodeError(e.to_string()))?;
    let sink = Sink::try_new(&state.stream_handle)
        .map_err(|e| AppError::SinkCreationError(e.to_string()))?;

    app.emit("update_duration", duration)?;
    sink.append(source);
    *sink_guard = Some(sink);

    Ok(())
}

// Add explicit type parameters for all non-async commands
#[tauri::command]
pub fn get_music_status(state: State<AudioState>) -> std::result::Result<String, AppError> {
    let sink: std::sync::MutexGuard<Option<Sink>> = state.sink.lock().unwrap();
    Ok(match &*sink {
        Some(s) if s.is_paused() => "Paused".to_string(),
        Some(_) => "Playing".to_string(),
        None => "Stopped".to_string(),
    })
}

#[tauri::command]
pub fn pause(state: State<AudioState>) -> std::result::Result<(), AppError> {
    let sink = state.sink.lock().unwrap();
    if let Some(s) = &*sink {
        s.pause();
        Ok(())
    } else {
        Err(AppError::InvalidOperation(
            "No active playback to pause".to_string(),
        ))
    }
}

#[tauri::command]
pub fn resume(state: State<AudioState>) -> std::result::Result<(), AppError> {
    let sink = state.sink.lock().unwrap();
    if let Some(s) = &*sink {
        s.play();
        Ok(())
    } else {
        Err(AppError::InvalidOperation(
            "No active playback to play".to_string(),
        ))
    }
}

#[tauri::command]
pub fn set_volume(state: State<AudioState>, volume: f32) -> std::result::Result<(), AppError> {
    let sink = state.sink.lock().unwrap();
    if let Some(s) = &*sink {
        s.set_volume(volume);
        Ok(())
    } else {
        Err(AppError::InvalidOperation(
            "No active playback to set volume".to_string(),
        ))
    }
}

#[tauri::command]
pub fn get_volume(state: State<AudioState>) -> std::result::Result<f32, AppError> {
    let sink = state.sink.lock().unwrap();
    if let Some(s) = &*sink {
        Ok(s.volume())
    } else {
        Err(AppError::InvalidOperation("No active playback".to_string()))
    }
}

#[tauri::command]
pub fn set_playback_progress(state: State<AudioState>, progress: f32) -> std::result::Result<(), AppError> {
    let mut sink = state.sink.lock().unwrap();

    if let Some(s) = sink.as_mut() {
        let duration = Duration::from_secs_f32(progress);
        s.try_seek(duration)
            .map_err(|e| AppError::SeekError(e.to_string()))?;
        Ok(())
    } else {
        Err(AppError::InvalidOperation(
            "No active playback to set progress".to_string(),
        ))
    }
}

#[tauri::command]
pub fn get_playback_progress(state: State<AudioState>) -> std::result::Result<f32, AppError> {
    let sink = state.sink.lock().unwrap();

    if let Some(s) = &*sink {
        Ok(s.get_pos().as_secs_f32())
    } else {
        Err(AppError::InvalidOperation("No active playback".to_string()))
    }
}

#[tauri::command]
pub fn set_speed(state: State<AudioState>, speed: f32) -> std::result::Result<(), AppError> {
    let sink = state.sink.lock().unwrap();
    if let Some(s) = &*sink {
        s.set_speed(speed);
        Ok(())
    } else {
        Err(AppError::InvalidOperation(
            "No active playback to set speed".to_string(),
        ))
    }
}
