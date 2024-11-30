use crate::error::AppError;
use serde::Deserialize;
use souvlaki::{MediaControls, MediaMetadata, MediaPlayback, PlatformConfig};
use std::sync::{Arc, Mutex, Once};
use tauri::Emitter;
use tauri::State;

type Result<T> = std::result::Result<T, AppError>;

pub struct MediaControlState {
    pub media_controls: Arc<Mutex<Option<MediaControls>>>,
    pub init_once: Once,
}

impl From<souvlaki::Error> for AppError {
    fn from(err: souvlaki::Error) -> Self {
        AppError::MediaControlsError(format!("{:?}", err))
    }
}

#[tauri::command]
pub async fn init_media_controls(
    app: tauri::AppHandle,
    window: tauri::Window,
    state: State<'_, MediaControlState>,
) -> Result<()> {
    state.init_once.call_once(|| {
        let handle = window.hwnd().unwrap();
        let hwnd_pointer = Some(handle.0 as _);
        let config = PlatformConfig {
            dbus_name: "cicadas",
            display_name: "Cicadas",
            hwnd: hwnd_pointer,
        };

        if let Ok(mut controls) = MediaControls::new(config) {
            if let Ok(()) = controls.attach(move |event| match event {
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
            }) {
                *state.media_controls.lock().unwrap() = Some(controls);
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn update_media_metadata(
    state: State<'_, MediaControlState>,
    metadata: MediaMetadataInput,
) -> Result<()> {
    if let Some(controls) = &mut *state.media_controls.lock().unwrap() {
        let mut media_metadata = MediaMetadata::default();
        media_metadata.title = Some(&metadata.title);
        media_metadata.artist = Some(&metadata.artist);
        media_metadata.album = Some(&metadata.album);
        media_metadata.cover_url = Some(&metadata.cover);

        controls.set_metadata(media_metadata)?;
    }
    Ok(())
}

#[tauri::command]
pub async fn update_playback_status(
    state: State<'_, MediaControlState>,
    is_playing: bool,
) -> Result<()> {
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

#[derive(Deserialize)]
pub struct MediaMetadataInput {
    title: String,
    artist: String,
    album: String,
    cover: String,
}
