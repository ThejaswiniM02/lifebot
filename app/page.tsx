'use client';

import { useState, useEffect, useRef } from 'react';
import { CATEGORY_LABELS, TaskCategory, Session } from '@/lib/supabase';

const CATEGORIES = Object.keys(CATEGORY_LABELS) as TaskCategory[];

export default function Home() {
  const [active, setActive] = useState<Session | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [messages, setMessages] = useState<{ role: 'user' | 'coach'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!active) return;

    const updateElapsed = () => {
      const startedAt = new Date(active.started_at).getTime();
      if (Number.isFinite(startedAt)) {
        setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
      }
    };

    updateElapsed();
    timerRef.current = setInterval(updateElapsed, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [active]);

  async function startSession(category: TaskCategory) {
    setError(null);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
      });
      const data = await res.json();
      if (!res.ok || !data.id || !data.started_at) {
        throw new Error(data.error || 'Could not start the session.');
      }
      setActive(data);
      setElapsed(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the session.');
    }
  }

  async function endSession(completed: boolean) {
    if (!active) return;
    const note = prompt('Quick note (optional):') || undefined;
    setError(null);
    try {
      const res = await fetch('/api/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: active.id, completed, note }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Could not save the session.');
      setActive(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the session.');
    }
  }

  async function sendMessage() {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages((m) => [...m, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);
    const res = await fetch('/api/coach', {
      method: 'POST',
      body: JSON.stringify({ message: userMsg }),
    });
    const data = await res.json();
    setMessages((m) => [...m, { role: 'coach', text: data.reply }]);
    setLoading(false);
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Lifebot</h1>
      {error && <p className="mb-4 rounded-lg bg-red-950 px-3 py-2 text-sm text-red-200">{error}</p>}

      <section className="mb-8 border border-neutral-800 rounded-xl p-5">
        {!active ? (
          <div>
            <p className="text-sm text-neutral-400 mb-3">What are you starting?</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => startSession(c)}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm"
                >
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-neutral-400">{CATEGORY_LABELS[active.category]}</p>
            <p className="text-4xl font-mono my-3">{fmt(elapsed)}</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => endSession(true)} className="px-4 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-sm">
                Finished
              </button>
              <button onClick={() => endSession(false)} className="px-4 py-2 rounded-lg bg-red-800 hover:bg-red-700 text-sm">
                Abandoned
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="border border-neutral-800 rounded-xl p-5 flex flex-col h-[420px]">
        <div className="flex-1 overflow-y-auto space-y-3 mb-3">
          {messages.length === 0 && (
            <p className="text-sm text-neutral-500">
              Ask what to do first, or tell it you want to quit something.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
              <span
                className={`inline-block px-3 py-2 rounded-lg text-sm max-w-[85%] ${
                  m.role === 'user' ? 'bg-blue-800' : 'bg-neutral-800'
                }`}
              >
                {m.text}
              </span>
            </div>
          ))}
          {loading && <p className="text-sm text-neutral-500">thinking…</p>}
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="e.g. I want to quit DSA and nap"
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm"
          />
          <button onClick={sendMessage} className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-sm">
            Send
          </button>
        </div>
      </section>
    </main>
  );
}
