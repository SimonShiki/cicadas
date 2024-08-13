use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::State;

pub struct CacheManagerState(pub Arc<CacheManager>);

pub struct CacheManager {
    cache_dir: PathBuf,
    max_cache_size: u64,
    current_cache_size: Mutex<u64>,
    cache_items: Mutex<HashMap<u64, CacheItem>>,
}

struct CacheItem {
    id: u64,
    path: PathBuf,
    size: u64,
    last_accessed: std::time::SystemTime,
}

impl CacheManager {
    pub fn new(cache_dir: PathBuf, max_cache_size: u64) -> Self {
        let cm = CacheManager {
            cache_dir,
            max_cache_size,
            current_cache_size: Mutex::new(0),
            cache_items: Mutex::new(HashMap::new()),
        };
        cm.init();
        cm
    }

    fn init(&self) {
        if !self.cache_dir.exists() {
            fs::create_dir_all(&self.cache_dir).expect("Failed to create cache directory");
        }
        self.load_cache_info();
    }

    fn load_cache_info(&self) {
        let mut current_size = 0;
        let mut items = HashMap::new();

        if let Ok(entries) = fs::read_dir(&self.cache_dir) {
            for entry in entries.flatten() {
                if let Ok(metadata) = entry.metadata() {
                    if metadata.is_file() {
                        let id = entry
                            .file_name()
                            .to_str()
                            .and_then(|s| s.split('.').next())
                            .and_then(|s| s.parse::<u64>().ok())
                            .unwrap_or(0);

                        let item = CacheItem {
                            id,
                            path: entry.path(),
                            size: metadata.len(),
                            last_accessed: metadata.modified().unwrap_or_else(|_| std::time::SystemTime::now()),
                        };

                        current_size += item.size;
                        items.insert(id, item);
                    }
                }
            }
        }

        *self.current_cache_size.lock().unwrap() = current_size;
        *self.cache_items.lock().unwrap() = items;
    }

    pub fn get_cached_song(&self, id: u64) -> Option<Vec<u8>> {
        let mut items = self.cache_items.lock().unwrap();
        if let Some(item) = items.get_mut(&id) {
            item.last_accessed = std::time::SystemTime::now();
            fs::read(&item.path).ok()
        } else {
            None
        }
    }

    pub fn cache_song(&self, id: u64, data: &[u8]) -> Result<(), String> {
        let file_path = self.cache_dir.join(format!("{}.mp3", id));
        self.ensure_space_available(data.len() as u64)?;

        fs::write(&file_path, data).map_err(|e| e.to_string())?;

        let mut items = self.cache_items.lock().unwrap();
        let mut current_size = self.current_cache_size.lock().unwrap();

        items.insert(
            id,
            CacheItem {
                id,
                path: file_path,
                size: data.len() as u64,
                last_accessed: std::time::SystemTime::now(),
            },
        );
        *current_size += data.len() as u64;

        Ok(())
    }

    fn ensure_space_available(&self, required_space: u64) -> Result<(), String> {
        let mut current_size = self.current_cache_size.lock().unwrap();
        let mut items = self.cache_items.lock().unwrap();

        while *current_size + required_space > self.max_cache_size && !items.is_empty() {
            let oldest_id = items
                .iter()
                .min_by_key(|(_, item)| item.last_accessed)
                .map(|(id, _)| *id)
                .ok_or_else(|| "No items to remove".to_string())?;

            if let Some(item) = items.remove(&oldest_id) {
                fs::remove_file(&item.path).map_err(|e| e.to_string())?;
                *current_size -= item.size;
            }
        }

        Ok(())
    }
}

#[tauri::command]
pub fn get_cached_song(id: u64, state: State<CacheManagerState>) -> Option<Vec<u8>> {
    state.0.get_cached_song(id)
}

#[tauri::command]
pub fn cache_song(id: u64, data: Vec<u8>, state: State<CacheManagerState>) -> Result<(), String> {
    state.0.cache_song(id, &data)
}