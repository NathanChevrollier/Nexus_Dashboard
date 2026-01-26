'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useSocket } from '@/components/ui/socket-provider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Trophy, Activity, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TraderGamePage() {
  const { data: session } = useSession();
  const socket = useSocket();
  const [stocks, setStocks] = useState<any>({});
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [tradeAmount, setTradeAmount] = useState(1);

  // Initialisation et Écouteurs Socket
  useEffect(() => {
    if (!socket) return;

    // Mise à jour globale (Prix + Classement)
    socket.on('trader:update', (data: any) => {
      setStocks(data.stocks);
      setLeaderboard(data.leaderboard);
    });

    // Mise à jour personnelle
    socket.on('trader:portfolio', (data: any) => {
      setPortfolio(data);
    });

    // Envoyer le nom du joueur si connecté
    if (session?.user?.id) {
        // Petit délai pour assurer que le serveur a créé le joueur
        setTimeout(() => {
            socket.emit('trader:rename', { 
                userId: session.user.id, 
                name: session.user.name || `Trader-${session.user.id.slice(0,4)}` 
            });
        }, 1000);
    }

    return () => {
      socket.off('trader:update');
      socket.off('trader:portfolio');
    };
  }, [socket, session]);

  // Actions
  const handleBuy = () => {
    if (!selectedStock || !session?.user?.id) return;
    socket.emit('trader:buy', { userId: session.user.id, symbol: selectedStock, quantity: tradeAmount });
  };

  const handleSell = () => {
    if (!selectedStock || !session?.user?.id) return;
    socket.emit('trader:sell', { userId: session.user.id, symbol: selectedStock, quantity: tradeAmount });
  };

  if (!stocks || Object.keys(stocks).length === 0) {
    return (
        <div className="h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4 animate-pulse">
                <Activity className="w-12 h-12 text-primary" />
                <h2 className="text-xl font-bold">Connexion au marché...</h2>
            </div>
        </div>
    );
  }

  // Calculs d'affichage
  const currentStock = selectedStock ? stocks[selectedStock] : null;
  const userCash = portfolio?.cash || 0;
  const userNetWorth = portfolio?.netWorth || 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8 flex flex-col gap-6">
      
      {/* HEADER: Stats Joueur */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-4 bg-card border-primary/20">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium uppercase">Cash Disponible</p>
            <h2 className="text-2xl font-bold font-mono">${userCash.toFixed(2)}</h2>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 bg-card border-indigo-500/20">
          <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium uppercase">Fortune Totale</p>
            <h2 className="text-2xl font-bold font-mono">${userNetWorth.toFixed(2)}</h2>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 bg-card border-amber-500/20">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium uppercase">Classement</p>
            <h2 className="text-2xl font-bold">
               #{leaderboard.findIndex((p: any) => p.name === (session?.user?.name || portfolio?.name)) + 1 || '-'}
            </h2>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* COLONNE GAUCHE: Marché */}
        <Card className="lg:col-span-2 flex flex-col overflow-hidden">
          <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary"/> Marché en direct
            </h3>
            <Badge variant="outline" className="animate-pulse bg-green-500/10 text-green-500 border-green-500/20">LIVE</Badge>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.keys(stocks).map(symbol => {
                const stock = stocks[symbol];
                const prevPrice = stock.history[stock.history.length - 2] || stock.price;
                const isUp = stock.price >= prevPrice;
                const isSelected = selectedStock === symbol;

                return (
                  <div 
                    key={symbol}
                    onClick={() => setSelectedStock(symbol)}
                    className={cn(
                        "cursor-pointer rounded-xl border p-4 transition-all duration-200 hover:shadow-lg relative overflow-hidden group",
                        isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h4 className="font-bold text-lg">{symbol}</h4>
                            <p className="text-xs text-muted-foreground">{stock.name}</p>
                        </div>
                        <div className={cn("text-right font-mono", isUp ? "text-green-500" : "text-red-500")}>
                            <div className="text-xl font-bold">${stock.price.toFixed(2)}</div>
                            <div className="text-xs flex items-center justify-end gap-1">
                                {isUp ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
                                {Math.abs(((stock.price - prevPrice)/prevPrice)*100).toFixed(2)}%
                            </div>
                        </div>
                    </div>
                    
                    {/* Mini Visualisation Graphique (Sparkline simulée) */}
                    <div className="h-8 flex items-end gap-1 mt-2 opacity-50">
                        {stock.history.slice(-15).map((p: number, i: number) => (
                            <div 
                                key={i} 
                                className={cn("w-full rounded-t-sm transition-all duration-500", isUp ? "bg-green-500" : "bg-red-500")}
                                style={{ height: `${(p / (Math.max(...stock.history)*1.1)) * 100}%` }}
                            />
                        ))}
                    </div>

                    {/* Holdings Badge */}
                    {portfolio?.holdings[symbol] > 0 && (
                        <div className="absolute top-2 right-2">
                            <Badge variant="secondary" className="text-[10px] h-5">
                                Détenu: {portfolio.holdings[symbol]}
                            </Badge>
                        </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </Card>

        {/* COLONNE DROITE: Action & Leaderboard */}
        <div className="flex flex-col gap-6">
            
            {/* PANEL DE TRADING */}
            <Card className="flex flex-col bg-card border-primary/20 shadow-lg">
                <div className="p-4 border-b bg-primary/5">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <DollarSign className="w-5 h-5"/> Trading
                    </h3>
                </div>
                
                <div className="p-6 space-y-6">
                    {selectedStock ? (
                        <>
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Action sélectionnée</span>
                                    <span className="font-bold text-xl">{stocks[selectedStock].name}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Prix actuel</span>
                                    <span className="font-mono text-lg">${stocks[selectedStock].price.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Vos actions</span>
                                    <span className="font-mono">{portfolio?.holdings[selectedStock] || 0}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">Quantité</label>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" onClick={() => setTradeAmount(Math.max(1, tradeAmount - 1))}>-</Button>
                                    <div className="flex-1 text-center font-mono text-lg font-bold bg-muted/50 py-2 rounded">{tradeAmount}</div>
                                    <Button variant="outline" size="icon" onClick={() => setTradeAmount(tradeAmount + 1)}>+</Button>
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground px-1">
                                    <span>Total: ${ (stocks[selectedStock].price * tradeAmount).toFixed(2) }</span>
                                    <span className="text-primary cursor-pointer hover:underline" onClick={() => setTradeAmount(10)}>x10</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Button 
                                    variant="default" 
                                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                                    onClick={handleBuy}
                                    disabled={userCash < stocks[selectedStock].price * tradeAmount}
                                >
                                    ACHETER
                                </Button>
                                <Button 
                                    variant="default" 
                                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                                    onClick={handleSell}
                                    disabled={!portfolio?.holdings[selectedStock] || portfolio.holdings[selectedStock] < tradeAmount}
                                >
                                    VENDRE
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <ArrowRight className="w-10 h-10 mx-auto mb-2 opacity-20"/>
                            <p>Sélectionnez une action sur le marché pour commencer à trader.</p>
                        </div>
                    )}
                </div>
            </Card>

            {/* LEADERBOARD */}
            <Card className="flex-1 flex flex-col min-h-0 bg-card/50">
                <div className="p-4 border-b">
                    <h3 className="font-bold flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-500"/> Top Traders
                    </h3>
                </div>
                <ScrollArea className="flex-1">
                    <div className="divide-y divide-border/50">
                        {leaderboard.map((player, index) => (
                            <div key={index} className={cn("p-3 flex justify-between items-center", player.name === (session?.user?.name || portfolio?.name) && "bg-primary/10")}>
                                <div className="flex items-center gap-3">
                                    <span className={cn(
                                        "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold",
                                        index === 0 ? "bg-amber-500 text-white" : 
                                        index === 1 ? "bg-slate-400 text-white" :
                                        index === 2 ? "bg-orange-700 text-white" : "bg-muted text-muted-foreground"
                                    )}>
                                        {index + 1}
                                    </span>
                                    <span className="text-sm font-medium truncate max-w-[120px]">{player.name}</span>
                                </div>
                                <span className="font-mono text-sm font-bold">${player.netWorth.toFixed(0)}</span>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </Card>
        </div>

      </div>
    </div>
  );
}