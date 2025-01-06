use crate::error::AppError;
use lofty::file::AudioFile;
use lofty::probe::Probe;
use rodio::{Decoder, Sink, Source, mixer::Mixer};
use std::fs::File;
use std::io::{BufReader, Cursor, Read, Seek, SeekFrom};
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Condvar, Mutex};
use std::time::Duration;
use tauri::{Runtime, State, Emitter};
use reqwest;
use futures_util::StreamExt;
use tokio::sync::mpsc;

#[derive(Clone, serde::Serialize)]
#[serde(tag = "type", content = "data")]
pub enum PlaybackEvent {
    BufferUpdate { buffer_progress: f32 },
    BufferSeekReady,
    UpdateProgress { progress: f32 },
}

pub struct AudioState {
    pub sink: Arc<Mutex<Option<Sink>>>,
    pub stream: Arc<Mixer<f32>>,
    pub buffer: Arc<Mutex<Vec<u8>>>,
    pub is_stream_ended: Arc<AtomicBool>,
    pub decoder: Arc<Mutex<Option<Decoder<Cursor<Vec<u8>>>>>>,
    pub data_available: Arc<(Mutex<bool>, Condvar)>,
    pub seek_target: Arc<Mutex<Option<Duration>>>,
    pub buffered_duration: Arc<Mutex<Duration>>,
    pub progress_tx: Arc<Mutex<Option<mpsc::Sender<PlaybackEvent>>>>,
}

struct StreamingSource {
    buffer: Arc<Mutex<Vec<u8>>>,
    is_stream_ended: Arc<AtomicBool>,
    decoder: Arc<Mutex<Option<Decoder<Cursor<Vec<u8>>>>>>,
    position: usize,
    data_available: Arc<(Mutex<bool>, Condvar)>,
    sample_rate: u32,
    channels: u16,
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
            sample_rate: 44100,
            channels: 2,
        }
    }

    fn reset(&mut self) {
        self.position = 0;
        *self.decoder.lock().unwrap() = None;
    }

    fn try_seek(&mut self, pos: Duration) -> std::result::Result<(), rodio::source::SeekError> {
        let buffer = self.buffer.lock().unwrap();
        
        // Create a temporary decoder to get accurate audio parameters
        if let Ok(temp_decoder) = Decoder::new(Cursor::new(buffer.clone())) {
            self.sample_rate = temp_decoder.sample_rate();
            self.channels = temp_decoder.channels();
            
            // Calculate bytes per second (2 bytes per sample)
            let bytes_per_second = self.sample_rate as f64 * self.channels as f64 * 2.0;
            let target_position = (pos.as_secs_f64() * bytes_per_second / 7.34) as usize;
            
            if target_position >= buffer.len() {
                return Err(rodio::source::SeekError::NotSupported {
                    underlying_source: "position beyond buffer",
                });
            }

            // Ensure position aligns with frame boundaries
            let frame_size = self.channels as usize * 2;
            self.position = target_position - (target_position % frame_size);
            
            // Create new decoder starting from target position
            if let Ok(new_decoder) = Decoder::new(Cursor::new(buffer[self.position..].to_vec())) {
                let mut decoder = self.decoder.lock().unwrap();
                *decoder = Some(new_decoder);
                return Ok(());
            }
        }
        
        Err(rodio::source::SeekError::NotSupported {
            underlying_source: "decoder creation failed",
        })
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
                if let Ok(new_decoder) = Decoder::new(Cursor::new(new_buffer)) {
                    self.sample_rate = new_decoder.sample_rate();
                    self.channels = new_decoder.channels();
                    *decoder = Some(new_decoder);
                }
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
    fn current_span_len(&self) -> Option<usize> {
        self.decoder
            .lock()
            .unwrap()
            .as_ref()
            .and_then(|d| d.current_span_len())
    }

    fn channels(&self) -> u16 {
        self.channels
    }

    fn sample_rate(&self) -> u32 {
        self.sample_rate
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

fn spawn_progress_task<R: Runtime>(
    sink_ref: Arc<Mutex<Option<Sink>>>,
    tx: mpsc::Sender<PlaybackEvent>,
    _app: tauri::AppHandle<R>,
) {
    tokio::spawn(async move {
        loop {
            let progress = {
                let guard = sink_ref.lock().unwrap();
                if let Some(sink) = guard.as_ref() {
                    if !sink.is_paused() {
                        Some(sink.get_pos().as_secs_f32())
                    } else {
                        None
                    }
                } else {
                    break;
                }
            };  // guard is dropped here

            if let Some(progress) = progress {
                let _ = tx.send(PlaybackEvent::UpdateProgress { progress }).await;
            }

            tokio::time::sleep(Duration::from_millis(100)).await;
        }
    });
}

#[tauri::command]
pub async fn play_url_stream<R: Runtime>(
    app: tauri::AppHandle<R>,
    state: State<'_, AudioState>, 
    url: String
) -> std::result::Result<(), AppError> {
    // Stop and clean up previous playback instance
    {
        let sink = {
            let mut sink_guard = state.sink.lock().unwrap();
            sink_guard.take()
        };
        
        if let Some(sink) = sink {
            sink.stop();
            // Wait briefly to ensure resource release
            tokio::time::sleep(Duration::from_millis(100)).await;
        }
    }

    // Clear buffer and reset state
    {
        let mut buffer = state.buffer.lock().unwrap();
        buffer.clear();
        state.is_stream_ended.store(false, Ordering::Relaxed);
        *state.decoder.lock().unwrap() = None;
        *state.seek_target.lock().unwrap() = None;
        *state.buffered_duration.lock().unwrap() = Duration::from_secs(0);
    }

    let client = reqwest::Client::new();
    
    let content_length = client.get(&url)
        .send()
        .await?
        .content_length()
        .unwrap_or(0);

    tokio::spawn({
        let client = reqwest::Client::new();
        let url = url.clone();
        let app = app.clone();
        
        async move {
            if let Ok(response) = client.get(&url)
                .header("Range", "bytes=0-65535")
                .send()
                .await
            {
                if let Ok(chunk) = response.bytes().await {
                    let cursor = std::io::Cursor::new(chunk);
                    
                    if let Ok(probe) = Probe::new(cursor).guess_file_type() {
                        if let Ok(tagged_file) = probe.read() {
                            let duration = if content_length > 0 {
                                let chunk_duration = tagged_file.properties().duration().as_secs_f64();
                                
                                chunk_duration * 1000.0
                            } else {
                                0.0
                            };
                            
                            let _ = app.emit("update_duration", duration);
                        }
                    }
                }
            }
        }
    });

    // Create a new request for streaming
    let response = client.get(&url).send().await?;
    
    // Create event channel
    let (tx, mut rx) = mpsc::channel(32);
    let app_handle = app.clone();
    
    // Store sender for progress updates
    *state.progress_tx.lock().unwrap() = Some(tx.clone());
    
    // Spawn event handler
    tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            let _ = app_handle.emit("playback_event", event);
        }
    });

    // Start progress update task using the new helper function
    spawn_progress_task(state.sink.clone(), tx.clone(), app.clone());

    // Take ownership of necessary state
    let buffer = state.buffer.clone();
    let is_stream_ended = state.is_stream_ended.clone();
    let data_available = state.data_available.clone();
    let seek_target = state.seek_target.clone();
    let buffered_duration = state.buffered_duration.clone();
    let tx_clone = tx.clone();

    // Initialize sink and source
    let mut sink_guard = state.sink.lock().unwrap();
    if let Some(sink) = sink_guard.take() {
        sink.stop();
    }

    {
        let mut buffer = buffer.lock().unwrap();
        buffer.clear();
        is_stream_ended.store(false, Ordering::Relaxed);
    }
    *state.decoder.lock().unwrap() = None;

    let sink = Sink::connect_new(&state.stream);
    let streaming_source = StreamingSource::new(
        buffer.clone(),
        is_stream_ended.clone(),
        state.decoder.clone(),
        data_available.clone(),
    );
    sink.append(streaming_source);
    
    // Spawn streaming task
    let _stream_handle = tokio::spawn(async move {
        let mut bytes_stream = response.bytes_stream();
        let mut current_size = 0;

        while let Some(chunk) = bytes_stream.next().await {
            if let Ok(data) = chunk {
                current_size += data.len();

                // Update buffer in separate scope
                {
                    let mut buffer = buffer.lock().unwrap();
                    buffer.extend_from_slice(&data);
                }

                // Send buffer progress
                if content_length > 0 {
                    let progress = current_size as f32 / content_length as f32;
                    let _ = tx_clone.send(PlaybackEvent::BufferUpdate { buffer_progress: progress }).await;
                }

                // Check seek target in separate scope
                let should_send_ready = {
                    if let Some(target) = *seek_target.lock().unwrap() {
                        let buffered = *buffered_duration.lock().unwrap();
                        buffered >= target
                    } else {
                        false
                    }
                };

                if should_send_ready {
                    let _ = tx_clone.send(PlaybackEvent::BufferSeekReady).await;
                    *seek_target.lock().unwrap() = None;
                }

                // Signal new data in separate scope
                {
                    let (lock, cvar) = &*data_available;
                    let mut available = lock.lock().unwrap();
                    *available = true;
                    cvar.notify_one();
                }
            }
        }
        is_stream_ended.store(true, Ordering::Relaxed);
    });

    // Start playback
    sink.play();
    *sink_guard = Some(sink);

    Ok(())
}

#[tauri::command]
pub async fn play_local_file<R: Runtime>(
    app: tauri::AppHandle<R>,
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

    let sink = Sink::connect_new(&state.stream);
    sink.append(source);

    // Create new event sender if needed
    let mut tx_guard = state.progress_tx.lock().unwrap();
    if tx_guard.is_none() {
        let (tx, mut rx) = mpsc::channel(32);
        *tx_guard = Some(tx.clone());

        // Spawn event handler
        let app_handle = app.clone();
        tokio::spawn(async move {
            while let Some(event) = rx.recv().await {
                let _ = app_handle.emit("playback_event", event);
            }
        });

        // Start progress update task using the helper function
        spawn_progress_task(state.sink.clone(), tx.clone(), app.clone());
    }

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
pub fn set_playback_progress(
    _app: tauri::AppHandle<impl Runtime>,
    state: State<AudioState>, 
    progress: f32
) -> std::result::Result<(), AppError> {
    let mut sink = state.sink.lock().unwrap();
    let duration = Duration::from_secs_f32(progress);

    if let Some(s) = sink.as_mut() {
        match s.try_seek(duration) {
            Ok(_) => Ok(()),
            Err(rodio::source::SeekError::NotSupported { .. }) => {
                *state.seek_target.lock().unwrap() = Some(duration);
                s.pause();
                Ok(())
            },
            Err(e) => Err(AppError::SeekError(e.to_string()))
        }
    } else {
        Err(AppError::InvalidOperation("No active playback to set progress".to_string()))
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
