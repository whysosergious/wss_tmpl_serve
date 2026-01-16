import msgpack from "https://cdn.jsdelivr.net/npm/msgpack-js@0.3.0/+esm";
globalThis.msgpack = msgpack;

// dev
globalThis.sh = {};

function connectWebsocket(url = "/ws/") {
  const ws = new WebSocket(url);
  ws.onmessage = async (event) => {
    const output = document.getElementById("output");
    let arrayBuffer;

    if (event.data instanceof Blob) {
      arrayBuffer = await event.data.arrayBuffer();
    } else if (event.data instanceof ArrayBuffer) {
      arrayBuffer = event.data;
    } else {
      // Handle other types if necessary, though WebSockets usually send Blob or ArrayBuffer for binary
      console.error("Unknown message data type:", typeof event.data);
      return;
    }

    try {
      const unpacked = msgpack.decode(new Uint8Array(arrayBuffer));
      console.log(unpacked); // Keep this for debugging if needed
      output.innerHTML += unpacked.body + "<br>"; // Expecting an object with a 'body' property
    } catch (e) {
      console.error("MessagePack decode error:", e);
      console.log("Raw message data:", arrayBuffer);
    }
  };

  return ws;
}

globalThis.ws = connectWebsocket();

const form = document.getElementById("form");
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const command = document.getElementById("command").value;
  const clientMessage = {
    type: "cmd",
    body: command,
  };
  ws.send(msgpack.encode(clientMessage));
});
