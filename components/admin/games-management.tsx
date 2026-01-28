"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getAllGameScores, getGameStats, addScoreToUser, updateScore, deleteScore, deleteUserGameScores, clearGameScores, adjustMoneyMakerCash } from "@/lib/actions/game-scores";
import { Trash2, Plus, Edit2, Zap, BarChart3, Gamepad2, RefreshCw, AlertTriangle, DollarSign } from "lucide-react";

const GAMES = [
  { id: "snake", name: "🐍 Snake", color: "from-green-500 to-emerald-600" },
  { id: "2048", name: "🔢 2048", color: "from-amber-500 to-orange-600" },
  { id: "tetris", name: "🧱 Tetris", color: "from-purple-500 to-pink-600" },
  { id: "pacman", name: "👻 Pac-Man", color: "from-yellow-500 to-red-600" },
  { id: "moneymaker", name: "💰 MoneyMaker", color: "from-green-600 to-emerald-700" },
];

interface GameScore {
  id: string;
  userId: string;
  userName: string;
  score: number;
  metadata?: Record<string, any> | null;
  createdAt: Date;
}

interface GameStats {
  totalPlayers: number;
  totalScores: number;
  highestScore: number;
  averageScore: number;
  lowestScore: number;
}

export default function GamesManagementAdmin() {
  const [selectedGame, setSelectedGame] = useState("snake");
  const [scores, setScores] = useState<GameScore[]>([]);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  
  // Edit state
  const [editingScore, setEditingScore] = useState<GameScore | null>(null);
  const [editValue, setEditValue] = useState(0);
  const [showAddScore, setShowAddScore] = useState(false);
  const [newScore, setNewScore] = useState({ userId: "", score: 0 });
  
  // MoneyMaker adjustment
  const [showMoneyAdjust, setShowMoneyAdjust] = useState(false);
  const [moneyMakerUser, setMoneyMakerUser] = useState("");
  const [moneyMakerAmount, setMoneyMakerAmount] = useState(0);
  const [moneyMakerReason, setMoneyMakerReason] = useState("");

  // Load data
  useEffect(() => {
    loadGameData();
    loadUsers();
  }, [selectedGame]);

  const loadGameData = async () => {
    setLoading(true);
    try {
      const [scoresData, statsData] = await Promise.all([
        getAllGameScores(selectedGame),
        getGameStats(selectedGame),
      ]);
      setScores((scoresData as GameScore[]) || []);
      setStats(statsData as GameStats);
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) setUsers(await res.json());
    } catch (error) {
      console.error("Erreur users:", error);
    }
  };

  const handleAddScore = async () => {
    if (!newScore.userId) {
      alert("Sélectionner un joueur");
      return;
    }
    setSubmitting(true);
    try {
      await addScoreToUser(newScore.userId, selectedGame, newScore.score);
      alert("✅ Score ajouté");
      setShowAddScore(false);
      setNewScore({ userId: "", score: 0 });
      await loadGameData();
    } catch (error) {
      console.error("Erreur:", error);
      alert("❌ Erreur lors de l'ajout");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateScore = async (scoreId: string, newValue: number) => {
    setSubmitting(true);
    try {
      await updateScore(scoreId, newValue);
      alert("✅ Score modifié");
      setEditingScore(null);
      await loadGameData();
    } catch (error) {
      console.error("Erreur:", error);
      alert("❌ Erreur lors de la modification");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteScore = async (scoreId: string, userName: string) => {
    if (!confirm(`Supprimer le score de ${userName}?`)) return;
    setSubmitting(true);
    try {
      await deleteScore(scoreId);
      alert("✅ Score supprimé");
      await loadGameData();
    } catch (error) {
      console.error("Erreur:", error);
      alert("❌ Erreur lors de la suppression");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUserScores = async (userId: string, userName: string) => {
    if (!confirm(`Supprimer TOUS les scores de ${userName} pour ce jeu?`)) return;
    setSubmitting(true);
    try {
      await deleteUserGameScores(userId, selectedGame);
      alert("✅ Scores supprimés");
      await loadGameData();
    } catch (error) {
      console.error("Erreur:", error);
      alert("❌ Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearAllScores = async () => {
    if (!confirm(`⚠️ ATTENTION: Supprimer TOUS les scores de ${GAMES.find(g => g.id === selectedGame)?.name}? CETTE ACTION EST IRRÉVERSIBLE`)) return;
    setSubmitting(true);
    try {
      await clearGameScores(selectedGame);
      alert("✅ Classement vidé");
      await loadGameData();
    } catch (error) {
      console.error("Erreur:", error);
      alert("❌ Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoneyAdjustment = async () => {
    if (!moneyMakerUser || moneyMakerAmount === 0) {
      alert("Sélectionner un trader et un montant");
      return;
    }
    setSubmitting(true);
    try {
      await adjustMoneyMakerCash(moneyMakerUser, moneyMakerAmount, moneyMakerReason || "Ajustement admin");
      alert(`✅ ${moneyMakerAmount > 0 ? "+" : ""}${moneyMakerAmount}$ appliqué`);
      setShowMoneyAdjust(false);
      setMoneyMakerUser("");
      setMoneyMakerAmount(0);
      setMoneyMakerReason("");
      await loadGameData();
    } catch (error) {
      console.error("Erreur:", error);
      alert("❌ Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const currentGame = GAMES.find(g => g.id === selectedGame);

  // ===== MONEYMAKER VIEW =====
  if (selectedGame === "moneymaker") {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`bg-gradient-to-r ${currentGame?.color} p-3 rounded-lg`}>
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">💰 MoneyMaker</h1>
              <p className="text-sm text-muted-foreground">Gestion des traders et liquidités</p>
            </div>
          </div>
          <Button onClick={loadGameData} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Rafraîchir
          </Button>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Traders Actifs</p>
                  <p className="text-3xl font-bold text-blue-500">{stats.totalPlayers}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Net Worth Max</p>
                  <p className="text-2xl font-bold text-green-500">${(stats.highestScore || 0).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Moyenne</p>
                  <p className="text-2xl font-bold text-amber-500">${Math.round(stats.averageScore || 0).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Net Worth Min</p>
                  <p className="text-2xl font-bold text-red-500">${(stats.lowestScore || 0).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Sessions</p>
                  <p className="text-3xl font-bold text-purple-500">{stats.totalScores}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Adjustment Panel */}
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="border-b border-amber-500/20">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-500" />
                Ajustement Liquidités
              </CardTitle>
              <Dialog open={showMoneyAdjust} onOpenChange={setShowMoneyAdjust}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                    <Zap className="w-4 h-4 mr-2" />
                    Ajouter/Retirer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ajuster les liquidités</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Select value={moneyMakerUser} onValueChange={setMoneyMakerUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un trader" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {scores.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">Aucun trader</div>
                        ) : (
                          scores.map(s => (
                            <SelectItem key={s.userId} value={s.userId}>
                              {s.userName} • ${s.score.toLocaleString()}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Montant (+ ou -)"
                      value={moneyMakerAmount || ""}
                      onChange={(e) => setMoneyMakerAmount(parseInt(e.target.value) || 0)}
                    />
                    <Input
                      type="text"
                      placeholder="Raison (optionnel)"
                      value={moneyMakerReason}
                      onChange={(e) => setMoneyMakerReason(e.target.value)}
                    />
                    <Button
                      onClick={handleMoneyAdjustment}
                      disabled={submitting}
                      className="w-full bg-amber-600 hover:bg-amber-700"
                    >
                      {submitting ? "Traitement..." : "Appliquer l'ajustement"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
        </Card>

        {/* Leaderboard */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Top 50 Traders
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin">⏳</div>
              </div>
            ) : scores.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun trader n'a encore joué
              </div>
            ) : (
              <div className="space-y-2">
                {scores.slice(0, 50).map((score, idx) => (
                  <div
                    key={score.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-border/50"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <Badge variant="outline" className="shrink-0">
                        #{idx + 1}
                      </Badge>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{score.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(score.createdAt).toLocaleDateString("fr-FR", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-bold text-green-500 w-32 text-right">
                        ${score.score.toLocaleString()}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUserScores(score.userId, score.userName)}
                        disabled={submitting}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== STANDARD GAMES VIEW =====
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className={`bg-gradient-to-r ${currentGame?.color} p-3 rounded-lg`}>
            <Gamepad2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{currentGame?.name || "Jeux"}</h1>
            <p className="text-sm text-muted-foreground">Gestion des scores et classements</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedGame} onValueChange={setSelectedGame}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sélectionner un jeu" />
            </SelectTrigger>
            <SelectContent>
              {GAMES.map(game => (
                <SelectItem key={game.id} value={game.id}>
                  {game.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={loadGameData} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Joueurs</p>
                <p className="text-2xl md:text-3xl font-bold text-blue-500">{stats.totalPlayers}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Meilleur</p>
                <p className="text-2xl md:text-3xl font-bold text-yellow-500">{stats.highestScore?.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Moyen</p>
                <p className="text-2xl md:text-3xl font-bold text-green-500">
                  {Math.round(stats.averageScore || 0).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Minimum</p>
                <p className="text-2xl md:text-3xl font-bold text-red-500">{stats.lowestScore?.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Total</p>
                <p className="text-2xl md:text-3xl font-bold text-purple-500">{stats.totalScores}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Dialog open={showAddScore} onOpenChange={setShowAddScore}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Ajouter un score
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un score pour {currentGame?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={newScore.userId} onValueChange={v => setNewScore({ ...newScore, userId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un joueur" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {users.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">Aucun utilisateur</div>
                  ) : (
                    users.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Score"
                value={newScore.score || ""}
                onChange={e => setNewScore({ ...newScore, score: parseInt(e.target.value) || 0 })}
              />
              <Button onClick={handleAddScore} disabled={submitting} className="w-full">
                {submitting ? "Ajout en cours..." : "Ajouter"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button
          variant="destructive"
          onClick={handleClearAllScores}
          disabled={submitting}
          className="gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Clear le classement
        </Button>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Classement Complet
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin text-2xl">⏳</div>
            </div>
          ) : scores.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Aucun joueur n'a encore lancé une partie</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-3 font-semibold text-muted-foreground">Rang</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Joueur</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground">Score</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Date</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((score, idx) => (
                    <tr
                      key={score.id}
                      className="border-b border-border/30 hover:bg-muted/50 transition-colors"
                    >
                      <td className="p-3">
                        <Badge variant="outline" className="font-bold">
                          #{idx + 1}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <p className="font-medium">{score.userName}</p>
                      </td>
                      <td className="p-3 text-right">
                        {editingScore?.id === score.id ? (
                          <Input
                            type="number"
                            value={editValue}
                            onChange={e => setEditValue(parseInt(e.target.value) || 0)}
                            className="w-24 ml-auto"
                            autoFocus
                          />
                        ) : (
                          <span className="font-bold text-lg">{score.score.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(score.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex gap-1 justify-end">
                          {editingScore?.id === score.id ? (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleUpdateScore(score.id, editValue)}
                                disabled={submitting}
                              >
                                ✓
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingScore(null)}
                                disabled={submitting}
                              >
                                ✕
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingScore(score);
                                  setEditValue(score.score);
                                }}
                                disabled={submitting}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteScore(score.id, score.userName)}
                                disabled={submitting}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
