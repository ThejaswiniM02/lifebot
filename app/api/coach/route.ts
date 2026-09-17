import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getCoachContext() {
  const { data: categoryStats } = await supabase.from('category_stats').select('*');

  const { data: recentSessions } = await supabase
    .from('sessions')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(20);

  const { data: todayCheckin } = await supabase
    .from('daily_checkins')
    .select('*')
    .eq('date', new Date().toISOString().slice(0, 10))
    .maybeSingle();

  const hourBuckets: Record<string, { completed: number; total: number }> = {};
  for (const s of recentSessions ?? []) {
    const hour = new Date(s.started_at).getHours();
    const bucket = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    const key = `${s.category}:${bucket}`;
    hourBuckets[key] ??= { completed: 0, total: 0 };
    if (s.completed !== null) {
      hourBuckets[key].total += 1;
      if (s.completed) hourBuckets[key].completed += 1;
    }
  }

  return { categoryStats, recentSessions, todayCheckin, hourBuckets };
}

const SYSTEM_PROMPT = `You are Tej's personal productivity coach, modeled after "Lifebot" —
you give advice based ONLY on her actual logged behavioral data, never generic
productivity tips. Her tracks: Coding Skills, DSA, UI/UX Side Hustle, Burnout
Detection App (build + marketing), Job Applications.

Rules:
- Always cite the specific numbers behind a recommendation (continuation rate,
  avg duration, time-of-day pattern) — never give advice you can't back with her data.
- If she says she wants to quit a task, do not validate the exit. Lay out the
  honest odds of what she'll actually do based on history, then give two
  concrete options (push through vs a specific bounded break), like the
  Lifebot gym-vs-scripting example.
- If there isn't enough data yet for a category, say so plainly instead of
  guessing, and default to general sequencing logic (front-load the hardest
  task while energy is fresh; end blocks on her highest-continuation category).
- Keep responses short and directive. She doesn't want essays, she wants a plan.
- She has stated she hasn't been consistent with ADHD-management tools lately —
  do not moralize about this, just build sequencing that doesn't depend on
  willpower (short defaults, low-friction next actions).`;

function demoReply(message: string, context: Awaited<ReturnType<typeof getCoachContext>>) {
  const { categoryStats } = context;
  const stats = (categoryStats ?? []) as { category: string; continuation_rate: number; avg_duration_min: number; total_sessions: number }[];

  const wantsToQuit = /quit|stop|give up|nap|scroll|break/i.test(message);
  const mentionedCategory = stats.find((s) => message.toLowerCase().includes(s.category.replace('_', ' ')));

  if (!stats.length || stats.every((s) => s.total_sessions < 3)) {
    return "Not enough logged sessions yet to give data-backed advice — log a few timer sessions first (or run the seed script for demo data). For now: front-load your hardest task while you're fresh, and end on whichever category you finish most reliably.";
  }

  if (wantsToQuit) {
    const target = mentionedCategory ?? [...stats].sort((a, b) => a.continuation_rate - b.continuation_rate)[0];
    const pct = Math.round((target.continuation_rate ?? 0) * 100);
    return `Your logged continuation rate on ${target.category.replace('_', ' ')} is ${pct}%. ${
      pct < 50
        ? "That's genuinely low — this isn't just you being lazy, this category is hard to sustain. Still, quitting now vs. a bounded 10-min break matters: no-movement breaks tend to become exits. Try: finish one more small chunk, then take a real break."
        : `That's decent odds you'd come back to it. Push through this rep, then take a proper break as the reward — not an escape.`
    }`;
  }

  const best = [...stats].sort((a, b) => b.continuation_rate - a.continuation_rate)[0];
  const worst = [...stats].sort((a, b) => a.continuation_rate - b.continuation_rate)[0];
  return `Based on your logs: ${best.category.replace('_', ' ')} has your highest continuation rate (${Math.round(
    (best.continuation_rate ?? 0) * 100
  )}%, avg ${Math.round(best.avg_duration_min ?? 0)}min) — good to end a block on. ${worst.category.replace('_', ' ')} is your weakest (${Math.round(
    (worst.continuation_rate ?? 0) * 100
  )}%) — tackle that one first while you're freshest, in a short session.`;
}

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  const context = await getCoachContext();
  console.log('API KEY CHECK:', JSON.stringify(process.env.ANTHROPIC_API_KEY));
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ reply: demoReply(message, context), demoMode: true });
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `LOGGED DATA:\n${JSON.stringify(context, null, 2)}\n\nTEJ SAYS: ${message}`,
        },
      ],
    }),
  });

  const data = await response.json();
  const text = data.content?.find((b: any) => b.type === 'text')?.text ?? '';

  return NextResponse.json({ reply: text });
}
