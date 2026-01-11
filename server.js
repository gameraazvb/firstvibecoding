// server.js (CommonJS)
const WebSocket = require('ws'); // <-- use require instead of import

const wss = new WebSocket.Server({ port: 8080 });
console.log("Server running on ws://localhost:8080");

// store connected players
let players = {};

function broadcast(data, excludeId) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client.id !== excludeId) {
      client.send(JSON.stringify(data));
    }
  });
}

wss.on('connection', (ws) => {
  ws.id = Math.random().toString(36).substring(2, 9);
  players[ws.id] = { id: ws.id };

  // Send all players to new client
  ws.send(JSON.stringify({ type: "init", players }));

  // Notify others
  broadcast({ type: "newPlayer", player: players[ws.id] }, ws.id);

  ws.on('message', (msg) => {
    let data;
    try { data = JSON.parse(msg); } catch(e){ return; }

    // Update player info
    if (data.type === "update") {
      players[ws.id] = { ...players[ws.id], ...data };
      broadcast({ type: "update", player: players[ws.id] }, ws.id);
    }

    // Chat
    if (data.type === "chat") {
      broadcast({ type: "chat", message: `${data.username} (${data.title}): ${data.msg}` });
    }
  });

  ws.on('close', () => {
    delete players[ws.id];
    broadcast({ type: "removePlayer", id: ws.id });
  });
});
