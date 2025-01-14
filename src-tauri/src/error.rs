use serde::Serialize;
use std::fmt::{Display, Formatter};
use tauri::Error as TauriError;
use reqwest::Error as ReqwestError;

#[derive(Debug, Serialize)]
pub enum AppError {
    FileNotFound(String),
    FileOpenError(String),
    DecodeError(String),
    InvalidOperation(String),
    SeekError(String),
    NetworkError(String),
    MediaControlsError(String),
    TauriError(String),  // Add this variant
}

impl std::error::Error for AppError {}

impl Display for AppError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::FileNotFound(path) => write!(f, "File not found: {}", path),
            AppError::FileOpenError(err) => write!(f, "Failed to open file: {}", err),
            AppError::DecodeError(err) => write!(f, "Failed to decode audio: {}", err),
            AppError::InvalidOperation(err) => write!(f, "Invalid operation: {}", err),
            AppError::SeekError(err) => write!(f, "Failed to seek: {}", err),
            AppError::NetworkError(err) => write!(f, "Network error: {}", err),
            AppError::MediaControlsError(err) => write!(f, "Media controls error: {}", err),
            AppError::TauriError(err) => write!(f, "Tauri error: {}", err),
        }
    }
}

// Add From implementation for TauriError
impl From<TauriError> for AppError {
    fn from(error: TauriError) -> Self {
        AppError::TauriError(error.to_string())
    }
}

// Add From implementation for ReqwestError
impl From<ReqwestError> for AppError {
    fn from(error: ReqwestError) -> Self {
        AppError::NetworkError(error.to_string())
    }
}
