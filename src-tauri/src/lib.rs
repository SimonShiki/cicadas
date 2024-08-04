use rodio::{Decoder, OutputStream, OutputStreamHandle, Sink, Source};
use std::collections::VecDeque;
use std::io::{Read, Seek, SeekFrom};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::State;

struct AudioState {
    sink: Arc<Mutex<Option<Sink>>>,
    stream_handle: OutputStreamHandle,
    buffer: Arc<Mutex<VecDeque<u8>>>,
    is_stream_ended: Arc<Mutex<bool>>,
}

struct StreamingSource {
    buffer: Arc<Mutex<VecDeque<u8>>>,
    is_stream_ended: Arc<Mutex<bool>>,
    position: usize,
}

impl StreamingSource {
    fn new(buffer: Arc<Mutex<VecDeque<u8>>>, is_stream_ended: Arc<Mutex<bool>>) -> Self {
        StreamingSource {
            buffer,
            is_stream_ended,
            position: 0,
        }
    }
}

impl Read for StreamingSource {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        let buffer = self.buffer.lock().unwrap();
        let mut read_count = 0;

        while read_count < buf.len() {
            if let Some(byte) = buffer.get(self.position) {
                buf[read_count] = *byte;
                read_count += 1;
                self.position += 1;
            } else if *self.is_stream_ended.lock().unwrap() && self.position >= buffer.len() {
                break;
            } else {
                std::thread::sleep(std::time::Duration::from_millis(10));
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

// Wrapper type for Decoder<StreamingSource>
struct StreamingDecoder(Decoder<StreamingSource>);

impl StreamingDecoder {
    fn new(streaming_source: StreamingSource) -> Result<Self, rodio::decoder::DecoderError> {
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
async fn start_streaming(audio_state: State<'_, AudioState>) -> Result<(), String> {
    let buffer = audio_state.buffer.clone();
    let is_stream_ended = audio_state.is_stream_ended.clone();

    let streaming_source = StreamingSource::new(buffer, is_stream_ended);
    let source = StreamingDecoder::new(streaming_source).map_err(|e| e.to_string())?;

    let sink = Sink::try_new(&audio_state.stream_handle).map_err(|e| e.to_string())?;
    sink.append(source);

    *audio_state.sink.lock().unwrap() = Some(sink);
    Ok(())
}

#[tauri::command]
async fn add_stream_chunk(
    audio_state: State<'_, AudioState>,
    chunk: Vec<u8>,
) -> Result<(), String> {
    let mut buffer = audio_state.buffer.lock().unwrap();
    buffer.extend(chunk);
    Ok(())
}

#[tauri::command]
async fn end_stream(audio_state: State<'_, AudioState>) -> Result<(), String> {
    let mut is_stream_ended = audio_state.is_stream_ended.lock().unwrap();
    *is_stream_ended = true;
    Ok(())
}

#[tauri::command]
async fn get_music_status(audio_state: State<'_, AudioState>) -> Result<String, String> {
    let sink = audio_state.sink.lock().unwrap();
    match &*sink {
        Some(s) if s.is_paused() => Ok("Paused".to_string()),
        Some(_) => Ok("Playing".to_string()),
        None => Ok("Stopped".to_string()),
    }
}

#[tauri::command]
async fn pause_resume(audio_state: State<'_, AudioState>) -> Result<(), String> {
    let sink = audio_state.sink.lock().unwrap();
    if let Some(s) = &*sink {
        if s.is_paused() {
            s.play();
        } else {
            s.pause();
        }
    }
    Ok(())
}

#[tauri::command]
async fn set_volume(audio_state: State<'_, AudioState>, volume: f32) -> Result<(), String> {
    let sink = audio_state.sink.lock().unwrap();
    if let Some(s) = &*sink {
        s.set_volume(volume);
    }
    Ok(())
}

#[tauri::command]
async fn set_speed(audio_state: State<'_, AudioState>, speed: f32) -> Result<(), String> {
    let sink = audio_state.sink.lock().unwrap();
    if let Some(s) = &*sink {
        s.set_speed(speed);
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let (_stream, stream_handle) = OutputStream::try_default().unwrap();
    let audio_state = AudioState {
        sink: Arc::new(Mutex::new(None)),
        stream_handle,
        buffer: Arc::new(Mutex::new(VecDeque::new())),
        is_stream_ended: Arc::new(Mutex::new(false)),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(audio_state)
        .invoke_handler(tauri::generate_handler![
            start_streaming,
            add_stream_chunk,
            end_stream,
            get_music_status,
            pause_resume,
            set_volume,
            set_speed
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
