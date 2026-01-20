// web/src/net/ws.js
import { gen_hash } from "../lib.js";
import { encode, decodeMulti } from "/src/lib.js";
import sh from "/src/sh.js";

const ws = {
  instance: null,
  connect: function (url, terminalInstance) {
    this.instance = new WebSocket(url);

    this.instance.onopen = () => {
      terminalInstance.println("WebSocket connected.");
    };

    this.instance.onmessage = async (event) => {
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
        const unpackedMessages = decodeMulti(new Uint8Array(arrayBuffer));
        for (const unpacked of unpackedMessages) {
          this.pending.get(unpacked.msg_id)?.resolve(unpacked);
          this.pending.delete(unpacked.msg_id);

          if (unpacked && unpacked.type === "cmd_result") {
            terminalInstance.println(unpacked.body);
          } else if (
            unpacked &&
            unpacked.type === "broadcast" &&
            unpacked.id !== this.id
          ) {
            terminalInstance.println(
              `BROADCAST [from:${unpacked.id}, msg_id:${unpacked.msg_id}]: ${unpacked.body}`,
              "cyan",
            );
          } else {
            console.warn(
              "Received MessagePack object with unhandled type or missing body:",
              unpacked,
            );
            terminalInstance.println(
              `Received malformed or unhandled message: ${JSON.stringify(unpacked)}`,
              "yellow",
            );
          }
        }
      } catch (e) {
        console.error("MessagePack decode (streaming) error:", e);
        console.error(
          "Raw data causing MessagePack error (first 100 bytes):",
          new Uint8Array(arrayBuffer.slice(0, 100)),
        );
        const hexString = Array.from(new Uint8Array(arrayBuffer.slice(0, 100)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ");
        console.error("Raw data (hex):", hexString);
        terminalInstance.println(
          `MessagePack decode error: ${e.message}`,
          "red",
        );
      }
    };

    this.instance.onclose = () => {
      terminalInstance.println(
        "WebSocket disconnected. Attempting to reconnect...",
        "orange",
      );
      setTimeout(() => this.connect(url, terminalInstance), 3000);
    };

    this.instance.onerror = (error) => {
      terminalInstance.println(`WebSocket error: ${error.message}`, "red");
      this.instance.close();
    };
  },
  pending: new Map(),
  send: function (message) {
    message.msg_id = gen_hash();

    const pending = Promise.withResolvers();
    this.pending.set(message.msg_id, pending);

    this.instance?.send(encode(message));

    return pending.promise;
  },
};

sh.ws = ws;
