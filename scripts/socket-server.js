const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(bodyParser.json());

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);
  socket.on('identify', (userId) => {
    if (!userId) return;
    socket.join(userId);
    console.log(`socket ${socket.id} joined room ${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('socket disconnected', socket.id);
  });
});

// HTTP endpoint to broadcast to a user
app.post('/emit', (req, res) => {
  const { event, targetUserId, payload } = req.body || {};
  if (!event || !targetUserId) return res.status(400).json({ error: 'event and targetUserId required' });
  io.to(targetUserId).emit(event, payload || {});
  return res.json({ ok: true });
});

const PORT = process.env.SOCKET_PORT || 4001;
server.listen(PORT, () => {
  console.log(`Socket server listening on port ${PORT}`);
});
