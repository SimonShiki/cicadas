mod audio;
mod media_control;
mod error;
mod local_scanner;

use audio::AudioState;
use media_control::MediaControlState;
use rodio::OutputStream;
use std::sync::{Arc, Condvar, Mutex, Once};
use tauri::{Emitter, Manager};
use std::sync::atomic::AtomicBool;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
#[tokio::main]
pub async fn run() {
    let (_stream, stream_handle) = OutputStream::try_default().unwrap();
    let audio_state = AudioState {
        sink: Arc::new(Mutex::new(None)),
        stream_handle,
        buffer: Arc::new(Mutex::new(Vec::new())),
        is_stream_ended: Arc::new(AtomicBool::new(false)),
        decoder: Arc::new(Mutex::new(None)),
        data_available: Arc::new((Mutex::new(false), Condvar::new())),
    };
    let media_control_state = MediaControlState {
        media_controls: Arc::new(Mutex::new(None)),
        init_once: Once::new(),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(audio_state)
        .manage(media_control_state)
        .setup(|app| {
            let show = MenuItemBuilder::with_id("show", "Show").build(app)?;
            let pause_resume = MenuItemBuilder::with_id("pause_resume", "Pause/Resume").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let menu = MenuBuilder::new(app).items(&[&show, &pause_resume, &quit]).build()?;
            
            let tray = TrayIconBuilder::new()
                .menu(&menu)
                .on_menu_event(move |app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "pause_resume" => {
                            let _ = app.emit("media-control", "toggle");
                        }
                        "quit" => {
                            std::process::exit(0);
                        }
                        _ => (),
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            tray.set_title(Some("Cicadas"))?;
            tray.set_tooltip(Some("Cicadas"))?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            audio::play_local_file,
            audio::start_streaming,
            audio::add_stream_chunk,
            audio::end_stream,
            audio::get_music_status,
            audio::pause,
            audio::resume,
            audio::set_volume,
            audio::get_volume,
            audio::set_speed,
            audio::set_playback_progress,
            audio::get_playback_progress,
            media_control::init_media_controls,
            media_control::update_media_metadata,
            media_control::update_playback_status,
            local_scanner::get_song_buffer,
            local_scanner::scan_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
