// web/src/net/ws.js
import { gen_hash } from "../lib.js";
import { encode, decodeMulti } from "/src/lib.js";
import sh from "/src/sh.js";

/**
 * WebSocket service for communication with the backend.
 * @namespace
 */
const ws = {
  /** @type {WebSocket | null} */
  instance: null,
  /** @type {PromiseWithResolvers<void>} */
  ready: Promise.withResolvers(),
  /** @type {WssTerminal | null} */
  terminalInstance: null,

  /**
   * Establishes a WebSocket connection.
   * @param {string} url - The WebSocket URL to connect to.
   * @param {WssTerminal} terminalInstance - The terminal instance for logging.
   */
  connect: function (url, terminalInstance) {
    this.terminalInstance = terminalInstance;
    this.ready = Promise.withResolvers();
    this.instance = new WebSocket(url);

    this.instance.onopen = () => {
      terminalInstance.println("WebSocket connected.");
      this.ready.resolve();
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
          } else if (unpacked.type === "hmr::reload") {
            terminalInstance.println(
              `NOTIFY: reload - ${unpacked.body}`,
              "cyan",
            );
            document.dispatchEvent(
              new CustomEvent("wss-reload", { detail: unpacked.body }),
            );
          } else if (unpacked.type === "hmr::css_update") {
            terminalInstance.println(
              `NOTIFY: css_update - ${unpacked.body}`,
              "cyan",
            );
            document.dispatchEvent(
              new CustomEvent("wss-css-update", { detail: unpacked.body }),
            );
          } else if (unpacked.type === "hmr::js_update") {
            terminalInstance.println(
              `NOTIFY: js_update - ${unpacked.body}`,
              "cyan",
            );
            document.dispatchEvent(
              new CustomEvent("wss-js-update", { detail: unpacked.body }),
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
      this.ready = Promise.withResolvers();
      terminalInstance.println(
        "WebSocket disconnected. Attempting to reconnect...",
        "orange",
      );
      setTimeout(() => this.connect(url, terminalInstance), 3000);
    };

    this.instance.onerror = (error) => {
      terminalInstance.println(`WebSocket error: ${error.message}`, "red");
      this.ready.reject(error);
      this.instance.close();
    };
  },

  /** @type {Map<string, PromiseWithResolvers<any>>} */
  pending: new Map(),

  /**
   * Sends a message over the WebSocket connection.
   * @param {object} message - The message object to send.
   * @returns {Promise<any>} A promise that resolves with the server's response.
   */
  send: async function (message) {
    this.terminalInstance.println("> " + message.body);
    await this.ready.promise;
    message.msg_id = gen_hash();

    const pending = Promise.withResolvers();
    this.pending.set(message.msg_id, pending);

    this.instance?.send(encode(message));

    return pending.promise;
  },
};

sh.ws = ws;
