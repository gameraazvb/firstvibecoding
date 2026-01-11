// server.js (CommonJS)
const WebSocket = require("ws");
const http = require("http");

// Create HTTP server (required for Railway)
const server = http.createServer();

// Attach WebSocket server to HTTP server
const wss = new WebSocket.Server({ server });

// Use Railway / cloud port OR fallback to 8080 locally
const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

// store connected players
let players = {};

function broadcast(data, excludeId) {
  const message = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client.id !== excludeId) {
      client.send(message);
    }
  });
}

wss.on("connection", (ws) => {
  ws.id = Math.random().toString(36).substring(2, 9);

  players[ws.id] = { id: ws.id };

  // Send all existing players to new client
  ws.send(JSON.stringify({ type: "init", players }));

  // Notify others
  broadcast({ type: "newPlayer", player: players[ws.id] }, ws.id);

  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (e) {
      return;
    }

    // Update player info
    if (data.type === "update") {
      players[ws.id] = { ...players[ws.id], ...data };
      broadcast({ type: "update", player: players[ws.id] }, ws.id);
    }

    // Chat
    if (data.type === "chat") {
      broadcast({
        type: "chat",
        message: `${data.username} (${data.title}): ${data.msg}`
      });
    }
  });

  ws.on("close", () => {
    delete players[ws.id];
    broadcast({ type: "removePlayer", id: ws.id });
  });
});
