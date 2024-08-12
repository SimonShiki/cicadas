use std::path::Path;
use lofty::{file::{AudioFile, TaggedFileExt}, probe::Probe, tag::{Accessor, ItemKey}};
use walkdir::WalkDir;
use serde::{Serialize, Deserialize};
use base64::{Engine as _, engine::general_purpose};
use std::fs;

#[derive(Serialize, Deserialize)]
pub struct Song {
    id: String,
    name: String,
    artist: Option<String>,
    album: Option<String>,
    cover: Option<String>,
    lyrics: Option<String>,
    duration: Option<f64>,
    storage: String,
    mtime: u64,
    path: String,
}

#[tauri::command]
pub fn scan_folder(path: &str) -> Result<Vec<Song>, String> {
    let mut songs = Vec::new();

    for entry in WalkDir::new(path).follow_links(true).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            if let Some(song) = process_file(entry.path()) {
                songs.push(song);
            }
        }
    }

    Ok(songs)
}

fn process_file(path: &Path) -> Option<Song> {
    let allowed_formats = vec!["ogg", "wav", "flac", "mp3", "aiff", "aac"];
    
    if let Some(ext) = path.extension() {
        if !allowed_formats.contains(&ext.to_str().unwrap_or("").to_lowercase().as_str()) {
            return None;
        }
    } else {
        return None;
    }

    let tagged_file = match Probe::open(path).and_then(|pb| pb.read()) {
        Ok(tf) => tf,
        Err(_) => return None,
    };

    let tag = tagged_file.primary_tag().or_else(|| tagged_file.first_tag());

    let name = tag.and_then(|t| t.title().map(|s| s.to_string()))
        .unwrap_or_else(|| path.file_name().unwrap().to_string_lossy().into_owned());
    
    let artist = tag.and_then(|t| t.artist().map(|s| s.to_string()));
    let album = tag.and_then(|t| t.album().map(|s| s.to_string()));
    let lyrics = tag.and_then(|t| {
        t.get_string(&ItemKey::Lyrics).map(|s| s.to_string())
    });

    
    let cover = tag.and_then(|t| t.pictures().first()).map(|p| {
        let b64 = general_purpose::STANDARD.encode(&p.data());
        format!("data:{};base64,{}", p.mime_type().unwrap().as_str(), b64)
    });

    let duration = tagged_file.properties().duration().as_secs_f64() * 1000.0;
    
    let metadata = fs::metadata(path).ok()?;
    let mtime = metadata.modified().ok()?.duration_since(std::time::UNIX_EPOCH).ok()?.as_secs();

    Some(Song {
        id: format!("local-{name}-{album}-{artist}", album = album.clone().unwrap(), artist = artist.clone().unwrap()),
        name,
        artist,
        album,
        cover,
        duration: Some(duration),
        storage: "local".to_string(),
        mtime,
        lyrics,
        path: path.to_string_lossy().into_owned(),
    })
}

#[tauri::command]
pub fn get_song_buffer(path: &str) -> Result<Vec<u8>, String> {
    fs::read(path).map_err(|e| e.to_string())
}
