use std::fmt;

#[derive(Debug)]
pub enum CommandError {
    // CommandNotAllowed,
    CommandFailed(String),
}

impl fmt::Display for CommandError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            // CommandError::CommandNotAllowed => write!(f, "Command not allowed"),
            CommandError::CommandFailed(stderr) => write!(f, "Nushell error: {}", stderr),
        }
    }
}

impl std::error::Error for CommandError {}

impl From<std::io::Error> for CommandError {
    fn from(err: std::io::Error) -> Self {
        CommandError::CommandFailed(err.to_string())
    }
}
