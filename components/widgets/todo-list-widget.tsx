"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Check,
  Plus,
  Trash2,
  Circle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Flag,
  Sparkles,
  Edit3,
  ArrowUpDown,
  MoreVertical,
  Calendar,
  Tag,
  X,
  RefreshCw,
  Copy,
  Hash
} from "lucide-react";
import type { Widget } from "@/lib/db/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface TodoListWidgetProps {
  widget: Widget;
}

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  createdAt: number;
  tags: string[];
  category: string;
}

type SortMode = "recent" | "priority" | "alpha";

export function TodoListWidget({ widget }: TodoListWidgetProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [hoveredTodoId, setHoveredTodoId] = useState<string | null>(null);
  const [newTodo, setNewTodo] = useState("");
  const [newPriority, setNewPriority] = useState<Todo["priority"]>("medium");
  const [categories, setCategories] = useState<string[]>(["Général"]);
  const [activeCategory, setActiveCategory] = useState<string>("Général");
  const [sortMode, setSortMode] = useState<SortMode>("recent");

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPriority, setEditPriority] = useState<Todo["priority"]>("medium");
  const [editTags, setEditTags] = useState("");
  const [editCategory, setEditCategory] = useState<string>("Général");

  // copy indicator
  const [copiedTodoId, setCopiedTodoId] = useState<string | null>(null);

  // AI & Export State
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  
  // AI Customization Options
  const [aiScope, setAiScope] = useState<'active'|'completed'|'all'>('active'); // Default to active only
  const [aiShowIds, setAiShowIds] = useState(false); // Default hidden
  const [aiShowTags, setAiShowTags] = useState(true);
  const [aiTagFilter, setAiTagFilter] = useState<string>("all_tags"); // "all_tags" or specific tag

  const isCompact = widget.w <= 2 && widget.h <= 2;

  // Load initial todos
  useEffect(() => {
    const raw: any = widget.options?.todos || [];
    const mapped: Todo[] = (raw as any[]).map((t: any) => ({
      id: t.id ?? Date.now().toString() + Math.random().toString(36).slice(2, 7),
      text: t.text ?? t.title ?? "",
      completed: !!t.completed,
      priority: (t.priority as Todo["priority"]) || "medium",
      createdAt: t.createdAt || Date.now(),
      tags: Array.isArray(t.tags) ? t.tags : (typeof t.tags === "string" ? t.tags.split(",").map((s: string) => s.trim()).filter(Boolean) : []),
      category: t.category || "Général",
    }));

    const discovered = new Set(categories);
    mapped.forEach((m) => discovered.add(m.category || "Général"));
    setCategories(Array.from(discovered));
    setTodos(mapped);
    if (!mapped.some((t) => t.category === activeCategory)) setActiveCategory("Général");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.options]);

  // Auto-save
  useEffect(() => {
    const save = async () => {
      try {
        const { updateWidget } = await import("@/lib/actions/widgets");
        await updateWidget(widget.id, {
          options: {
            ...widget.options,
            todos,
          },
        });
      } catch (err) {
        console.error("Error saving todos:", err);
      }
    };
    const t = setTimeout(save, 800);
    return () => clearTimeout(t);
  }, [todos, widget.id]);

  // Extract all unique tags for the filter dropdown
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    todos.forEach(t => t.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [todos]);

  const parseTagsFromText = (text: string) => {
    const found = text.match(/#([\p{L}\w-]+)/gu);
    if (!found) return { cleaned: text, tags: [] as string[] };
    const tags = found.map((t) => t.slice(1));
    const cleaned = text.replace(/#([\p{L}\w-]+)/gu, "").trim();
    return { cleaned, tags };
  };

  const addTodo = () => {
    const raw = newTodo.trim();
    if (!raw) return;

    const { cleaned, tags } = parseTagsFromText(raw);
    const todo: Todo = {
      id: Date.now().toString(),
      text: cleaned,
      completed: false,
      priority: newPriority,
      createdAt: Date.now(),
      tags,
      category: activeCategory || "Général",
    };
    setTodos((prev) => [...prev, todo]);
    setNewTodo("");
    setNewPriority("medium");
    if (!categories.includes(todo.category)) setCategories((prev) => [...prev, todo.category]);
  };

  const toggleTodo = (id: string) => setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  const deleteTodo = (id: string) => setTodos((prev) => prev.filter((t) => t.id !== id));

  const openEdit = (t: Todo) => {
    setEditingTodo(t);
    setEditTitle(t.text);
    setEditPriority(t.priority);
    setEditTags(t.tags.join(", "));
    setEditCategory(t.category);
    setEditOpen(true);
  };

  const saveEdit = () => {
    if (!editingTodo) return;
    const updated: Todo = {
      ...editingTodo,
      text: editTitle.trim() || editingTodo.text,
      priority: editPriority,
      tags: editTags.split(",").map((s) => s.trim()).filter(Boolean),
      category: editCategory || "Général",
    };
    setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    if (!categories.includes(updated.category)) setCategories((prev) => [...prev, updated.category]);
    setEditOpen(false);
    setEditingTodo(null);
  };

  // Categories logic
  const addCategory = () => {
    const name = prompt("Nom de la nouvelle catégorie :");
    if (!name) return;
    if (categories.includes(name)) return alert("Catégorie déjà existante");
    setCategories((prev) => [...prev, name]);
    setActiveCategory(name);
  };

  const removeCategory = (name: string) => {
    const has = todos.some((t) => t.category === name);
    if (has) return alert("Impossible de supprimer une catégorie non vide.");
    if (name === "Général") return alert('La catégorie "Général" ne peut pas être supprimée.');
    setCategories((prev) => prev.filter((c) => c !== name));
    if (activeCategory === name) setActiveCategory("Général");
  };

  // Sorting
  const sortTodos = (list: Todo[]) => {
    switch (sortMode) {
      case "recent": return [...list].sort((a, b) => b.createdAt - a.createdAt);
      case "priority": {
        const order: any = { high: 3, medium: 2, low: 1 };
        return [...list].sort((a, b) => order[b.priority] - order[a.priority] || b.createdAt - a.createdAt);
      }
      case "alpha": return [...list].sort((a, b) => a.text.localeCompare(b.text));
      default: return list;
    }
  };

  const visible = useMemo(() => {
    return sortTodos(todos.filter((t) => (t.category || "Général") === activeCategory));
  }, [todos, activeCategory, sortMode]);

  // UI Helpers
  const cyclePriority = () => {
    const map: Record<string, Todo['priority']> = { low: 'medium', medium: 'high', high: 'low' };
    setNewPriority(map[newPriority]);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-500 bg-red-500/10 border-red-500/20";
      case "medium": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "low": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      default: return "text-slate-500 bg-slate-500/10";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high": return <AlertCircle className="h-4 w-4" />;
      case "medium": return <Clock className="h-4 w-4" />;
      case "low": return <Flag className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };

  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // AI & Export Logic
  const copyTodoText = async (todo: Todo) => {
    try {
      await navigator.clipboard.writeText(todo.text);
      setCopiedTodoId(todo.id);
      setTimeout(() => setCopiedTodoId((id) => (id === todo.id ? null : id)), 1500);
    } catch (err) { console.error("Copy failed", err); }
  };

  const fetchAiPrompt = useCallback(async () => {
    setAiLoading(true);
    try {
      const params = new URLSearchParams();
      // Scope filter
      if (aiScope) params.set('only', aiScope);
      
      // Tag filter
      if (aiTagFilter && aiTagFilter !== 'all_tags') params.set('tag', aiTagFilter);
      
      // Display toggles
      params.set('showIds', aiShowIds ? 'true' : 'false');
      params.set('showTags', aiShowTags ? 'true' : 'false');

      const url = `/api/widgets/${widget.id}/export-ai${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch AI prompt');
      const data = await res.json();
      setAiPrompt(data.prompt || '');
    } catch (err) {
      console.error('Error fetching AI prompt', err);
      setAiPrompt("Erreur lors de la génération.");
    } finally {
      setAiLoading(false);
    }
  }, [widget.id, aiScope, aiTagFilter, aiShowIds, aiShowTags]);

  // Refresh prompt when options change IF dialog is open
  useEffect(() => {
    if (aiDialogOpen) {
        const timeout = setTimeout(fetchAiPrompt, 300); // Debounce slighty
        return () => clearTimeout(timeout);
    }
  }, [aiDialogOpen, fetchAiPrompt]);

  return (
    <Card className="w-full h-full flex flex-col overflow-hidden bg-background/50 border-0 shadow-none">
      
      {/* HEADER AVEC PROGRESS BAR */}
      <div className="flex flex-col border-b bg-card/50">
        <div className="p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
             <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <CheckCircle2 className="h-5 w-5" />
             </div>
             <div className="flex flex-col min-w-0">
                <h3 className="font-semibold text-sm truncate leading-tight">
                  {widget.options?.title || "Mes Tâches"}
                </h3>
                <span className="text-[10px] text-muted-foreground truncate">
                   {completedCount}/{totalCount} terminées
                </span>
             </div>
          </div>

          <div className="flex items-center gap-1">
             <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setAiDialogOpen(true)} title="Générateur de Prompt">
               <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
             </Button>
             
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortMode("recent")}>
                   <Calendar className="mr-2 h-3.5 w-3.5" /> Récents
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortMode("priority")}>
                   <AlertCircle className="mr-2 h-3.5 w-3.5" /> Priorité
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortMode("alpha")}>
                   <ArrowUpDown className="mr-2 h-3.5 w-3.5" /> Alphabétique
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={addCategory}>
                   <Plus className="mr-2 h-3.5 w-3.5" /> Créer catégorie
                </DropdownMenuItem>
              </DropdownMenuContent>
             </DropdownMenu>
          </div>
        </div>
        
        <div className="h-0.5 w-full bg-muted overflow-hidden">
           <div 
             className="h-full bg-primary transition-all duration-700 ease-out"
             style={{ width: `${progress}%` }}
           />
        </div>
      </div>

      {/* TABS CATEGORIES */}
      <div className="px-2 pt-2 bg-muted/5">
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList className="flex w-full justify-start gap-1 bg-transparent p-0 h-auto overflow-x-auto scrollbar-hide">
            {categories.map((cat) => (
              <div key={cat} className="group/tab relative flex items-center">
                <TabsTrigger 
                  value={cat} 
                  className="text-xs h-7 rounded-full border border-transparent data-[state=active]:bg-background data-[state=active]:border-border data-[state=active]:shadow-sm px-3"
                >
                  {cat}
                </TabsTrigger>
                {cat !== "Général" && activeCategory === cat && (
                  <button
                    onClick={(e) => {
                        e.stopPropagation(); 
                        if (confirm(`Supprimer "${cat}" ?`)) removeCategory(cat);
                    }}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-3 w-3 flex items-center justify-center opacity-0 group-hover/tab:opacity-100 transition-opacity text-[8px]"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* CONTENT LIST */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground opacity-60">
              <div className="bg-muted p-3 rounded-full mb-3">
                 <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-xs font-medium">Tout est propre ici !</p>
              <p className="text-[10px]">Ajoutez une tâche ci-dessous.</p>
            </div>
          ) : (
            visible.map((todo) => (
              <div
                key={todo.id}
                onMouseEnter={() => setHoveredTodoId(todo.id)}
                onMouseLeave={() => setHoveredTodoId((id) => (id === todo.id ? null : id))}
                className={cn(
                  "relative flex items-start gap-3 p-2.5 rounded-xl border bg-card/80 hover:bg-card hover:shadow-sm transition-all duration-200",
                  todo.completed && "opacity-60 bg-muted/30 border-transparent"
                )}
                tabIndex={0}
              >
                <button 
                  onClick={() => toggleTodo(todo.id)} 
                  className={cn(
                      "shrink-0 mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      todo.completed ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 hover:border-primary"
                  )}
                >
                  {todo.completed && <Check className="h-3 w-3" />}
                </button>

                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                            "text-sm font-medium leading-tight break-words cursor-pointer select-none",
                            todo.completed && "line-through text-muted-foreground"
                        )}
                        onDoubleClick={() => copyTodoText(todo)}
                      >
                        {todo.text}
                      </p>
                  </div>

                  <div className="flex items-center flex-wrap gap-1.5 min-h-[16px]">
                    <Badge variant="outline" className={cn("text-[9px] h-4 px-1 gap-1 border-0 rounded-[4px]", getPriorityColor(todo.priority))}>
                      {getPriorityIcon(todo.priority)}
                      <span className="uppercase font-bold tracking-wider">{todo.priority === 'medium' ? 'Moyen' : todo.priority === 'high' ? 'Haut' : 'Bas'}</span>
                    </Badge>

                    {todo.tags.map((tag) => (
                      <span key={tag} className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-[4px] flex items-center gap-0.5">
                        # {tag}
                      </span>
                    ))}
                    
                    {copiedTodoId === todo.id && <span className="text-[9px] text-green-500 font-bold ml-auto animate-in fade-in slide-in-from-left-1">Copié !</span>}
                  </div>
                </div>

                <div className={cn(
                  "absolute right-2 bottom-2 flex gap-1 transition-opacity bg-card/80 backdrop-blur-sm rounded-md shadow-sm border p-0.5",
                  hoveredTodoId === todo.id ? "opacity-100" : "opacity-0 pointer-events-none"
                )}>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm hover:text-primary" onClick={() => openEdit(todo)}>
                    <Edit3 className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm hover:text-destructive" onClick={() => {
                     if (confirm('Supprimer cette tâche ?')) deleteTodo(todo.id);
                  }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* INPUT BAR */}
      <div className="p-3 border-t bg-card/30">
        <div className="relative flex items-center gap-2">
          <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
             <button 
                onClick={cyclePriority}
                className={cn("h-6 w-6 flex items-center justify-center rounded-full transition-all hover:scale-110", getPriorityColor(newPriority))}
                title={`Priorité : ${newPriority} (Cliquer pour changer)`}
             >
                {getPriorityIcon(newPriority)}
             </button>
          </div>
          <Input 
            value={newTodo} 
            onChange={(e) => setNewTodo(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && addTodo()} 
            placeholder="Nouvelle tâche... #tag" 
            className="pl-10 pr-10 h-10 shadow-sm bg-background/80" 
          />
          <Button onClick={addTodo} size="icon" className="h-8 w-8 absolute right-1 rounded-full shadow-sm hover:scale-105 transition-transform">
             <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier la tâche</DialogTitle>
          </DialogHeader>
          {/* ...Formulaire Edit inchangé... */}
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Titre</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="font-medium" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Priorité</label>
                <div className="flex gap-1 p-1 bg-muted rounded-md">
                   {(['low', 'medium', 'high'] as const).map(p => (
                      <button 
                        key={p}
                        onClick={() => setEditPriority(p)}
                        className={cn(
                           "flex-1 py-1.5 text-xs rounded-sm transition-all flex items-center justify-center gap-1",
                           editPriority === p ? "bg-background shadow-sm font-medium text-foreground" : "text-muted-foreground hover:bg-background/50"
                        )}
                      >
                         {getPriorityIcon(p)}
                         <span className="capitalize">{p === 'medium' ? 'Moy' : p === 'high' ? 'Haut' : 'Bas'}</span>
                      </button>
                   ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Catégorie</label>
                <Select value={editCategory} onValueChange={(v: any) => setEditCategory(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                 <Tag className="w-3 h-3"/> Tags <span className="text-[10px] font-normal opacity-50">(séparés par virgules)</span>
              </label>
              <Input value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="ex: work, urgent" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button onClick={saveEdit}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Dialog (NOUVEAU DESIGN DE CONFIGURATION) */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-3xl flex flex-col h-[80vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="w-5 h-5 text-indigo-500"/> 
                Générateur de Prompt IA
            </DialogTitle>
            <DialogDescription>
                Configurez les données à inclure dans le prompt pour votre assistant.
            </DialogDescription>
          </DialogHeader>

          {/* Configuration Panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 border rounded-lg shrink-0">
             
             {/* Col 1: Scope */}
             <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Tâches à inclure</Label>
                <Select value={aiScope} onValueChange={(v: any) => setAiScope(v)}>
                    <SelectTrigger className="h-9 bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="active">En cours uniquement</SelectItem>
                        <SelectItem value="completed">Terminées uniquement</SelectItem>
                        <SelectItem value="all">Toutes les tâches</SelectItem>
                    </SelectContent>
                </Select>
             </div>

             {/* Col 2: Tags Filter */}
             <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Filtrer par Tag</Label>
                <Select value={aiTagFilter} onValueChange={setAiTagFilter}>
                    <SelectTrigger className="h-9 bg-background">
                         <div className="flex items-center gap-2 truncate">
                             <Hash className="w-3.5 h-3.5 opacity-50"/>
                             <span>{aiTagFilter === 'all_tags' ? 'Tous les tags' : aiTagFilter}</span>
                         </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all_tags">Tous les tags</SelectItem>
                        {availableTags.map(tag => (
                            <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
             </div>

             {/* Col 3: Toggles */}
             <div className="space-y-3 flex flex-col justify-center">
                 <div className="flex items-center justify-between">
                    <Label htmlFor="show-ids" className="cursor-pointer text-sm">Afficher les IDs</Label>
                    <Switch id="show-ids" checked={aiShowIds} onCheckedChange={setAiShowIds} className="scale-75 origin-right"/>
                 </div>
                 <div className="flex items-center justify-between">
                    <Label htmlFor="show-tags" className="cursor-pointer text-sm">Afficher les tags</Label>
                    <Switch id="show-tags" checked={aiShowTags} onCheckedChange={setAiShowTags} className="scale-75 origin-right"/>
                 </div>
             </div>
          </div>

          {/* Prompt Result */}
          <div className="flex-1 min-h-0 bg-muted rounded-lg border relative group">
             {aiLoading && (
                 <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                     <RefreshCw className="w-6 h-6 animate-spin text-primary"/>
                 </div>
             )}
             <Textarea 
                value={aiPrompt || ''} 
                readOnly 
                className="w-full h-full resize-none bg-transparent border-0 font-mono text-xs p-4 focus-visible:ring-0" 
             />
          </div>

          <DialogFooter className="shrink-0 flex items-center justify-between gap-2 sm:justify-between">
             <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                {aiLoading ? "Génération en cours..." : "Mis à jour automatiquement"}
             </div>
             <div className="flex gap-2">
                <Button variant="outline" onClick={() => setAiDialogOpen(false)}>Fermer</Button>
                <Button onClick={() => {
                    navigator.clipboard.writeText(aiPrompt || '');
                }} className="gap-2">
                    <Copy className="w-4 h-4"/> Copier
                </Button>
             </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}