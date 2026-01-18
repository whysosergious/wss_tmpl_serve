// web/src/terminal/ws_connection.js
import { encode, decode, decodeMulti } from "/src/lib.js";

function setupWebSocket(url, terminalInstance, onMessageCallback) {
  const ws = new WebSocket(url);

  ws.onopen = () => {
    terminalInstance.println("WebSocket connected.");
  };

  ws.onmessage = async (event) => {
    let arrayBuffer;

    if (event.data instanceof Blob) {
      arrayBuffer = await event.data.arrayBuffer();
    } else if (event.data instanceof ArrayBuffer) {
      arrayBuffer = event.data;
    } else {
      console.error(
        "Unknown message data type for MessagePack:",
        typeof event.data,
        event.data,
      );
      terminalInstance.println(
        `Received non-binary data from server: ${event.data}`,
        "red",
      );
      return;
    }

    try {
      // Use decodeMulti to handle potentially multiple messages in one frame
      const unpackedMessages = decodeMulti(new Uint8Array(arrayBuffer));
      for (const unpacked of unpackedMessages) {
        console.log(unpacked); // Keep this for debugging to see the full unpacked object
        if (unpacked && unpacked.body !== undefined) {
          onMessageCallback(unpacked.body);
        } else {
          console.warn(
            "Received MessagePack object without a 'body' field:",
            unpacked,
          );
          terminalInstance.println(
            `Received malformed message: ${JSON.stringify(unpacked)}`,
            "yellow",
          );
        }
      }
    } catch (e) {
      console.error("MessagePack decode (streaming) error:", e);
      // Log the raw data that caused the error for debugging
      console.error(
        "Raw data causing MessagePack error (first 100 bytes):",
        new Uint8Array(arrayBuffer.slice(0, 100)),
      );
      // Convert to hex for easier inspection
      const hexString = Array.from(new Uint8Array(arrayBuffer.slice(0, 100)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");
      console.error("Raw data (hex):", hexString);
      terminalInstance.println(`MessagePack decode error: ${e.message}`, "red");
    }
  };

  ws.onclose = () => {
    terminalInstance.println(
      "WebSocket disconnected. Attempting to reconnect...",
      "orange",
    );
    setTimeout(
      () => setupWebSocket(url, terminalInstance, onMessageCallback),
      3000,
    );
  };

  ws.onerror = (error) => {
    terminalInstance.println(`WebSocket error: ${error.message}`, "red");
    ws.close();
  };
  return ws;
}

export function connectAndProvideSend(url, terminalInstance) {
  let wsInstance = null;

  const onMessage = (message) => {
    terminalInstance.println(message);
  };

  wsInstance = setupWebSocket(url, terminalInstance, onMessage);

  const sendFunction = (command) => {
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
      const clientMessage = {
        type: "cmd",
        body: command,
      };
      wsInstance.send(encode(clientMessage)); // NEW ENCODE
    } else {
      terminalInstance.println(
        "WebSocket not open. Command not sent.",
        "#ff0000",
      );
    }
  };

  return sendFunction;
}
