use rodio::{Decoder, OutputStream, OutputStreamHandle, Sink, Source};
use std::fs::File;
use std::io::{BufReader, Read, Seek, SeekFrom};
use std::sync::{Arc, Mutex, Once};
use std::time::Duration;
use tauri::{Emitter, Manager, State};
use std::path::Path;
use serde::{Deserialize, Serialize};
use base64;
use thiserror::Error;
use std::sync::atomic::{AtomicBool, Ordering};
use souvlaki::{MediaControls, MediaMetadata, MediaPlayback, MediaPosition, PlatformConfig};

type Result<T> = std::result::Result<T, AppError>;

impl From<rodio::decoder::DecoderError> for AppError {
    fn from(error: rodio::decoder::DecoderError) -> Self {
        AppError::DecodeError(error.to_string())
    }
}

impl From<souvlaki::Error> for AppError {
    fn from(err: souvlaki::Error) -> Self {
        AppError::MediaControlsError(format!("{:?}", err))
    }
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

#[tauri::command]
async fn init_media_controls(app: tauri::AppHandle, state: State<'_, AudioState>) -> Result<()> {
    state.init_once.call_once(|| {
        let handle = app.get_window("main").unwrap().hwnd().unwrap();
        let hwnd_pointer = Some(handle.0 as _);
        let config = PlatformConfig {
            dbus_name: "cicadas",
            display_name: "Cicadas",
            hwnd: hwnd_pointer
        };

        if let Ok(mut controls) = MediaControls::new(config) {
            if let Ok(()) = controls.attach(move |event| {
                match event {
                    souvlaki::MediaControlEvent::Play => {
                        let _ = app.emit("media-control", "play");
                    }
                    souvlaki::MediaControlEvent::Pause => {
                        let _ = app.emit("media-control", "pause");
                    }
                    souvlaki::MediaControlEvent::Toggle => {
                        let _ = app.emit("media-control", "toggle");
                    }
                    souvlaki::MediaControlEvent::Next => {
                        let _ = app.emit("media-control", "next");
                    }
                    souvlaki::MediaControlEvent::Previous => {
                        let _ = app.emit("media-control", "previous");
                    }
                    _ => {}
                }
            }) {
                *state.media_controls.lock().unwrap() = Some(controls);
            }
        }
    });

    Ok(())
}

#[tauri::command]
async fn update_media_metadata(state: State<'_, AudioState>, metadata: MediaMetadataInput) -> Result<()> {
    if let Some(controls) = &mut *state.media_controls.lock().unwrap() {
        let mut media_metadata = MediaMetadata {
            title: Some(&metadata.title),
            artist: Some(&metadata.artist),
            album: Some(&metadata.album),
            cover_url: None,
            ..Default::default()
        };

        if let Some(cover_data_url) = &metadata.cover {
            if let Some(cover_data) = parse_data_url(cover_data_url)? {
                // Store the cover data in the AudioState
                *state.cover_data.lock().unwrap() = cover_data;
                // Use a placeholder URL that refers to the stored cover data
                media_metadata.cover_url = Some("memory://cover");
            }
        }

        controls.set_metadata(media_metadata)?;
    }
    Ok(())
}

fn parse_data_url(data_url: &str) -> Result<Option<Vec<u8>>> {
    if data_url.starts_with("data:image/") {
        let parts: Vec<&str> = data_url.split(',').collect();
        if parts.len() == 2 {
            let base64_data = parts[1];
            return Ok(Some(base64::decode(base64_data)
                .map_err(|e| AppError::InvalidDataUrl(e.to_string()))?));
        }
    }
    Ok(None)
}

#[tauri::command]
async fn set_playback_progress(state: State<'_, AudioState>, progress: f32) -> Result<()> {
    if let Some(controls) = &mut *state.media_controls.lock().unwrap() {
        let progress_duration = Duration::from_secs_f32(progress);
        let progress_position = MediaPosition(progress_duration);
        let new_status = MediaPlayback::Playing { progress: Some(progress_position) };
        controls.set_playback(new_status)?;
    }
    Ok(())
}

#[tauri::command]
async fn update_playback_status(state: State<'_, AudioState>, is_playing: bool) -> Result<()> {
    if let Some(controls) = &mut *state.media_controls.lock().unwrap() {
        let status = if is_playing {
            MediaPlayback::Playing { progress: None }
        } else {
            MediaPlayback::Paused { progress: None }
        };
        controls.set_playback(status)?;
    }
    Ok(())
}

struct AudioState {
    sink: Arc<Mutex<Option<Sink>>>,
    stream_handle: OutputStreamHandle,
    buffer: Arc<Mutex<Vec<u8>>>,
    is_stream_ended: Arc<AtomicBool>,
    media_controls: Arc<Mutex<Option<MediaControls>>>,
    init_once: Once,
    cover_data: Arc<Mutex<Vec<u8>>>,
}


#[derive(Deserialize)]
struct MediaMetadataInput {
    title: String,
    artist: String,
    album: String,
    cover: Option<String>, // Data URL for the cover image
}

static GLOBAL_INIT: Once = Once::new();

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

#[derive(Debug, Error, Serialize)]
enum AppError {
    #[error("File not found: {0}")]
    FileNotFound(String),
    #[error("Failed to open file: {0}")]
    FileOpenError(String),
    #[error("Failed to decode file: {0}")]
    DecodeError(String),
    #[error("Failed to create audio sink: {0}")]
    SinkCreationError(String),
    #[error("Invalid operation: {0}")]
    InvalidOperation(String),
    #[error("Failed to dispatch media control event: {0}")]
    MediaControlsError(String),
    #[error("Invalid data URL: {0}")]
    InvalidDataUrl(String),
}

#[tauri::command]
async fn add_stream_chunk(
    audio_state: State<'_, AudioState>,
    chunk: Vec<u8>,
) -> Result<()> {
    let mut buffer = audio_state.buffer.lock().unwrap();
    buffer.extend_from_slice(&chunk);
    Ok(())
}

#[tauri::command]
async fn play_local_file(audio_state: State<'_, AudioState>, file_path: String) -> Result<()> {
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
async fn start_streaming(audio_state: State<'_, AudioState>) -> Result<()> {
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
async fn end_stream(audio_state: State<'_, AudioState>) -> Result<()> {
    audio_state.is_stream_ended.store(true, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
async fn get_music_status(audio_state: State<'_, AudioState>) -> Result<String> {
    let sink = audio_state.sink.lock().unwrap();
    Ok(match &*sink {
        Some(s) if s.is_paused() => "Paused".to_string(),
        Some(_) => "Playing".to_string(),
        None => "Stopped".to_string(),
    })
}

#[tauri::command]
async fn pause(audio_state: State<'_, AudioState>) -> Result<()> {
    let sink = audio_state.sink.lock().unwrap();
    if let Some(s) = &*sink {
        s.pause();
        Ok(())
    } else {
        Err(AppError::InvalidOperation("No active playback to pause".to_string()))
    }
}

#[tauri::command]
async fn resume(audio_state: State<'_, AudioState>) -> Result<()> {
    let sink = audio_state.sink.lock().unwrap();
    if let Some(s) = &*sink {
        s.play();
        Ok(())
    } else {
        Err(AppError::InvalidOperation("No active playback to play".to_string()))
    }
}

#[tauri::command]
async fn set_volume(audio_state: State<'_, AudioState>, volume: f32) -> Result<()> {
    let sink = audio_state.sink.lock().unwrap();
    if let Some(s) = &*sink {
        s.set_volume(volume);
        Ok(())
    } else {
        Err(AppError::InvalidOperation("No active playback to set volume".to_string()))
    }
}

#[tauri::command]
async fn set_speed(audio_state: State<'_, AudioState>, speed: f32) -> Result<()> {
    let sink = audio_state.sink.lock().unwrap();
    if let Some(s) = &*sink {
        s.set_speed(speed);
        Ok(())
    } else {
        Err(AppError::InvalidOperation("No active playback to set speed".to_string()))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
#[tokio::main]
pub async fn run() {
    let (_stream, stream_handle) = OutputStream::try_default().unwrap();
    let audio_state = AudioState {
        sink: Arc::new(Mutex::new(None)),
        stream_handle,
        buffer: Arc::new(Mutex::new(Vec::new())),
        is_stream_ended: Arc::new(AtomicBool::new(false)),
        media_controls: Arc::new(Mutex::new(None)),
        init_once: Once::new(),
        cover_data: Arc::new(Mutex::new(Vec::new())),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(audio_state)
        .invoke_handler(tauri::generate_handler![
            play_local_file,
            start_streaming,
            add_stream_chunk,
            end_stream,
            get_music_status,
            pause,
            resume,
            set_volume,
            set_speed,
            init_media_controls,
            update_media_metadata,
            update_playback_status,
            set_playback_progress
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
