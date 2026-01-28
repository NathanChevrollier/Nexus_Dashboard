'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/components/ui/socket-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, TrendingDown, Wallet, Activity, 
  Home, Zap, RefreshCw, History, Newspaper, 
    Target, Globe, Rocket, ShieldAlert, Trophy 
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- CONFIGURATION ---
const MAX_HISTORY = 40;
const STOCK_EMOJI: Record<string, string> = {
    BTC: '🟧',          // Bitcoin
    ETH: '🔷',          // Ethereum
    NVDA: '🖥️',        // Nvidia / GPU
    AAPL: '🍎',         // Apple
    'EUR/USD': '🇪🇺',   // Euro/Dollar
    'JPY/USD': '💴',    // Yen/Dollar
    DOGE: '🐕',         // Dogecoin
    'AI-START': '✨'     // AI startup
};

// --- TYPES ---
type MarketType = 'CRYPTO' | 'STOCK' | 'FOREX' | 'STARTUP';

type Stock = {
  symbol: string;
  name: string;
  price: number;
  type: MarketType;
  history: number[];
  volatility: number;
  riskFactor: number;
  minPrice?: number;
  maxPrice?: number;
};

type LeaderboardEntry = {
    userId?: string;
    userName?: string;
    name?: string;
    score?: number;
    bestScore?: number;
    netWorth?: number;
};

// --- DONNÉES INITIALES (Pour éviter l'écran blanc) ---
const INITIAL_STOCKS: Record<string, Stock> = {
  'BTC': { symbol: 'BTC', name: 'Bitcoin', price: 64000, type: 'CRYPTO', history: Array(MAX_HISTORY).fill(64000), volatility: 0.08, riskFactor: 0.05, minPrice: 60000, maxPrice: 68000 },
  'ETH': { symbol: 'ETH', name: 'Ethereum', price: 3400, type: 'CRYPTO', history: Array(MAX_HISTORY).fill(3400), volatility: 0.07, riskFactor: 0.04, minPrice: 3100, maxPrice: 3800 },
  'NVDA': { symbol: 'NVDA', name: 'Nvidia Corp', price: 900, type: 'STOCK', history: Array(MAX_HISTORY).fill(900), volatility: 0.03, riskFactor: 0.01, minPrice: 850, maxPrice: 950 },
  'AAPL': { symbol: 'AAPL', name: 'Apple Inc.', price: 175, type: 'STOCK', history: Array(MAX_HISTORY).fill(175), volatility: 0.02, riskFactor: 0.01, minPrice: 170, maxPrice: 180 },
  'EUR/USD': { symbol: 'EUR/USD', name: 'Euro / Dollar', price: 1.08, type: 'FOREX', history: Array(MAX_HISTORY).fill(1.08), volatility: 0.005, riskFactor: 0.001, minPrice: 1.05, maxPrice: 1.11 },
  'JPY/USD': { symbol: 'JPY/USD', name: 'Yen / Dollar', price: 0.0065, type: 'FOREX', history: Array(MAX_HISTORY).fill(0.0065), volatility: 0.006, riskFactor: 0.001, minPrice: 0.006, maxPrice: 0.007 },
  'DOGE': { symbol: 'DOGE', name: 'DogeCoin', price: 0.15, type: 'CRYPTO', history: Array(MAX_HISTORY).fill(0.15), volatility: 0.15, riskFactor: 0.1, minPrice: 0.1, maxPrice: 0.25 },
  'AI-START': { symbol: 'AI-START', name: 'Unknown AI Startup', price: 10, type: 'STARTUP', history: Array(MAX_HISTORY).fill(10), volatility: 0.25, riskFactor: 0.2, minPrice: 5, maxPrice: 20 },
};

// --- COMPOSANT GRAPHIQUE SVG AMÉLIORÉ ---
const StockChart = ({ data, color, height = 60 }: { data: number[], color: string, height?: number }) => {
  if (!data || data.length < 2) return <div className="h-full w-full bg-muted/10 animate-pulse" />;

  const max = Math.max(...data) * 1.02;
  const min = Math.min(...data) * 0.98;
  const range = max - min || 1;
  const width = 100;
  
  const points = data.map((price, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = 100 - ((price - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  const strokeColor = color === 'green' ? '#10b981' : '#ef4444';
  const fillGradientColor = color === 'green' ? '#10b98140' : '#ef444440';

  return (
    <div className="w-full overflow-hidden" style={{ height: `${height}px` }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full filter drop-shadow-lg">
        <defs>
          <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={fillGradientColor} />
            <stop offset="100%" stopColor={color === 'green' ? '#10b98108' : '#ef444408'} />
          </linearGradient>
        </defs>
        {/* Grille légère */}
        <line x1="0" y1="25" x2="100" y2="25" stroke="white" strokeWidth="0.5" opacity="0.05" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="white" strokeWidth="0.5" opacity="0.05" />
        <line x1="0" y1="75" x2="100" y2="75" stroke="white" strokeWidth="0.5" opacity="0.05" />
        {/* Aire remplie */}
        <path d={`M0,100 L0,${100 - ((data[0]-min)/range)*100} ${points} L100,100 Z`} fill={`url(#grad-${color})`} stroke="none" />
        {/* Ligne principale avec glow */}
        <polyline points={points} fill="none" stroke={strokeColor} strokeWidth="2.5" vectorEffect="non-scaling-stroke" opacity="0.8" />
        <polyline points={points} fill="none" stroke={strokeColor} strokeWidth="4" vectorEffect="non-scaling-stroke" opacity="0.2" />
      </svg>
    </div>
  );
};

export default function TraderTerminal() {
  const { data: session } = useSession();
  const router = useRouter();
  const socket = useSocket();

  // --- STATE ---
  const [stocks, setStocks] = useState<Record<string, Stock>>(INITIAL_STOCKS);
  const [portfolio, setPortfolio] = useState({ cash: 10000, holdings: {} as Record<string, number>, netWorth: 10000 });
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC');
  const [tradeAmount, setTradeAmount] = useState(1);
  const [logs, setLogs] = useState<{msg: string, type: 'success'|'error'|'info', time: string}[]>([]);
  const [news, setNews] = useState<string>("Ouverture des marchés mondiaux...");
  const [isConnected, setIsConnected] = useState(false);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // --- SOUNDS ---
  const playSound = (type: 'buy' | 'sell' | 'click' | 'alert') => {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        const now = ctx.currentTime;
        if (type === 'buy') {
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
        } else if (type === 'sell') {
            osc.frequency.setValueAtTime(1000, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        } else if (type === 'alert') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.3);
        } else {
            osc.frequency.setValueAtTime(800, now); // Click
        }
        
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start();
        osc.stop(now + 0.15);
    } catch (e) { console.error(e); }
  };

  // --- HELPERS ---
    const addLog = useCallback((msg: string, type: 'success'|'error'|'info') => {
      setLogs(prev => [{ msg, type, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 6));
  }, []);

  // --- SOCKET HANDLERS ---
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
        setIsConnected(true);
        addLog("Connecté au serveur boursier", "info");
        console.log('🔌 Socket connected, session:', session);
        if (session?.user?.id) {
            // Envoyer userId et userName pour l'identification
            const identifyPayload = { 
                userId: session.user.id,
                userName: session.user.name || session.user.email?.split('@')[0] || 'Trader'
            };
            console.log('🔵 Sending identify:', identifyPayload);
            socket.emit('identify', identifyPayload);
        } else {
            console.warn('⚠️ No session.user.id available, cannot identify');
            addLog("Session non trouvée", "error");
        }
        socket.emit('trader:getState');
    };

    const handleDisconnect = () => {
        setIsConnected(false);
        setNews("Connexion au marché perdue. Vérifie le serveur socket.");
        addLog("Déconnecté du serveur boursier", "error");
    };

    const handleState = (data: any) => {
        console.log('📊 trader:state/update received:', data);
        if (data?.stocks) {
            setStocks(prev => {
                // Transformer les données du serveur pour ajouter le champ 'symbol' manquant
                const transformedStocks: Record<string, Stock> = {};
                Object.keys(data.stocks).forEach(symbol => {
                    const serverStock = data.stocks[symbol];
                    const prevStock = prev[symbol];
                    
                    // Calculer les min/max à partir de l'historique
                    const stockHistory = serverStock.history || [];
                    const historyMin = stockHistory.length > 0 ? Math.min(...stockHistory) : serverStock.price;
                    const historyMax = stockHistory.length > 0 ? Math.max(...stockHistory) : serverStock.price;
                    
                    transformedStocks[symbol] = {
                        ...serverStock,
                        symbol: symbol,
                        type: serverStock.type || 'CRYPTO',
                        volatility: serverStock.volatility || 0.05,
                        riskFactor: serverStock.riskFactor || 0.01,
                        history: stockHistory,
                        minPrice: prevStock?.minPrice ? Math.min(prevStock.minPrice, historyMin) : historyMin,
                        maxPrice: prevStock?.maxPrice ? Math.max(prevStock.maxPrice, historyMax) : historyMax,
                    };
                });
                
                const nextStocks = transformedStocks;
                const mover = Object.keys(nextStocks || {}).find(sym => {
                    const prevPrice = prev[sym]?.price;
                    const newPrice = nextStocks[sym]?.price;
                    if (prevPrice === undefined || newPrice === undefined || prevPrice === 0) return false;
                    return Math.abs((newPrice - prevPrice) / prevPrice) > 0.05;
                });

                if (mover) {
                    const prevPrice = prev[mover]?.price || 0;
                    const newPrice = nextStocks[mover]?.price || 0;
                    const delta = prevPrice ? ((newPrice - prevPrice) / prevPrice) * 100 : 0;
                    setNews(`Mouvement marqué sur ${mover}: ${delta.toFixed(1)}%`);
                }

                return nextStocks;
            });
        }

        if (data?.portfolio) {
            console.log('💼 Portfolio update from state:', data.portfolio);
            setPortfolio(data.portfolio);
        }
        if (data?.leaderboard) {
            console.log('🏆 Leaderboard update:', data.leaderboard);
            setLeaderboard(data.leaderboard);
        }
    };

    const handlePortfolio = (data: any) => {
        console.log('💰 trader:portfolio received:', data);
        setPortfolio(data);
        // Confirmer la mise à jour dans les logs
        if (data.cash !== undefined) {
            addLog(`Portfolio: $${data.cash.toFixed(0)} cash, $${(data.netWorth || 0).toFixed(0)} total`, "success");
        }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('trader:update', handleState);
    socket.on('trader:state', handleState);
    socket.on('trader:portfolio', handlePortfolio);

    if (socket.connected) {
        handleConnect();
    }

    return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('trader:update', handleState);
        socket.off('trader:state', handleState);
        socket.off('trader:portfolio', handlePortfolio);
    };
  }, [socket, session?.user?.id, addLog]);

  // Effet séparé pour identifier le joueur quand la session devient disponible
  useEffect(() => {
    if (!socket?.connected) {
      console.log('❌ Socket not connected, cannot identify');
      return;
    }
    if (!session?.user?.id) {
      console.log('❌ No session.user.id, cannot identify');
      return;
    }
    
    console.log('👤 Session available, sending identify');
    const identifyPayload = { 
        userId: session.user.id,
        userName: session.user.name || session.user.email?.split('@')[0] || 'Trader'
    };
    console.log('📤 Emitting identify:', identifyPayload);
    socket.emit('identify', identifyPayload);
    
    // Petit délai puis demander l'état
    setTimeout(() => {
      console.log('📤 Requesting state after identify');
      socket.emit('trader:getState');
    }, 100);
  }, [socket?.connected, session?.user?.id, session?.user?.name, session?.user?.email]);

    // Assure toujours un symbole sélectionné qui existe dans les données reçues
    useEffect(() => {
        if (selectedSymbol && stocks[selectedSymbol]) return;
        const fallback = Object.keys(stocks)[0];
        if (fallback) setSelectedSymbol(fallback);
    }, [stocks, selectedSymbol]);

  const handleTransaction = (type: 'BUY' | 'SELL') => {
    const stock = stocks[selectedSymbol];
    if (!stock || !socket?.connected || !session?.user?.id) {
      console.error('❌ Cannot trade:', { hasStock: !!stock, socketConnected: socket?.connected, hasUserId: !!session?.user?.id });
      addLog("Impossible de trader (connexion ou session manquante)", "error");
      return;
    }

    const cost = stock.price * tradeAmount;

    if (type === 'BUY') {
        console.log(`🛒 Attempting to buy ${tradeAmount} ${stock.symbol} for $${cost.toFixed(2)}`);
        console.log(`💰 Current cash: $${portfolio.cash.toFixed(2)}`);
        
        if (portfolio.cash >= cost) {
            // Envoyer la commande au serveur - le serveur mettra à jour et renverra le portfolio
            const buyPayload = { userId: session.user.id, symbol: stock.symbol, quantity: tradeAmount };
            console.log('📤 Emitting trader:buy:', buyPayload);
            socket.emit('trader:buy', buyPayload);
            playSound('buy');
            addLog(`Commande d'achat: ${tradeAmount} ${stock.symbol}`, "info");
        } else {
            console.warn(`⚠️ Insufficient funds: need $${cost.toFixed(2)}, have $${portfolio.cash.toFixed(2)}`);
            playSound('alert');
            addLog("Fonds insuffisants", "error");
        }
    } else {
        const owned = portfolio.holdings[stock.symbol] || 0;
        console.log(`📦 Attempting to sell ${tradeAmount} ${stock.symbol}`);
        console.log(`📊 Currently own: ${owned}`);
        
        if (owned >= tradeAmount) {
            // Envoyer la commande au serveur - le serveur mettra à jour et renverra le portfolio
            const sellPayload = { userId: session.user.id, symbol: stock.symbol, quantity: tradeAmount };
            console.log('📤 Emitting trader:sell:', sellPayload);
            socket.emit('trader:sell', sellPayload);
            playSound('sell');
            addLog(`Commande de vente: ${tradeAmount} ${stock.symbol}`, "info");
        } else {
            console.warn(`⚠️ Insufficient holdings: need ${tradeAmount}, have ${owned}`);
            playSound('alert');
            addLog("Pas assez d'actions", "error");
        }
    }
  };

  // --- VARIABLES DÉRIVÉES ET SÉCURITÉ ---
  // C'est ici qu'on corrige ton bug "Cannot read properties of undefined"
    const currentStock = stocks[selectedSymbol];
  
  // Si pour une raison ou une autre l'action n'existe pas, on affiche un loader
  if (!currentStock) {
      return (
          <div className="h-screen bg-black text-green-500 flex items-center justify-center flex-col gap-4 font-mono">
              <Activity className="animate-spin w-12 h-12"/>
              <p>INITIALISATION DU MARCHÉ...</p>
              <Button onClick={() => window.location.reload()} variant="outline">Forcer le rechargement</Button>
          </div>
      );
  }

  const isUp = currentStock.history[currentStock.history.length - 1] >= currentStock.history[0];
    const tradingDisabled = !isConnected;
  
  // Calcul Fortune
  const totalNetWorth = portfolio.cash + Object.keys(portfolio.holdings).reduce((acc, key) => {
      const price = stocks[key]?.price || 0;
      return acc + (portfolio.holdings[key] * price);
  }, 0);

  // Icone par type
  const getTypeIcon = (type: MarketType) => {
      switch(type) {
          case 'CRYPTO': return <Zap className="w-3 h-3 text-yellow-400"/>;
          case 'STOCK': return <Target className="w-3 h-3 text-blue-400"/>;
          case 'FOREX': return <Globe className="w-3 h-3 text-green-400"/>;
          case 'STARTUP': return <Rocket className="w-3 h-3 text-purple-400"/>;
      }
  };

    return (
        <div className="relative min-h-screen bg-[#050505] text-gray-200 font-mono flex flex-col overflow-hidden selection:bg-green-900/50">
      
      {/* 1. TOP BAR */}
    <header className="h-14 border-b border-white/10 bg-[#0a0a0a] flex items-center justify-between px-4 z-10 shrink-0">
        <div className="flex items-center gap-3">
            <div className="bg-green-500/10 p-1.5 rounded border border-green-500/20">
                <Activity className="text-green-500 w-5 h-5" />
            </div>
            <h1 className="font-bold tracking-wider text-sm md:text-base text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">
                MONEYMAKER <span className="text-[10px] text-green-500 ml-1">PRO</span>
            </h1>
        </div>

        <div className="flex items-center gap-6 text-sm">
            <div className="hidden md:block text-right">
                <p className="text-[10px] text-gray-500 uppercase">Cash</p>
                <p className="font-bold text-white">${portfolio.cash.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            </div>
            <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase">Net Worth</p>
                <p className={cn("font-bold", totalNetWorth >= 10000 ? "text-green-400" : "text-red-400")}>
                    ${totalNetWorth.toLocaleString(undefined, {maximumFractionDigits: 0})}
                </p>
            </div>
            <div className="hidden md:flex items-center gap-2 text-[11px] px-2 py-1 rounded border border-white/10 bg-white/5">
                <span className={cn("w-2 h-2 rounded-full", isConnected ? "bg-green-400" : "bg-red-500 animate-pulse")}></span>
                <span className="uppercase tracking-wide text-gray-400">{isConnected ? "Socket connecté" : "Socket déconnecté"}</span>
            </div>
            <Button 
                onClick={() => router.push('/dashboard')} 
                size="sm"
                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 h-8 text-xs"
            >
                <Home className="w-3 h-3 mr-2" /> EXIT
            </Button>
        </div>
      </header>

      {!isConnected && (
        <div className="absolute inset-0 z-20 bg-gradient-to-br from-red-950 via-black to-red-900/70 backdrop-blur flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-black/60 border border-red-800/50 rounded-xl shadow-2xl p-6 space-y-4 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center animate-pulse">
                    <ShieldAlert className="w-6 h-6 text-red-300" />
                </div>
                <div className="space-y-2">
                    <p className="text-sm tracking-wide text-red-200 uppercase">Connexion perdue</p>
                    <h2 className="text-xl font-black text-white">Serveur marché indisponible</h2>
                    <p className="text-xs text-red-100/80">Vérifie le container socket ou ta connexion réseau puis relance. Aucun fallback n'est activé.</p>
                </div>
                <div className="flex gap-3 justify-center">
                    <Button variant="outline" className="border-red-500/40 text-red-100" onClick={() => socket?.connect()}>Reconnecter</Button>
                    <Button className="bg-white/10 hover:bg-white/20 text-white" onClick={() => router.push('/dashboard')}>Retour Dashboard</Button>
                </div>
            </div>
        </div>
      )}

      {/* 2. MAIN GRID */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-0 overflow-hidden">
        
        {/* LEFT: MARKET WATCH (Liste) */}
        <aside className="col-span-12 md:col-span-3 border-b md:border-b-0 md:border-r border-white/10 bg-[#080808] flex flex-col max-h-[200px] md:max-h-none overflow-hidden">
            <div className="p-3 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2">
                    <RefreshCw className="w-3 h-3" /> Assets
                </span>
                <Badge variant="outline" className="text-[9px] h-4 border-white/10 text-gray-500">{Object.keys(stocks).length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto">
                {Object.entries(stocks).map(([symbol, stock]) => {
                    const historyForChange = stock.history.length >= 2
                      ? stock.history[stock.history.length - Math.min(10, stock.history.length - 1)]
                      : stock.price;
                    const priceChange = stock.price - historyForChange;
                    const isStockUp = priceChange >= 0;
                
                    return (
                        <div 
                            key={symbol}
                            onClick={() => { setSelectedSymbol(symbol); playSound('click'); }}
                            className={cn(
                                "p-3 border-b border-white/5 cursor-pointer hover:bg-white/5 relative transition-colors",
                                selectedSymbol === symbol && "bg-white/10 border-l-2 border-l-green-500"
                            )}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-2">
                                    {getTypeIcon(stock.type)}
                                    <span className="font-bold text-sm text-gray-200 flex items-center gap-2">
                                        <span>{STOCK_EMOJI[symbol] || '📈'}</span>
                                        {symbol}
                                    </span>
                                </div>
                                <span className={cn("text-xs font-mono", isStockUp ? "text-green-500" : "text-red-500")}>
                                    ${stock.price < 1 ? stock.price.toFixed(4) : stock.price.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-[9px]">
                                <span className="text-gray-600">{stock.type}</span>
                                <div className="space-x-2 flex">
                                    {stock.minPrice && <span className="text-red-400">↓${stock.minPrice.toFixed(2)}</span>}
                                    {stock.maxPrice && <span className="text-green-400">↑${stock.maxPrice.toFixed(2)}</span>}
                                </div>
                            </div>
                            {portfolio.holdings[symbol] > 0 && (
                                <span className="text-[9px] bg-blue-900/30 text-blue-400 px-1.5 rounded inline-block mt-1">
                                    x{portfolio.holdings[symbol]}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </aside>

        {/* CENTER: CHART */}
        <section className="col-span-12 md:col-span-6 flex flex-col bg-[#050505] relative min-h-[300px]">
            {/* Chart Info */}
            <div className="absolute top-4 left-4 z-10">
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                    <span className="inline-flex items-center gap-2 px-2 py-1 rounded bg-white/5 border border-white/10">
                        {getTypeIcon(currentStock.type)}
                        <span>{STOCK_EMOJI[currentStock.symbol] || '📈'}</span>
                        {currentStock.symbol}
                    </span>
                    {currentStock.type === 'STARTUP' && <ShieldAlert className="w-4 h-4 text-purple-500 animate-pulse" />}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                     <Badge variant="secondary" className="bg-white/5 text-gray-400 hover:bg-white/10 text-[10px] h-5 border-0">
                        {currentStock.name}
                     </Badge>
                     <Badge variant="outline" className={cn("text-[10px] h-5 border-0", isUp ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                        {isUp ? "BULLISH" : "BEARISH"}
                     </Badge>
                </div>
            </div>
            
            <div className="absolute top-4 right-4 z-10 text-right">
                <p className={cn("text-3xl font-mono font-bold", isUp ? "text-green-500" : "text-red-500")}>
                    ${currentStock.price < 1 ? currentStock.price.toFixed(5) : currentStock.price.toFixed(2)}
                </p>
                <p className="text-[10px] text-gray-500 mt-1">VOLATILITÉ: {(currentStock.volatility * 100).toFixed(1)}%</p>
            </div>

            {/* SVG Chart */}
            <div className="flex-1 relative flex items-center justify-center pt-20 pb-10 px-0">
                 {/* Background Grid */}
                 <div className="absolute inset-0 grid grid-cols-6 gap-px bg-white/[0.02] pointer-events-none">
                    <div/><div/><div/><div/><div/><div/>
                 </div>
                 
                 <div className="w-full h-full z-0 px-4">
                    <StockChart data={currentStock.history} color={isUp ? 'green' : 'red'} height={400} />
                 </div>
            </div>

            {/* News Footer */}
            <div className="h-8 bg-[#0a0a0a] border-t border-white/10 flex items-center px-3 gap-2 overflow-hidden shrink-0">
                <Newspaper className="w-3 h-3 text-orange-500 shrink-0" />
                <div className="whitespace-nowrap text-[10px] text-gray-400 animate-pulse">
                    <span className="text-orange-500 font-bold mr-2">NEWS:</span> {news}
                </div>
            </div>

            {/* Portefeuille - Table des actions */}
            {Object.keys(portfolio.holdings).filter(sym => portfolio.holdings[sym] > 0).length > 0 && (
                <div className="bg-[#0a0a0a] border-t border-white/10 max-h-[200px] overflow-y-auto">
                    <div className="p-3 border-b border-white/5 bg-white/[0.02] text-xs font-bold text-gray-500 uppercase">
                        📊 Portefeuille Actif
                    </div>
                    <table className="w-full text-[10px] font-mono">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="text-left p-2 text-gray-600">Action</th>
                                <th className="text-center p-2 text-gray-600">Quantité</th>
                                <th className="text-right p-2 text-gray-600">Prix Unit.</th>
                                <th className="text-right p-2 text-gray-600">Coût Total</th>
                                <th className="text-right p-2 text-gray-600">Valeur Act.</th>
                                <th className="text-right p-2 text-gray-600">P&L</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.keys(portfolio.holdings).filter(sym => portfolio.holdings[sym] > 0).map(sym => {
                                const stock = stocks[sym];
                                const quantity = portfolio.holdings[sym];
                                if (!stock) return null;
                                
                                // Estimation du coût d'achat (basée sur le prix moyen de l'historique)
                                const avgPrice = stock.history.length > 0 
                                    ? stock.history.reduce((a, b) => a + b, 0) / stock.history.length 
                                    : stock.price;
                                const costTotal = avgPrice * quantity;
                                const valueNow = stock.price * quantity;
                                const pnl = valueNow - costTotal;
                                const pnlPercent = costTotal > 0 ? ((pnl / costTotal) * 100) : 0;
                                
                                return (
                                    <tr key={sym} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="p-2">
                                            <span className="mr-1">{STOCK_EMOJI[sym] || '📊'}</span>
                                            <span className="font-bold">{sym}</span>
                                        </td>
                                        <td className="text-center p-2 text-white">{quantity}</td>
                                        <td className="text-right p-2 text-gray-400">${stock.price.toFixed(2)}</td>
                                        <td className="text-right p-2 text-gray-400">${costTotal.toFixed(2)}</td>
                                        <td className="text-right p-2 text-white font-bold">${valueNow.toFixed(2)}</td>
                                        <td className={cn("text-right p-2 font-bold", pnl >= 0 ? "text-green-500" : "text-red-500")}>
                                            {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)} ({pnlPercent.toFixed(1)}%)
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>

        {/* RIGHT: TRADING PANEL */}
        <aside className="col-span-12 md:col-span-3 border-t md:border-t-0 md:border-l border-white/10 bg-[#080808] flex flex-col">
            <div className="p-4 border-b border-white/5">
                <h3 className="text-xs font-bold text-white flex items-center gap-2 mb-4">
                    <Zap className="w-3 h-3 text-yellow-500" /> OPÉRATIONS
                </h3>

                <div className="space-y-4">
                    {/* Amount Input */}
                    <div className="bg-white/5 p-3 rounded border border-white/5">
                        <div className="flex justify-between text-[10px] text-gray-500 mb-2">
                            <span className="uppercase font-bold">Quantité</span>
                            <span className="text-blue-400 cursor-pointer hover:text-blue-300" onClick={() => setTradeAmount(Math.floor(portfolio.cash / currentStock.price))}>
                                MAX: {Math.floor(portfolio.cash / currentStock.price)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Input 
                                type="number" 
                                min="1" 
                                value={tradeAmount}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTradeAmount(Math.max(1, parseInt(e.target.value) || 1))}
                                className="flex-1 bg-black border-white/10 text-white text-center font-mono text-lg font-bold h-10"
                            />
                            <Button 
                                variant="secondary" 
                                size="sm"
                                onClick={() => setTradeAmount(Math.floor(portfolio.cash / currentStock.price))}
                                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold h-10 px-3"
                            >
                                MAX
                            </Button>
                        </div>
                    </div>

                    {/* Cost Calc */}
                    <div className="flex justify-between text-xs px-1">
                        <span className="text-gray-500">Total Estimé:</span>
                        <span className="text-white font-mono">${(currentStock.price * tradeAmount).toFixed(2)}</span>
                    </div>

                    {/* Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                        <Button 
                            onClick={() => handleTransaction('BUY')}
                            disabled={tradingDisabled || portfolio.cash < currentStock.price * tradeAmount}
                            className="bg-green-600 hover:bg-green-500 text-white font-bold text-xs h-10"
                        >
                            ACHETER
                        </Button>
                        <Button 
                            onClick={() => handleTransaction('SELL')}
                            disabled={tradingDisabled || !portfolio.holdings[selectedSymbol] || portfolio.holdings[selectedSymbol] < tradeAmount}
                            className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs h-10"
                        >
                            VENDRE
                        </Button>
                    </div>
                    {tradingDisabled && (
                        <p className="text-[10px] text-red-400 mt-2 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" /> Connexion requise pour trader.
                        </p>
                    )}
                </div>
            </div>

            {/* Transaction Logs */}
            <div className="flex-1 flex flex-col min-h-[150px] bg-[#050505]">
                <div className="p-2 border-b border-white/5 bg-white/[0.02] text-[10px] font-bold text-gray-500 uppercase flex gap-2 items-center">
                    <History className="w-3 h-3" /> Activité Récente
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2 font-mono text-[10px]">
                    {logs.length === 0 && <span className="text-gray-700 italic block text-center mt-4">Aucune activité</span>}
                    {logs.map((log, i) => (
                        <div key={i} className="flex gap-2 border-l-2 border-white/10 pl-2 py-1 animate-in slide-in-from-left-2 fade-in">
                            <span className="text-gray-600">{log.time.split(' ')[0]}</span>
                            <span className={cn(
                                log.type === 'success' ? "text-green-400" : log.type === 'error' ? "text-red-400" : "text-blue-400"
                            )}>
                                {log.msg}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
            {/* Leaderboard */}
            <div className="border-t border-white/10 bg-[#080808] p-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                    <Trophy className="w-4 h-4 text-yellow-400" /> Classement
                </h3>
                {leaderboard.length === 0 ? (
                    <p className="text-xs text-gray-600">Aucun trader actif</p>
                ) : (
                    <div className="space-y-2">
                        {leaderboard.map((entry, index) => {
                            const netWorth = entry.netWorth ?? 0;
                            const userName = entry.userName || 'Anonyme';
                            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index+1}`;
                            const isCurrentUser = session?.user?.id && entry.userId === session.user.id;
                            return (
                                <div
                                    key={entry.userId || userName + index}
                                    className={cn(
                                        "flex items-center gap-3 p-2 rounded-lg border transition-colors",
                                        isCurrentUser ? "bg-green-500/10 border-green-500/30" : "border-white/5",
                                        index < 3 && !isCurrentUser ? "bg-white/5" : ""
                                    )}
                                >
                                    <div className="w-8 text-center text-lg">{medal}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium truncate text-white">
                                            {userName} {isCurrentUser && <span className="text-green-400 ml-1">(Vous)</span>}
                                        </p>
                                    </div>
                                    <div className="text-xs font-mono text-green-400">${netWorth.toLocaleString()}</div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </aside>

      </main>
    </div>
  );
}