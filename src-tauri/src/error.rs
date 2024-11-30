use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
pub(crate) enum AppError {
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
    #[error("Failed to seek source: {0}")]
    SeekError(String),
}
