'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Check,
  Plus,
  Trash2,
  Circle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Flag,
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
}

export function TodoListWidget({ widget }: TodoListWidgetProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const isCompact = widget.w <= 2 && widget.h <= 2;

  useEffect(() => {
    // Load from widget options
    if (widget.options.todos) {
      setTodos(widget.options.todos as Todo[]);
    }
  }, [widget.options]);

  const addTodo = () => {
    if (!newTodo.trim()) return;

    const todo: Todo = {
      id: Date.now().toString(),
      text: newTodo,
      completed: false,
      priority,
      createdAt: Date.now(),
    };

    const updatedTodos = [...todos, todo];
    setTodos(updatedTodos);
    setNewTodo('');
    // TODO: Save to database via server action
  };

  const toggleTodo = (id: string) => {
    const updatedTodos = todos.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    setTodos(updatedTodos);
  };

  const deleteTodo = (id: string) => {
    const updatedTodos = todos.filter((todo) => todo.id !== id);
    setTodos(updatedTodos);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500 border-red-500';
      case 'medium':
        return 'text-yellow-500 border-yellow-500';
      case 'low':
        return 'text-green-500 border-green-500';
      default:
        return 'text-gray-500 border-gray-500';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="h-3 w-3" />;
      case 'medium':
        return <Clock className="h-3 w-3" />;
      case 'low':
        return <Flag className="h-3 w-3" />;
      default:
        return <Circle className="h-3 w-3" />;
    }
  };

  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Card className="w-full h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            {widget.options.title || 'Todo List'}
          </h3>
          <Badge variant="secondary">
            {completedCount}/{totalCount}
          </Badge>
        </div>
        {/* Progress Bar */}
        {!isCompact && totalCount > 0 && (
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Todo List */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {todos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tasks yet</p>
            </div>
          ) : (
            todos.map((todo) => (
              <div
                key={todo.id}
                className="group flex items-start gap-2 p-2 rounded-lg border bg-card hover:bg-accent transition-colors"
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className="shrink-0 mt-0.5"
                >
                  {todo.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${
                      todo.completed
                        ? 'line-through text-muted-foreground'
                        : 'text-foreground'
                    }`}
                  >
                    {todo.text}
                  </p>
                  {!isCompact && (
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={`text-xs ${getPriorityColor(todo.priority)}`}
                      >
                        {getPriorityIcon(todo.priority)}
                        {todo.priority}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4 text-destructive hover:text-destructive/80" />
                </button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Add Todo Form */}
      <div className="p-4 border-t space-y-2">
        <div className="flex gap-2">
          <Input
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
            placeholder="Add a new task..."
            className="flex-1"
          />
          <Button onClick={addTodo} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {!isCompact && (
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`flex-1 px-2 py-1 text-xs rounded border ${
                  priority === p
                    ? getPriorityColor(p) + ' bg-accent'
                    : 'border-muted text-muted-foreground'
                } transition-colors`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
