'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useConfirm, usePrompt, useAlert } from '@/components/ui/confirm-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  Plus,
  Trash2,
  Circle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Flag,
  Eye,
  EyeOff,
  ArrowUpDown,
  Filter,
  Sparkles,
  RefreshCw,
  Copy,
  Hash,
  X,
  Edit3,
  Tag
} from 'lucide-react';
import type { Widget } from '@/lib/db/schema';

interface TodoListWidgetProps {
  widget: Widget;
}

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
  tags: string[];
  category?: string;
}

type SortMode = 'recent' | 'priority' | 'alpha';

export function TodoListWidget({ widget }: TodoListWidgetProps) {
  // --- STATE PRINCIPAL ---
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // --- STATE AFFICHAGE & FILTRES ---
  const [showCompleted, setShowCompleted] = useState<boolean>(() => {
    return widget.options.showCompleted !== undefined ? widget.options.showCompleted : true;
  });
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [tagFilter, setTagFilter] = useState<string | 'all'>('all');

  // --- STATE MODIFICATION ---
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editText, setEditText] = useState('');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [editTags, setEditTags] = useState('');
  const [editCompleted, setEditCompleted] = useState(false);

  // --- STATE AI PROMPT ---
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState<string | null>('');
  const [aiLoading, setAiLoading] = useState(false);

  // Legacy dialog compatibility states (from older file)
  const [categories, setCategories] = useState<string[]>(['Général']);
  const [activeCategory, setActiveCategory] = useState<string>('Général');
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('Général');
  const [copiedTodoId, setCopiedTodoId] = useState<string | null>(null);
  const confirmDialog = useConfirm();
  const promptDialog = usePrompt();
  const alertDialog = useAlert();

  // AI dialog finer options (old design)
  const [aiScope, setAiScope] = useState<'active'|'completed'|'all'>('active');
  const [aiShowIds, setAiShowIds] = useState(false);
  const [aiShowTags, setAiShowTags] = useState(true);
  const [aiTagFilter, setAiTagFilter] = useState<string>('all_tags');
  const [tagSearch, setTagSearch] = useState('');

  // Hover tracking so action buttons show only for the hovered todo
  const [hoveredTodoId, setHoveredTodoId] = useState<string | null>(null);
  const isCompact = widget.w <= 2 && widget.h <= 2;

  // Chargement initial
  useEffect(() => {
    if (widget.options.todos) {
      setTodos(widget.options.todos as Todo[]);
    }
  }, [widget.options]);

  // Populate categories from incoming todos if available
  useEffect(() => {
    try {
      const raw: any = widget.options?.todos || [];
      const mapped: any[] = Array.isArray(raw) ? raw : [];
      const discovered = new Set(categories);
      mapped.forEach((t: any) => discovered.add(t.category || 'Général'));
      setCategories(Array.from(discovered));
    } catch (e) {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.options]);

  const addCategory = async () => {
    const name = await promptDialog("Nom de la nouvelle catégorie :", "");
    if (!name) return;
    if (categories.includes(name)) {
      await alertDialog("Catégorie déjà existante");
      return;
    }
    setCategories((prev) => [...prev, name]);
    setActiveCategory(name);
  };

  const removeCategory = async (name: string) => {
    const has = todos.some((t) => t.category === name);
    if (has) {
      await alertDialog("Impossible de supprimer une catégorie non vide.");
      return;
    }
    if (name === "Général") {
      await alertDialog('La catégorie "Général" ne peut pas être supprimée.');
      return;
    }
    const ok = await confirmDialog(`Supprimer la catégorie "${name}" ?`);
    if (!ok) return;
    setCategories((prev) => prev.filter((c) => c !== name));
    if (activeCategory === name) setActiveCategory('Général');
  };

  const renameCategory = async (oldName: string) => {
    const name = await promptDialog(`Nouveau nom pour "${oldName}" :`, oldName);
    if (!name || name.trim() === '' || name === oldName) return;
    if (categories.includes(name)) {
      await alertDialog('Une catégorie porte déjà ce nom.');
      return;
    }
    setCategories((prev) => prev.map(c => c === oldName ? name : c));
    setTodos((prev) => prev.map(t => ({ ...t, category: t.category === oldName ? name : t.category })));
    if (activeCategory === oldName) setActiveCategory(name);
  };

  // Sauvegarde automatique des todos
  useEffect(() => {
    const saveTodos = async () => {
      try {
        const { updateWidget } = await import('@/lib/actions/widgets');
        await updateWidget(widget.id, {
          options: { ...widget.options, todos },
        }, true); // skipRevalidation = true pour éviter POST /dashboard excessifs
      } catch (error) {
        console.error('Error saving todos:', error);
      }
    };
    const timer = setTimeout(saveTodos, 1000);
    return () => clearTimeout(timer);
  }, [todos, widget.id, widget.options]);

  // Sauvegarde automatique de showCompleted
  useEffect(() => {
    const saveShowCompleted = async () => {
      try {
        const { updateWidget } = await import('@/lib/actions/widgets');
        await updateWidget(widget.id, {
          options: { ...widget.options, showCompleted },
        }, true);
      } catch (error) {
        console.error('Error saving showCompleted:', error);
      }
    };
    const timer = setTimeout(saveShowCompleted, 500);
    return () => clearTimeout(timer);
  }, [showCompleted, widget.id, widget.options]);

  // --- LOGIQUE METIER ---

  const parseTodoText = (input: string) => {
    const tagRegex = /#([\wÀ-ÿ-]+)/g;
    const tags = (input.match(tagRegex) || []).map(t => t.replace('#', ''));
    const cleanText = input.replace(tagRegex, '').trim();
    return { text: cleanText || input, tags };
  };

  const copyTodoText = async (todo: Todo) => {
    try {
      await navigator.clipboard.writeText(todo.text);
      setCopiedTodoId(todo.id);
      setTimeout(() => setCopiedTodoId((id) => (id === todo.id ? null : id)), 1500);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  const addTodo = () => {
    if (!newTodo.trim()) return;
    const { text, tags } = parseTodoText(newTodo);
    const todo: Todo = {
      id: Date.now().toString(),
      text,
      completed: false,
      priority,
      createdAt: Date.now(),
      tags,
      category: activeCategory || 'Général',
    };
    setTodos([...todos, todo]);
    setNewTodo('');
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map((t) => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter((t) => t.id !== id));
  };

  // --- LOGIQUE MODIFICATION ---
  
  const openEdit = (todo: Todo) => {
    // Open the older full edit dialog by default
    setEditingTodo(todo);
    setEditTitle(todo.text);
    setEditPriority(todo.priority);
    setEditTags((todo.tags || []).join(', '));
    setEditCategory((todo as any).category || 'Général');
    setEditOpen(true);
    // keep inline editor fields synced for fallback
    setEditText(todo.text);
    setEditCompleted(todo.completed);
    setEditPriority(todo.priority);
    setEditDialogOpen(false);
  };

  const saveEdit = () => {
    // Support both edit dialog variants: old `editOpen` (title/tags/category) and new `editDialogOpen` (inline)
    if (!editingTodo) return;

    if (editOpen) {
      // Old dialog style
      const updated: Todo = {
        ...editingTodo,
        text: editTitle.trim() || editingTodo.text,
        priority: editPriority,
        tags: editTags.split(',').map((s) => s.trim()).filter(Boolean),
        category: editCategory || 'Général',
      };
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      if (updated.category && !categories.includes(updated.category)) {
        setCategories((prev) => [...prev, updated.category as string]);
      }
      setEditOpen(false);
      setEditingTodo(null);
      return;
    }

    // Fallback: existing inline editor behavior
    if (!editText.trim()) return;
    const { text } = parseTodoText(editText);
    const tagRegex = /#([\wÀ-ÿ-]+)/g;
    const tags = (editTags.match(tagRegex) || []).map(t => t.replace('#', ''));

    setTodos(todos.map(t => t.id === editingTodo.id ? {
      ...t,
      text,
      tags,
      priority: editPriority,
      completed: editCompleted,
    } : t));

    setEditDialogOpen(false);
    setEditingTodo(null);
  };

  const deleteFromDialog = () => {
    if (!editingTodo) return;
    setTodos(todos.filter(t => t.id !== editingTodo.id));
    setEditDialogOpen(false);
    setEditOpen(false);
    setEditingTodo(null);
  };

  // --- LOGIQUE AI (VERSION RESTAURÉE) ---

  const localBuildAiPrompt = (items: Todo[]) => {
    const now = new Date().toLocaleDateString();
    let content = `CONTEXTE: Liste de tâches (Export du ${now})\n`;
    content += `--------------------------------------------------\n\n`;
    if (items.length === 0) return '(Aucune tâche selon les filtres)';
    const grouped: Record<string, Todo[]> = { high: [], medium: [], low: [] };
    items.forEach(t => grouped[t.priority].push(t));
    (['high','medium','low'] as const).forEach(p => {
      if (grouped[p].length > 0) {
        content += `PRIORITÉ ${p.toUpperCase()}:\n`;
        grouped[p].forEach(t => {
          const status = t.completed ? '[X]' : '[ ]';
          const tags = aiShowTags && t.tags.length ? ` ${t.tags.map(tag => `#${tag}`).join(' ')}` : '';
          const id = aiShowIds ? ` (ID: ${t.id})` : '';
          content += `${status} ${t.text}${tags}${id}\n`;
        });
        content += `\n`;
      }
    });
    return content;
  };

  const fetchAiPrompt = useCallback(async () => {
    setAiLoading(true);
    try {
      // prepare candidate list according to ai options
      const candidate = todos.filter(t => {
        if (aiScope === 'active') return !t.completed;
        if (aiScope === 'completed') return !!t.completed;
        return true;
      }).filter(t => aiTagFilter && aiTagFilter !== 'all_tags' ? t.tags.includes(aiTagFilter) : true);

      if (candidate.length === 0) {
        setAiPrompt('(Aucune tâche selon les filtres)');
        setAiLoading(false);
        return;
      }

      // Try API first
      try {
        const params = new URLSearchParams();
        if (aiScope) params.set('only', aiScope);
        if (aiTagFilter && aiTagFilter !== 'all_tags') params.set('tag', aiTagFilter);
        params.set('showIds', aiShowIds ? 'true' : 'false');
        params.set('showTags', aiShowTags ? 'true' : 'false');
        const url = `/api/widgets/${widget.id}/export-ai${params.toString() ? `?${params.toString()}` : ''}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && data.prompt) {
            setAiPrompt(data.prompt);
            setAiLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn('API prompt fetch failed, falling back to local build', e);
      }

      // Fallback: build locally
      const built = localBuildAiPrompt(candidate);
      setAiPrompt(built);
    } catch (err) {
      console.error('Error fetching/building AI prompt', err);
      setAiPrompt('Erreur lors de la génération.');
    } finally {
      setAiLoading(false);
    }
  }, [widget.id, aiScope, aiTagFilter, aiShowIds, aiShowTags, todos]);

  useEffect(() => {
    if (aiDialogOpen) {
      const timeout = setTimeout(() => { void fetchAiPrompt(); }, 300);
      return () => clearTimeout(timeout);
    }
  }, [aiDialogOpen, fetchAiPrompt]);


  // --- FILTRES & TRI ---

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    todos.forEach(t => t.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [todos]);

  const processedTodos = useMemo(() => {
    let result = todos;

    // 1. Filtre par statut (Vue)
    if (!showCompleted) {
      result = result.filter(t => !t.completed);
    }

    // 2. Filtre par Tag (Recherche spécifique)
    if (tagFilter !== 'all') {
      result = result.filter(t => t.tags.includes(tagFilter));
    }

    // 2.5 Filtre par catégorie active
    if (typeof activeCategory !== 'undefined' && activeCategory !== null) {
      result = result.filter(t => (t as any).category === activeCategory);
    }

    // 3. Tri
    return [...result].sort((a, b) => {
      if (sortMode === 'priority') {
        const map = { high: 3, medium: 2, low: 1 };
        const diff = map[b.priority] - map[a.priority];
        if (diff !== 0) return diff;
      }
      if (sortMode === 'alpha') {
        return a.text.localeCompare(b.text);
      }
      return b.createdAt - a.createdAt; // recent
    });
  }, [todos, showCompleted, tagFilter, sortMode]);

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'high': return 'text-red-500 border-red-500 bg-red-500/10';
      case 'medium': return 'text-amber-500 border-amber-500 bg-amber-500/10';
      case 'low': return 'text-emerald-500 border-emerald-500 bg-emerald-500/10';
      default: return 'text-slate-500';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      case 'low': return <Flag className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };

  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Card className="w-full h-full flex flex-col overflow-hidden bg-card">
      {/* --- HEADER --- */}
      <div className="p-3 border-b space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
            <span className="font-semibold truncate">{widget.options.title || 'Todo List'}</span>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Bouton AI (Restauré) */}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-400 hover:text-indigo-500" onClick={() => setAiDialogOpen(true)} title="Générer Prompt IA">
                <Sparkles className="h-4 w-4" />
            </Button>

            {/* Toggle Completed */}
            <Button 
              variant="ghost" size="icon" className="h-7 w-7" 
              onClick={() => setShowCompleted(!showCompleted)}
              title={showCompleted ? "Masquer terminés" : "Afficher terminés"}
            >
              {showCompleted ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
            </Button>

            {/* Menu Options (Tri & Filtre par Tag) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Options d'affichage">
                  {tagFilter !== 'all' ? <Filter className="h-4 w-4 text-primary" /> : <ArrowUpDown className="h-4 w-4" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Trier par</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setSortMode('recent')}>
                  <Clock className="mr-2 h-4 w-4" /> Plus récents
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortMode('priority')}>
                  <AlertCircle className="mr-2 h-4 w-4" /> Priorité
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortMode('alpha')}>
                  <ArrowUpDown className="mr-2 h-4 w-4" /> Alphabétique
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Filtrer par Tag</DropdownMenuLabel>
                 <div className="px-2 py-1">
                  <Input value={tagSearch} onChange={(e) => setTagSearch(e.target.value)} placeholder="Rechercher tag..." className="text-xs" />
                 </div>
                 <DropdownMenuItem onClick={() => { setTagFilter('all'); setTagSearch(''); }}>
                   <Hash className="mr-2 h-4 w-4" /> Tous
                </DropdownMenuItem>
                 {availableTags
                  .filter(t => !tagSearch || t.toLowerCase().includes(tagSearch.toLowerCase()))
                  .map(tag => (
                    <DropdownMenuItem key={tag} onClick={() => { setTagFilter(tag); setTagSearch(''); }} className="justify-between">
                      <span>#{tag}</span>
                      {tagFilter === tag && <Check className="h-3 w-3" />}
                    </DropdownMenuItem>
                 ))}
                <DropdownMenuSeparator />
                <div className="px-2 py-2 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground mr-2">Catégorie: <strong className="ml-1">{activeCategory}</strong></span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => addCategory()} title="Créer catégorie">
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => renameCategory(activeCategory)} title="Renommer catégorie">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeCategory(activeCategory)} title="Supprimer catégorie">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Progress Bar & Filter Indicator */}
        {!isCompact && (
            <div className="space-y-1">
                {tagFilter !== 'all' && (
                    <div className="flex justify-between items-center text-[10px]">
                        <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Filter className="h-3 w-3"/> Filtre: #{tagFilter}
                        </span>
                        <button onClick={() => setTagFilter('all')} className="hover:text-destructive"><X className="h-3 w-3"/></button>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="bg-primary h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground min-w-[24px] text-right">{Math.round(progress)}%</span>
                </div>
            </div>
        )}
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
                    onClick={(e) => { e.stopPropagation(); void removeCategory(cat); }}
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

      {/* --- LISTE --- */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {processedTodos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
              <CheckCircle2 className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm">
                {tagFilter !== 'all' ? `Aucune tâche #${tagFilter}` : "Aucune tâche"}
              </p>
            </div>
          ) : (
            processedTodos.map((todo) => (
              <div
                key={todo.id}
                onMouseEnter={() => setHoveredTodoId(todo.id)}
                onMouseLeave={() => setHoveredTodoId(null)}
                className="flex items-start gap-2 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors animate-in fade-in slide-in-from-bottom-1 duration-200 relative pr-14"
              >
                {/* Checkbox */}
                <button onClick={() => toggleTodo(todo.id)} className="shrink-0 mt-0.5">
                  {todo.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm break-words leading-tight ${todo.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {todo.text}
                  </p>
                  
                  {/* Metadata */}
                  {!isCompact && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <Badge variant="outline" className={`text-[9px] h-4 px-1 gap-1 border-0 ${getPriorityColor(todo.priority)}`}>
                        <span className="capitalize">{todo.priority}</span>
                      </Badge>
                      {todo.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[9px] h-4 px-1 text-muted-foreground bg-muted">#{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* --- ACTIONS (HOVER ONLY) --- */}
                {/* Utilisation de group-hover:opacity-100 pour n'afficher que si on survole CETTE tâche */}
                {hoveredTodoId === todo.id && (
                  <div className="absolute right-1 top-1 flex gap-0.5 transition-opacity bg-background/80 backdrop-blur-sm rounded-md shadow-sm border border-border/50">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-indigo-500" onClick={() => openEdit(todo)}>
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600" onClick={() => deleteTodo(todo.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* --- ADD FORM --- */}
      <div className="p-3 border-t bg-muted/10 shrink-0">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTodo()}
              placeholder="Nouvelle tâche... #tag"
              className="flex-1 h-9 text-sm"
            />
            <Button onClick={addTodo} size="sm" className="h-9 w-9 p-0 shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {!isCompact && (
            <div className="flex gap-1 justify-center">
              {(['low', 'medium', 'high'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-0.5 text-[9px] uppercase font-bold rounded-sm border transition-all ${
                    priority === p ? getPriorityColor(p) : 'border-transparent text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
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