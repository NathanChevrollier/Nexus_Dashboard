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
  // Aligne le serveur sur les mêmes tickers que le client fallback MoneyMaker
  stocks: {
    'BTC': { name: 'Bitcoin', price: 64000, volatility: 0.08, history: [] },
    'ETH': { name: 'Ethereum', price: 3400, volatility: 0.07, history: [] },
    'NVDA': { name: 'Nvidia Corp', price: 900, volatility: 0.03, history: [] },
    'AAPL': { name: 'Apple Inc.', price: 175, volatility: 0.02, history: [] },
    'EUR/USD': { name: 'Euro / Dollar', price: 1.08, volatility: 0.005, history: [] },
    'JPY/USD': { name: 'Yen / Dollar', price: 0.0065, volatility: 0.006, history: [] },
    'DOGE': { name: 'DogeCoin', price: 0.15, volatility: 0.15, history: [] },
    'AI-START': { name: 'Unknown AI Startup', price: 10, volatility: 0.25, history: [] },
  },
  players: {}, 
  lastUpdate: Date.now()
};

// Initialiser l'historique des stocks au démarrage
Object.keys(market.stocks).forEach(symbol => {
  const stock = market.stocks[symbol];
  // Générer un historique initial de 30 points
  for (let i = 0; i < 30; i++) {
    stock.history.push(stock.price);
  }
});

// Helper pour le classement
function getLeaderboard() {
  return Object.values(market.players)
    .sort((a, b) => b.netWorth - a.netWorth)
    .slice(0, 10)
    .map(p => ({
      userId: p.userId,
      userName: p.name,
      name: p.name,
      netWorth: p.netWorth
    }));
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
  
  socket.on('identify', (payload) => {
    const userKey = typeof payload === 'string'
      ? payload
      : (payload && typeof payload.userId === 'string'
          ? payload.userId
          : (payload && typeof payload.id === 'string' ? payload.id : null));

    const userName = typeof payload === 'object' && payload.userName 
      ? payload.userName 
      : null;

    if (!userKey) return;
    
    socket.data = socket.data || {};
    socket.data.userId = userKey;
    socket.join(userKey);

    // NE PAS ajouter automatiquement les joueurs
    // Les joueurs sont ajoutés uniquement quand ils commencent à faire des transactions
    // On envoie juste le portfolio s'il existe
    if (market.players[userKey]) {
      if (userName) {
        market.players[userKey].name = userName;
      }
      socket.emit('trader:portfolio', market.players[userKey]);
    } else {
      // Envoyer un portfolio initial sans ajouter le joueur à market.players
      socket.emit('trader:portfolio', {
        userId: userKey,
        name: userName || `Trader-${userKey.slice(0,4)}`,
        cash: 10000,
        holdings: {},
        netWorth: 10000
      });
    }
  });

  // --- Actions de Jeu Trader ---
  
  // Helper pour assurer que le joueur existe dans market.players
  const ensurePlayer = (userId, userName) => {
    if (!market.players[userId]) {
      market.players[userId] = {
        userId,
        name: userName || `Trader-${userId.slice(0,4)}`,
        cash: 10000,
        holdings: {},
        netWorth: 10000
      };
    }
    return market.players[userId];
  };
  
  socket.on('trader:getState', () => {
    const response = {
      stocks: market.stocks,
      leaderboard: getLeaderboard()
    };
    
    if (socket.data?.userId && market.players[socket.data.userId]) {
      response.portfolio = market.players[socket.data.userId];
    }
    
    socket.emit('trader:state', response);
  });

  socket.on('trader:buy', ({ userId, symbol, quantity }) => {
    let player = market.players[userId];
    const stock = market.stocks[symbol];
    
    if (!stock || quantity <= 0) return;

    // Créer le joueur s'il n'existe pas (première transaction)
    if (!player) {
      player = ensurePlayer(userId, socket.data?.userName);
    }

    const cost = stock.price * quantity;
    
    if (player.cash >= cost) {
      player.cash = parseFloat((player.cash - cost).toFixed(2));
      player.holdings = player.holdings || {};
      player.holdings[symbol] = (player.holdings[symbol] || 0) + quantity;
      
      let stocksValue = 0;
      Object.keys(player.holdings).forEach(sym => {
        stocksValue += (player.holdings[sym] || 0) * (market.stocks[sym]?.price || 0);
      });
      player.netWorth = parseFloat((player.cash + stocksValue).toFixed(2));
      
      socket.emit('trader:portfolio', player);
    }
  });

  socket.on('trader:sell', ({ userId, symbol, quantity }) => {
    let player = market.players[userId];
    const stock = market.stocks[symbol];
    
    if (!stock || quantity <= 0) return;

    // Créer le joueur s'il n'existe pas (première transaction)
    if (!player) {
      player = ensurePlayer(userId, socket.data?.userName);
    }

    const owned = player.holdings?.[symbol] || 0;
    
    if (player.holdings && owned >= quantity) {
      const gain = stock.price * quantity;
      player.cash = parseFloat((player.cash + gain).toFixed(2));
      player.holdings[symbol] -= quantity;
      
      let stocksValue = 0;
      Object.keys(player.holdings).forEach(sym => {
        stocksValue += (player.holdings[sym] || 0) * (market.stocks[sym]?.price || 0);
      });
      player.netWorth = parseFloat((player.cash + stocksValue).toFixed(2));
      
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
  io.emit(event, data || {});
  return res.json({ ok: true });
});

const PORT = process.env.SOCKET_PORT || 4001;
server.listen(PORT, () => {
  console.log(`Socket Monitor & Trader Engine listening on port ${PORT}`);
});