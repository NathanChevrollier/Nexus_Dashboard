import { db } from '@/lib/db';
import { widgets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export type PromptOptions = {
  only?: 'active' | 'completed' | 'all';
  categories?: string[];
  template?: string; 
  // Nouvelles options
  tag?: string;      // Filtrer par un tag spécifique
  showIds?: string;  // "true" | "false" (passé en string via URLSearchParams)
  showTags?: string; // "true" | "false"
};

/**
 * Generate a structured prompt summarizing todo items for a widget.
 */
export async function generateTodoPromptV2(widgetId: string, opts?: PromptOptions): Promise<string> {
  const widget = await db.query.widgets.findFirst({
    where: eq(widgets.id, widgetId),
  });

  if (!widget) throw new Error('Widget not found');

  const options = (widget.options as any) || {};
  const todos = Array.isArray(options.todos) ? options.todos : [];

  // Parse booleans
  const showIds = opts?.showIds === 'true';
  const showTags = opts?.showTags === 'true'; // Default true handled in frontend logic, but here explicit check

  // Initial Filter
  let filtered = [...todos];

  // Filter by Tag if provided
  if (opts?.tag && opts.tag !== 'all_tags') {
      filtered = filtered.filter((t: any) => 
          Array.isArray(t.tags) && t.tags.includes(opts.tag)
      );
  }

  // Split into active/completed
  let active = filtered.filter((t: any) => !t.completed);
  let completed = filtered.filter((t: any) => !!t.completed);

  // Apply category filters if provided (Legacy support, though not used in new UI yet)
  if (opts?.categories && opts.categories.length > 0) {
    active = active.filter((t: any) => opts.categories!.includes(t.category));
    completed = completed.filter((t: any) => opts.categories!.includes(t.category));
  }

  const now = new Date().toISOString();
  const lines: string[] = [];

  // HEADER SUMMARY
  lines.push('--- TODO LIST CONTEXT ---');
  lines.push(`Date: ${now}`);
  if (opts?.tag && opts.tag !== 'all_tags') lines.push(`Filter: Tag #${opts.tag}`);
  lines.push(`Scope: ${opts?.only || 'all'}`);
  lines.push(`Total Visible: ${active.length + completed.length}`);
  lines.push('-------------------------');
  lines.push('');

  const includeActive = !opts?.only || opts.only === 'active' || opts.only === 'all';
  const includeCompleted = !opts?.only || opts.only === 'completed' || opts.only === 'all';

  // Helper to format a single task line
  const formatTask = (t: any, status: 'box' | 'check') => {
      const mark = status === 'box' ? '[ ]' : '[x]';
      const title = t.text || t.title || 'Untitled';
      const priority = (t.priority || 'medium').toUpperCase();
      
      let suffix = '';
      
      // Tags
      if (showTags && Array.isArray(t.tags) && t.tags.length) {
          suffix += ` ${t.tags.map((tg: string) => `#${tg}`).join(' ')}`;
      }
      
      // IDs
      if (showIds) {
          suffix += ` (ID: ${t.id})`;
      }

      return `- ${mark} [${priority}] ${title}${suffix}`;
  };

  // Helper to group tasks by category
  const renderGroupedTasks = (taskList: any[], status: 'box' | 'check') => {
      if (taskList.length === 0) {
          lines.push('  (None)');
          return;
      }
      
      const grouped: Record<string, any[]> = {};
      taskList.forEach(t => {
          const cat = t.category || 'Général';
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(t);
      });

      Object.keys(grouped).sort().forEach(cat => {
          lines.push(`  Category: ${cat}`);
          grouped[cat].forEach(t => lines.push('  ' + formatTask(t, status)));
      });
  };

  if (includeActive) {
    lines.push('### ACTIVE TASKS');
    renderGroupedTasks(active, 'box');
    lines.push('');
  }

  if (includeCompleted) {
    lines.push('### COMPLETED TASKS');
    renderGroupedTasks(completed, 'check');
    lines.push('');
  }

  const content = lines.join('\n');

  if (opts?.template && typeof opts.template === 'string' && opts.template.trim().length > 0) {
    return opts.template.replace(/\{\{\s*content\s*\}\}/gi, content);
  }

  return content;
}