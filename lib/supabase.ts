import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type TaskCategory =
  | 'coding_skills'
  | 'dsa'
  | 'ui_ux'
  | 'burnout_app'
  | 'job_applications'
  | 'other';

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  coding_skills: 'Coding Skills',
  dsa: 'DSA',
  ui_ux: 'UI/UX Side Hustle',
  burnout_app: 'Burnout App',
  job_applications: 'Job Applications',
  other: 'Other',
};

export interface Session {
  id: string;
  category: TaskCategory;
  started_at: string;
  ended_at: string | null;
  duration_min: number | null;
  completed: boolean | null;
  note: string | null;
  energy_after: number | null;
}
