# Project Overview

This project is a web-based interactive development environment (IDE) or a similar tool, leveraging a Rust backend and a vanilla JavaScript frontend.

**Backend:**
*   **Language:** Rust
*   **Frameworks:** Actix (web framework), Tokio (asynchronous runtime)
*   **Communication:** HTTP and Websockets
*   **Command Execution:** Integrates with Nushell for command execution.

**Frontend:**
*   **Language:** Vanilla JavaScript
*   **Architecture:** Utilizes Web Components for UI.
*   **Editor:** Implements CodeMirror 6 for code editing capabilities.
*   **Features:** Currently includes a partially implemented "tabs" feature for the editor.

# Building and Running

## Compiling the Rust Backend

To check if the Rust backend compiles successfully:

```bash
cargo check
```

## Running the Project

**TODO:** Add instructions for running the full project (backend and frontend). This typically involves starting the Rust server and serving the static frontend files.

# Development Conventions

*   **CodeMirror 6:** The source code for CodeMirror 6 is located in `web/src/editor/pme/`. When analyzing or modifying the project, avoid deep dives into this directory as it contains third-party library code.
*   **Tabs Feature:** The editor includes a partially implemented tabs feature. Further development may involve completing this functionality.
*   **Frontend Typing:** Use JSDoc for type annotations on the frontend, adding them where missing as work progresses.
