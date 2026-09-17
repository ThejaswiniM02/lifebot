import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: start a session -> { category }
// PATCH: end a session -> { id, completed, note?, energy_after? }
export async function POST(req: NextRequest) {
  const { category } = await req.json();
  const { data, error } = await supabase
    .from('sessions')
    .insert({ category, started_at: new Date().toISOString() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const { id, completed, note, energy_after } = await req.json();

  const { data: existing } = await supabase
    .from('sessions')
    .select('started_at')
    .eq('id', id)
    .single();

  const endedAt = new Date();
  const durationMin = existing
    ? Math.round((endedAt.getTime() - new Date(existing.started_at).getTime()) / 60000)
    : null;

  const { data, error } = await supabase
    .from('sessions')
    .update({ ended_at: endedAt.toISOString(), duration_min: durationMin, completed, note, energy_after })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
