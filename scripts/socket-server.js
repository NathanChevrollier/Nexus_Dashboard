const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);

// CORS Config (Production)
const allowedOrigins = process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : ['http://localhost:3000'];

const io = new Server(server, { 
  cors: { 
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  path: '/socket.io/'
});

app.use(bodyParser.json());

// --- MONITORING RÉEL ---
let lastCheck = {
  status: 'initializing', // 'offline', 'starting', 'online'
  code: null,             // 502, 200, ECONNREFUSED
  message: 'Initialisation du moniteur...',
  timestamp: Date.now()
};

function checkAppHealth() {
  const start = Date.now();
  // Timeout modéré
  const request = http.get('http://app:3000/api/health', { timeout: 3000 }, (res) => {
    const latency = Date.now() - start;
    if (res.statusCode === 200) {
      updateStatus('online', 200, `Système opérationnel (${latency}ms)`);
    } else if (res.statusCode >= 500) {
      updateStatus('starting', res.statusCode, `Démarrage des services... (Code ${res.statusCode})`);
    } else {
      updateStatus('maintenance', res.statusCode, `Maintenance en cours (Code ${res.statusCode})`);
    }
  });

  request.on('error', (err) => {
    updateStatus('offline', 'ERR', `Service injoignable (${err.code || 'Connexion refusée'})`);
  });

  request.on('timeout', () => {
    request.destroy();
    updateStatus('offline', 'TIMEOUT', 'Le service est lent ou ne répond pas.');
  });
}

function updateStatus(status, code, message) {
  const newState = { status, code, message, timestamp: Date.now() };
  
  // On diffuse uniquement si l'état change ou toutes les 5 secondes pour "heartbeat"
  if (newState.status !== lastCheck.status || newState.message !== lastCheck.message) {
    lastCheck = newState;
    io.emit('system:status', lastCheck);
    
    if (status === 'online') {
      console.log('✅ App is ONLINE');
    }
  }
}

// Vérification fréquente (toutes les 1.5 secondes) pour le temps réel
// Reduced polling interval to 10s to lower load
setInterval(checkAppHealth, 10000);

io.on('connection', (socket) => {
  // Envoyer l'état actuel immédiatement à la connexion
  socket.emit('system:status', lastCheck);
  
  socket.on('identify', (userId) => {
    if (userId) socket.join(userId);
  });
});

app.get('/', (req, res) => res.status(200).json({ status: 'ok' }));

app.post('/emit', (req, res) => {
  const { event, targetUserId, payload } = req.body || {};
  if (!event || !targetUserId) return res.status(400).json({ error: 'required args' });
  // Simple secret validation to prevent public abuse
  const expected = process.env.SOCKET_SERVER_SECRET;
  if (expected) {
    // Prefer HMAC signature verification
    const sig = req.get('x-socket-signature');
    const ts = req.get('x-socket-timestamp');
    if (!sig || !ts) return res.status(401).json({ error: 'unauthorized' });
    const now = Date.now();
    const age = Math.abs(now - Number(ts));
    if (isNaN(age) || age > 1000 * 60 * 5) return res.status(401).json({ error: 'stale timestamp' });

    const crypto = require('crypto');
    const canonical = `${event}|${targetUserId}|${ts}|${JSON.stringify(payload || {})}`;
    const expectedSig = crypto.createHmac('sha256', expected).update(canonical).digest('hex');
    const match = (function(a, b) {
      try { return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)); } catch (e) { return false; }
    })(expectedSig, sig);
    if (!match) return res.status(401).json({ error: 'invalid signature' });
  } else {
    // Fallback: token equality header
    const incomingToken = req.get('x-socket-token') || req.get('x-socket-secret');
    if (incomingToken) {
      const expectedToken = process.env.SOCKET_SERVER_SECRET;
      if (expectedToken && incomingToken !== expectedToken) return res.status(401).json({ error: 'unauthorized' });
    }
  }

  io.to(targetUserId).emit(event, payload || {});
  return res.json({ ok: true });
});

// HTTP endpoint to broadcast to ALL connected users
app.post('/broadcast', (req, res) => {
  const { event, data } = req.body || {};
  if (!event) return res.status(400).json({ error: 'event required' });
  console.log(`Broadcasting event ${event} to all users`);
  io.emit(event, data || {});
  return res.json({ ok: true });
});

const PORT = process.env.SOCKET_PORT || 4001;
server.listen(PORT, () => {
  console.log(`Socket Monitor listening on port ${PORT}`);
});