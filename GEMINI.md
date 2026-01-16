# Project Overview

This project is a WebSocket server built with Rust and the Actix framework. It serves a simple web front-end that establishes a WebSocket connection to the server. The communication between the client and server is done using the MessagePack binary serialization format.

The server is designed to broadcast messages to all connected WebSocket clients. The front-end is a simple HTML page with JavaScript that connects to the WebSocket and logs the messages it receives.

## Building and Running

To build and run the project, you can use the following commands:

```bash
# Build the project
cargo build

# Run the project
cargo run
```

The server will start at `http://127.0.0.1:8080`.

## Development Conventions

The project follows standard Rust conventions. The source code is organized into modules for different functionalities:

*   `http`: Handles HTTP requests and routing.
*   `ws`: Manages WebSocket connections and communication.
*   `cmd`: a nu shell like cli for the web.

The web front-end is located in the `web` directory. It uses modern JavaScript with ES modules.
