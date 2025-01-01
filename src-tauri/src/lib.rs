mod audio;
mod cache_manager;
mod error;
mod local_scanner;
mod media_control;

use audio::AudioState;
use cache_manager::{CacheManager, CacheManagerState};
use media_control::MediaControlState;
use rodio::OutputStream;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Condvar, Mutex, Once};
use std::time::Duration;
use tauri::{image::Image, Emitter, Manager};
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
        seek_target: Arc::new(Mutex::new(None)),
        buffered_duration: Arc::new(Mutex::new(Duration::from_secs(0))),
        progress_tx: Arc::new(Mutex::new(None)),
    };
    let media_control_state = MediaControlState {
        media_controls: Arc::new(Mutex::new(None)),
        init_once: Once::new(),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app.get_webview_window("main")
                       .expect("no main window")
                       .set_focus();
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(audio_state)
        .manage(media_control_state)
        .setup(|app| {
            let cache_dir = app.path().app_cache_dir().unwrap();
            let cache_manager = Arc::new(CacheManager::new(cache_dir, 1024 * 1024 * 1024)); // 1GB cache limit
            app.manage(CacheManagerState(cache_manager));

            let show = MenuItemBuilder::with_id("show", "Show").build(app)?;
            let pause_resume =
                MenuItemBuilder::with_id("pause_resume", "Pause/Resume").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let menu = MenuBuilder::new(app)
                .items(&[&show, &pause_resume, &quit])
                .build()?;

            let _tray = TrayIconBuilder::new()
                .title("Cicadas")
                .tooltip("Cicadas")
                .icon(Image::from_path("./icons/32x32.png")?) // Set the icon using the resolved path
                .menu(&menu)
                .on_menu_event(move |app, event| match event.id().as_ref() {
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
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

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
            audio::play_url_stream,
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
            cache_manager::get_cache_size,
            cache_manager::clear_cache,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
