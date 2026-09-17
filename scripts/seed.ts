// Generates ~3 weeks of realistic synthetic sessions so the coach has
// patterns to reason over without waiting for real logged data.
// Run with: npx tsx scripts/seed.ts  (after setting env vars)
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Category = 'coding_skills' | 'dsa' | 'ui_ux' | 'burnout_app' | 'job_applications' | 'other';

// Rough continuation-rate + duration profile per category, tuned to feel
// like a real person: DSA is hardest to sustain, job_applications easiest.
const PROFILES: Record<Category, { continueRate: number; avgMin: number; sessionsPerDay: number }> = {
  dsa: { continueRate: 0.55, avgMin: 35, sessionsPerDay: 1.2 },
  coding_skills: { continueRate: 0.7, avgMin: 40, sessionsPerDay: 0.6 },
  ui_ux: { continueRate: 0.6, avgMin: 30, sessionsPerDay: 0.4 },
  burnout_app: { continueRate: 0.65, avgMin: 45, sessionsPerDay: 0.3 },
  job_applications: { continueRate: 0.8, avgMin: 25, sessionsPerDay: 0.9 },
  other: { continueRate: 0.5, avgMin: 20, sessionsPerDay: 0.2 },
};

function randHour(bucket: 'morning' | 'afternoon' | 'evening') {
  const ranges = { morning: [7, 11], afternoon: [12, 17], evening: [19, 22] };
  const [a, b] = ranges[bucket];
  return a + Math.random() * (b - a);
}

async function seed() {
  const rows = [];
  const days = 21;

  for (let d = days; d >= 0; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);

    for (const [category, profile] of Object.entries(PROFILES) as [Category, typeof PROFILES.dsa][]) {
      const numSessions = Math.random() < profile.sessionsPerDay % 1 ? Math.ceil(profile.sessionsPerDay) : Math.floor(profile.sessionsPerDay);
      for (let i = 0; i < numSessions; i++) {
        // Evening sessions and post-work-crash sessions run shorter + abandon more,
        // matching Tej's actual "crashes by 7-7:30pm" pattern.
        const bucket = Math.random() < 0.5 ? 'evening' : (Math.random() < 0.6 ? 'morning' : 'afternoon');
        const eveningPenalty = bucket === 'evening' ? 0.75 : 1;
        const completed = Math.random() < profile.continueRate * eveningPenalty;
        const durationMin = Math.max(8, Math.round(profile.avgMin * eveningPenalty * (0.6 + Math.random() * 0.8) * (completed ? 1 : 0.4)));

        const hour = randHour(bucket);
        const started = new Date(date);
        started.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);
        const ended = new Date(started.getTime() + durationMin * 60000);

        rows.push({
          category,
          started_at: started.toISOString(),
          ended_at: ended.toISOString(),
          duration_min: durationMin,
          completed,
          energy_after: completed ? 3 + Math.round(Math.random() * 2) : 1 + Math.round(Math.random() * 2),
          note: null,
        });
      }
    }
  }

  const { error } = await supabase.from('sessions').insert(rows);
  if (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
  console.log(`Seeded ${rows.length} synthetic sessions across ${days} days.`);
}

seed();