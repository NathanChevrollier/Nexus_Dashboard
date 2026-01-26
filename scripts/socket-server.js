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

// ==========================================
// 1. MOTEUR DE JEU : NEXUS TRADER
// ==========================================

// État du Marché
let market = {
  stocks: {
    'NEXUS': { name: 'Nexus Corp', price: 100, volatility: 0.05, history: [] },
    'CRYPTO': { name: 'DogeCoin 2.0', price: 50, volatility: 0.15, history: [] },
    'GOLD': { name: 'Or Numérique', price: 200, volatility: 0.02, history: [] },
    'AI': { name: 'Skynet Inc', price: 150, volatility: 0.08, history: [] },
    'ENERGY': { name: 'Fusion Core', price: 80, volatility: 0.04, history: [] },
  },
  players: {}, 
  lastUpdate: Date.now()
};

// Helper pour le classement
function getLeaderboard() {
  return Object.values(market.players)
    .sort((a, b) => b.netWorth - a.netWorth)
    .slice(0, 10)
    .map(p => ({ name: p.name, netWorth: p.netWorth }));
}

// Boucle de Simulation (Ticker) - Tourne toutes les 2 secondes
setInterval(() => {
  // Mise à jour des prix
  Object.keys(market.stocks).forEach(symbol => {
    const stock = market.stocks[symbol];
    const change = (Math.random() - 0.5) * stock.volatility;
    let newPrice = stock.price * (1 + change);
    if (newPrice < 1) newPrice = 1; // Plancher
    stock.price = parseFloat(newPrice.toFixed(2));
    
    stock.history.push(stock.price);
    if (stock.history.length > 30) stock.history.shift();
  });

  // Mise à jour de la richesse des joueurs
  Object.keys(market.players).forEach(userId => {
    const player = market.players[userId];
    let stocksValue = 0;
    if (player.holdings) {
      Object.keys(player.holdings).forEach(symbol => {
        stocksValue += (player.holdings[symbol] || 0) * market.stocks[symbol].price;
      });
    }
    player.netWorth = parseFloat((player.cash + stocksValue).toFixed(2));
  });

  // Diffusion globale
  io.emit('trader:update', { 
    stocks: market.stocks,
    leaderboard: getLeaderboard()
  });
}, 2000);


// ==========================================
// 2. SYSTEM MONITORING (Ton code existant)
// ==========================================

let lastCheck = {
  status: 'initializing',
  code: null,
  message: 'Initialisation du moniteur...',
  timestamp: Date.now()
};

function checkAppHealth() {
  const start = Date.now();
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
  if (newState.status !== lastCheck.status || newState.message !== lastCheck.message) {
    lastCheck = newState;
    io.emit('system:status', lastCheck);
    if (status === 'online') console.log('✅ App is ONLINE');
  }
}

// Intervalle de monitoring (10s comme demandé)
setInterval(checkAppHealth, 10000);


// ==========================================
// 3. GESTION SOCKET (Fusionnée)
// ==========================================

io.on('connection', (socket) => {
  // --- Monitoring ---
  socket.emit('system:status', lastCheck);
  
  socket.on('identify', (userId) => {
    if (!userId) return;
    socket.join(userId);

    // --- Initialisation Joueur Trader ---
    if (!market.players[userId]) {
      market.players[userId] = {
        userId,
        name: `Trader-${userId.slice(0,4)}`,
        cash: 1000, // Capital de départ
        holdings: {},
        netWorth: 1000
      };
    }
    // Envoyer le portefeuille perso au joueur identifié
    socket.emit('trader:portfolio', market.players[userId]);
  });

  // --- Actions de Jeu Trader ---
  
  socket.on('trader:buy', ({ userId, symbol, quantity }) => {
    const player = market.players[userId];
    const stock = market.stocks[symbol];
    if (!player || !stock || quantity <= 0) return;

    const cost = stock.price * quantity;
    if (player.cash >= cost) {
      player.cash -= cost;
      player.holdings = player.holdings || {};
      player.holdings[symbol] = (player.holdings[symbol] || 0) + quantity;
      socket.emit('trader:portfolio', player);
    }
  });

  socket.on('trader:sell', ({ userId, symbol, quantity }) => {
    const player = market.players[userId];
    const stock = market.stocks[symbol];
    if (!player || !stock || quantity <= 0) return;

    if (player.holdings && player.holdings[symbol] >= quantity) {
      const gain = stock.price * quantity;
      player.cash += gain;
      player.holdings[symbol] -= quantity;
      socket.emit('trader:portfolio', player);
    }
  });

  socket.on('trader:rename', ({ userId, name }) => {
    if (market.players[userId] && name) {
        market.players[userId].name = name.substring(0, 15); // Limite taille nom
    }
  });
});


// ==========================================
// 4. ENDPOINTS HTTP (Ton code existant)
// ==========================================

app.get('/', (req, res) => res.status(200).json({ status: 'ok' }));

app.post('/emit', (req, res) => {
  const { event, targetUserId, payload } = req.body || {};
  if (!event || !targetUserId) return res.status(400).json({ error: 'required args' });
  
  // Validation Secrète (Ton code existant préservé)
  const expected = process.env.SOCKET_SERVER_SECRET;
  if (expected) {
    const sig = req.get('x-socket-signature');
    const ts = req.get('x-socket-timestamp');
    if (!sig || !ts) return res.status(401).json({ error: 'unauthorized' });
    const now = Date.now();
    const age = Math.abs(now - Number(ts));
    if (isNaN(age) || age > 1000 * 60 * 5) return res.status(401).json({ error: 'stale timestamp' });

    const crypto = require('crypto');
    const canonical = `${event}|${targetUserId}|${ts}|${JSON.stringify(payload || {})}`;
    const expectedSig = crypto.createHmac('sha256', expected).update(canonical).digest('hex');
    // const match = crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(sig)); // Version simplifiée pour compatibilité node
    const match = expectedSig === sig; 
    if (!match) return res.status(401).json({ error: 'invalid signature' });
  } else {
    const incomingToken = req.get('x-socket-token') || req.get('x-socket-secret');
    if (incomingToken) {
      const expectedToken = process.env.SOCKET_SERVER_SECRET;
      if (expectedToken && incomingToken !== expectedToken) return res.status(401).json({ error: 'unauthorized' });
    }
  }

  io.to(targetUserId).emit(event, payload || {});
  return res.json({ ok: true });
});

app.post('/broadcast', (req, res) => {
  const { event, data } = req.body || {};
  if (!event) return res.status(400).json({ error: 'event required' });
  console.log(`Broadcasting event ${event} to all users`);
  io.emit(event, data || {});
  return res.json({ ok: true });
});

const PORT = process.env.SOCKET_PORT || 4001;
server.listen(PORT, () => {
  console.log(`Socket Monitor & Trader Engine listening on port ${PORT}`);
});