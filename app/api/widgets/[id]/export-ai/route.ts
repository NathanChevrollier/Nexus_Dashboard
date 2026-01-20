import { NextResponse } from 'next/server';
import { generateTodoPromptV2, PromptOptions } from '@/lib/actions/ai-prompt-v2';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split('/').filter(Boolean);
    // expected: ['api','widgets','<id>','export-ai']
    const id = segments[segments.length - 2];
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // read optional query params: only, categories (comma separated), template, tag, showIds, showTags
    const only = url.searchParams.get('only') as PromptOptions['only'] | null;
    const cats = url.searchParams.get('categories');
    const template = url.searchParams.get('template');
    const tag = url.searchParams.get('tag');
    const showIds = url.searchParams.get('showIds');
    const showTags = url.searchParams.get('showTags');

    const opts: PromptOptions = {};
    if (only) opts.only = only;
    if (cats) opts.categories = cats.split(',').map((s) => s.trim()).filter(Boolean);
    if (template) opts.template = template;
    if (tag) opts.tag = tag;
    if (showIds) opts.showIds = showIds;
    if (showTags) opts.showTags = showTags;

    const prompt = await generateTodoPromptV2(id, opts);
    return NextResponse.json({ prompt });
  } catch (err: any) {
    console.error('Error in export-ai route:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
