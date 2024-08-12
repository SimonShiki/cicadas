use rodio::{Decoder, OutputStreamHandle, Sink, Source};
use std::fs::File;
use std::io::{BufReader, Cursor, Read, Seek, SeekFrom};
use std::sync::{Arc, Condvar, Mutex};
use std::time::Duration;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use crate::error::AppError;
use tauri::{Emitter, State};

type Result<T> = std::result::Result<T, AppError>;

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
    fn new(buffer: Arc<Mutex<Vec<u8>>>, is_stream_ended: Arc<AtomicBool>, decoder: Arc<Mutex<Option<Decoder<Cursor<Vec<u8>>>>>>, data_available: Arc<(Mutex<bool>, Condvar)>) -> Self {
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
            return Err(rodio::source::SeekError::NotSupported { underlying_source: "streaming" });
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
                buf[total_read..total_read + to_read].copy_from_slice(&buffer[self.position..self.position + to_read]);
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
            return Err(std::io::Error::new(std::io::ErrorKind::InvalidInput, "Invalid seek position"));
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
        self.decoder.lock().unwrap().as_ref().and_then(|d| d.current_frame_len())
    }

    fn channels(&self) -> u16 {
        self.decoder.lock().unwrap().as_ref().map(|d| d.channels()).unwrap_or(2)
    }

    fn sample_rate(&self) -> u32 {
        self.decoder.lock().unwrap().as_ref().map(|d| d.sample_rate()).unwrap_or(44100)
    }

    fn total_duration(&self) -> Option<Duration> {
        let buffer = self.buffer.lock().unwrap();
        let total_samples = buffer.len() / 2 / self.channels() as usize;
        Some(Duration::from_secs_f64(total_samples as f64 / self.sample_rate() as f64))
    }

    fn try_seek(&mut self, pos: Duration) -> std::result::Result<(), rodio::source::SeekError> {
        self.try_seek(pos)
    }
}

#[tauri::command]
pub async fn start_streaming(audio_state: State<'_, AudioState>) -> Result<()> {
    // Terminate the current sink if it exists
    let mut sink_guard = audio_state.sink.lock().unwrap();
    if let Some(old_sink) = sink_guard.take() {
        old_sink.stop();
    }

    // Reset the buffer and stream end flag
    {
        let mut buffer = audio_state.buffer.lock().unwrap();
        buffer.clear();
        audio_state.is_stream_ended.store(false, Ordering::Relaxed);
    }

    // Reset the decoder
    *audio_state.decoder.lock().unwrap() = None;

    // Create a new sink
    let new_sink = Sink::try_new(&audio_state.stream_handle)
        .map_err(|e| AppError::SinkCreationError(e.to_string()))?;

    // Create and append the StreamingSource
    let streaming_source = StreamingSource::new(
        audio_state.buffer.clone(),
        audio_state.is_stream_ended.clone(),
        audio_state.decoder.clone(),
        audio_state.data_available.clone(),
    );
    new_sink.append(streaming_source);

    // Store the new sink
    *sink_guard = Some(new_sink);

    Ok(())
}

#[tauri::command]
pub async fn add_stream_chunk(
    audio_state: State<'_, AudioState>,
    chunk: Vec<u8>,
) -> Result<()> {
    let mut buffer = audio_state.buffer.lock().unwrap();
    buffer.extend_from_slice(&chunk);

    // Signal that new data is available
    let (lock, cvar) = &*audio_state.data_available;
    let mut available = lock.lock().unwrap();
    *available = true;
    cvar.notify_one();

    // Start playing if this is the first chunk
    if buffer.len() == chunk.len() {
        drop(buffer); // Release the lock before calling play()
        if let Some(sink) = audio_state.sink.lock().unwrap().as_ref() {
            sink.play();
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn end_stream(audio_state: State<'_, AudioState>) -> Result<()> {
    audio_state.is_stream_ended.store(true, Ordering::Relaxed);
    
    // Signal that the stream has ended
    let (lock, cvar) = &*audio_state.data_available;
    let mut available = lock.lock().unwrap();
    *available = true;
    cvar.notify_one();

    Ok(())
}

impl From<rodio::decoder::DecoderError> for AppError {
    fn from(error: rodio::decoder::DecoderError) -> Self {
        AppError::DecodeError(error.to_string())
    }
}

#[tauri::command]
pub async fn play_local_file(audio_state: State<'_, AudioState>, file_path: String) -> Result<()> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err(AppError::FileNotFound(file_path));
    }

    let mut sink_guard = audio_state.sink.lock().unwrap();
    if let Some(sink) = sink_guard.take() {
        sink.stop();
    }

    let file = File::open(&file_path).map_err(|e| AppError::FileOpenError(e.to_string()))?;
    let buf_reader = BufReader::new(file);

    let source = Decoder::new(buf_reader).map_err(|e| AppError::DecodeError(e.to_string()))?;

    let sink = Sink::try_new(&audio_state.stream_handle)
        .map_err(|e| AppError::SinkCreationError(e.to_string()))?;

    sink.append(source);

    *sink_guard = Some(sink);

    Ok(())
}

#[tauri::command]
pub async fn play_arraybuffer(app: tauri::AppHandle, audio_state: State<'_, AudioState>, buffer: Vec<u8>) -> Result<()> {
    let mut sink_guard = audio_state.sink.lock().unwrap();
    if let Some(sink) = sink_guard.take() {
        sink.stop();
    }

    // Use a cursor to wrap the buffer and create a source from it
    let cursor = Cursor::new(buffer);

    // Decode the audio data from the buffer
    let source = Decoder::new(cursor).map_err(|e| AppError::DecodeError(e.to_string()))?;

    // Create a new sink for playback
    let sink = Sink::try_new(&audio_state.stream_handle)
        .map_err(|e| AppError::SinkCreationError(e.to_string()))?;

    // Report the actual duration
    let _ = app.emit("update_duration", source.total_duration().unwrap().as_millis());
    
    // Append the source to the sink
    sink.append(source);

    // Replace the old sink with the new one
    *sink_guard = Some(sink);

    Ok(())
}

#[tauri::command]
pub async fn get_music_status(audio_state: State<'_, AudioState>) -> Result<String> {
    let sink: std::sync::MutexGuard<Option<Sink>> = audio_state.sink.lock().unwrap();
    Ok(match &*sink {
        Some(s) if s.is_paused() => "Paused".to_string(),
        Some(_) => "Playing".to_string(),
        None => "Stopped".to_string(),
    })
}

#[tauri::command]
pub async fn pause(audio_state: State<'_, AudioState>) -> Result<()> {
    let sink = audio_state.sink.lock().unwrap();
    if let Some(s) = &*sink {
        s.pause();
        Ok(())
    } else {
        Err(AppError::InvalidOperation("No active playback to pause".to_string()))
    }
}

#[tauri::command]
pub async fn resume(audio_state: State<'_, AudioState>) -> Result<()> {
    let sink = audio_state.sink.lock().unwrap();
    if let Some(s) = &*sink {
        s.play();
        Ok(())
    } else {
        Err(AppError::InvalidOperation("No active playback to play".to_string()))
    }
}

#[tauri::command]
pub async fn set_volume(audio_state: State<'_, AudioState>, volume: f32) -> Result<()> {
    let sink = audio_state.sink.lock().unwrap();
    if let Some(s) = &*sink {
        s.set_volume(volume);
        Ok(())
    } else {
        Err(AppError::InvalidOperation("No active playback to set volume".to_string()))
    }
}

#[tauri::command]
pub async fn get_volume(audio_state: State<'_, AudioState>) -> Result<f32> {
    let sink = audio_state.sink.lock().unwrap();
    if let Some(s) = &*sink {
        Ok(s.volume())
    } else {
        Err(AppError::InvalidOperation("No active playback".to_string()))
    }
}

#[tauri::command]
pub async fn set_playback_progress(audio_state: State<'_, AudioState>, progress: f32) -> Result<()> {
    let mut sink = audio_state.sink.lock().unwrap();
    
    if let Some(s) = sink.as_mut() {
        let duration = Duration::from_secs_f32(progress);
        s.try_seek(duration)
            .map_err(|e| AppError::SeekError(e.to_string()))?;
        Ok(())
    } else {
        Err(AppError::InvalidOperation("No active playback to set progress".to_string()))
    }
}

#[tauri::command]
pub async fn get_playback_progress(audio_state: State<'_, AudioState>) -> Result<f32> {
    let sink = audio_state.sink.lock().unwrap();
    
    if let Some(s) = &*sink {
        Ok(s.get_pos().as_secs_f32())
    } else {
        Err(AppError::InvalidOperation("No active playback".to_string()))
    }
}

#[tauri::command]
pub async fn set_speed(audio_state: State<'_, AudioState>, speed: f32) -> Result<()> {
    let sink = audio_state.sink.lock().unwrap();
    if let Some(s) = &*sink {
        s.set_speed(speed);
        Ok(())
    } else {
        Err(AppError::InvalidOperation("No active playback to set speed".to_string()))
    }
}
