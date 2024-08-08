use rodio::{Decoder, OutputStreamHandle, Sink, Source};
use std::fs::File;
use std::io::{BufReader, Read, Seek, SeekFrom};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use crate::error::AppError;
use tauri::State;

type Result<T> = std::result::Result<T, AppError>;


pub struct AudioState {
    pub sink: Arc<Mutex<Option<Sink>>>,
    pub stream_handle: OutputStreamHandle,
    pub buffer: Arc<Mutex<Vec<u8>>>,
    pub is_stream_ended: Arc<AtomicBool>,
}

struct StreamingSource {
    buffer: Arc<Mutex<Vec<u8>>>,
    is_stream_ended: Arc<AtomicBool>,
    position: usize,
}

impl StreamingSource {
    fn new(buffer: Arc<Mutex<Vec<u8>>>, is_stream_ended: Arc<AtomicBool>) -> Self {
        StreamingSource {
            buffer,
            is_stream_ended,
            position: 0,
        }
    }
}

impl Read for StreamingSource {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        let mut buffer = self.buffer.lock().unwrap();
        let mut read_count = 0;

        while read_count < buf.len() {
            if self.position < buffer.len() {
                let remaining = buffer.len() - self.position;
                let to_read = std::cmp::min(remaining, buf.len() - read_count);
                buf[read_count..read_count + to_read].copy_from_slice(&buffer[self.position..self.position + to_read]);
                read_count += to_read;
                self.position += to_read;
            } else if self.is_stream_ended.load(Ordering::Relaxed) {
                break;
            } else {
                // Release the lock and wait for more data
                drop(buffer);
                std::thread::sleep(std::time::Duration::from_millis(10));
                buffer = self.buffer.lock().unwrap();
            }
        }

        Ok(read_count)
    }
}

impl Seek for StreamingSource {
    fn seek(&mut self, pos: SeekFrom) -> std::io::Result<u64> {
        let buffer = self.buffer.lock().unwrap();
        let new_pos = match pos {
            SeekFrom::Start(offset) => offset as i64,
            SeekFrom::End(offset) => buffer.len() as i64 + offset,
            SeekFrom::Current(offset) => self.position as i64 + offset,
        };

        if new_pos < 0 || new_pos > buffer.len() as i64 {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "Invalid seek position",
            ));
        }

        self.position = new_pos as usize;
        Ok(self.position as u64)
    }
}

impl From<rodio::decoder::DecoderError> for AppError {
    fn from(error: rodio::decoder::DecoderError) -> Self {
        AppError::DecodeError(error.to_string())
    }
}

struct StreamingDecoder(Decoder<StreamingSource>);

impl StreamingDecoder {
    fn new(streaming_source: StreamingSource) -> Result<Self> {
        Ok(StreamingDecoder(Decoder::new(streaming_source)?))
    }
}

impl Iterator for StreamingDecoder {
    type Item = i16;

    fn next(&mut self) -> Option<Self::Item> {
        self.0.next()
    }
}

impl Source for StreamingDecoder {
    fn current_frame_len(&self) -> Option<usize> {
        self.0.current_frame_len()
    }

    fn channels(&self) -> u16 {
        self.0.channels()
    }

    fn sample_rate(&self) -> u32 {
        self.0.sample_rate()
    }

    fn total_duration(&self) -> Option<Duration> {
        self.0.total_duration()
    }
}

#[tauri::command]
pub async fn add_stream_chunk(
    audio_state: State<'_, AudioState>,
    chunk: Vec<u8>,
) -> Result<()> {
    let mut buffer = audio_state.buffer.lock().unwrap();
    buffer.extend_from_slice(&chunk);
    Ok(())
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
pub async fn start_streaming(audio_state: State<'_, AudioState>) -> Result<()> {
    let buffer = audio_state.buffer.clone();
    let is_stream_ended = audio_state.is_stream_ended.clone();

    let streaming_source = StreamingSource::new(buffer, is_stream_ended);
    let source = StreamingDecoder::new(streaming_source)
        .map_err(|e| AppError::DecodeError(e.to_string()))?;

    let sink = Sink::try_new(&audio_state.stream_handle)
        .map_err(|e| AppError::SinkCreationError(e.to_string()))?;
    sink.append(source);

    *audio_state.sink.lock().unwrap() = Some(sink);
    Ok(())
}

#[tauri::command]
pub async fn end_stream(audio_state: State<'_, AudioState>) -> Result<()> {
    audio_state.is_stream_ended.store(true, Ordering::Relaxed);
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
    let sink = audio_state.sink.lock().unwrap();
    
    if let Some(s) = &*sink {
        s.try_seek(Duration::from_secs_f32(progress))
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
