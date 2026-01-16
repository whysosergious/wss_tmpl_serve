use tokio::process::Command;

use super::error::CommandError;

/// spawn a process to execute shell command
pub async fn execute_command(command: &str) -> Result<String, CommandError> {
    // TODO: binary input/uotput
    // TODO: look into keepalive for e.g. sqeel operations

    // let allowed_commands = vec!["ls -a", "ps"];
    // if !allowed_commands.contains(&command) {
    //     return Err(CommandError::CommandNotAllowed);
    // }

    let output = Command::new("nu").arg("-c").arg(command).output().await?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(CommandError::CommandFailed(
            String::from_utf8_lossy(&output.stderr).to_string(),
        ))
    }
}
