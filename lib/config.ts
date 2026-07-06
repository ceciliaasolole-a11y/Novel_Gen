// Backend Railway URL - set NEXT_PUBLIC_BACKEND_URL in Vercel env vars
// Falls back to localhost for local development
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export const GENRES = [
  'Fantasy',
  'Sci-Fi',
  'Romance',
  'Mystery',
  'Thriller',
  'Horror',
  'Action',
  'Adventure',
  'Drama',
  'Comedy',
  'Slice of Life',
  'Cultivation',
  'LitRPG',
  'Historical',
];

export const TONES = [
  'Standard',
  'Dark & Gritty',
  'Light & Humorous',
  'Epic & Dramatic',
  'Fast-Paced Action',
  'Emotional & Melancholic',
  'Mysterious & Suspenseful',
  'Whimsical & Playful',
];

export const AGENT_LABELS: Record<string, { label: string; color: string }> = {
  'World Architect': { label: 'World Architect', color: 'text-sky-400' },
  'Outline Plotter': { label: 'Outline Plotter', color: 'text-emerald-400' },
  'Creative Novelist': { label: 'Creative Novelist', color: 'text-amber-400' },
  'Chief Editor': { label: 'Chief Editor', color: 'text-violet-400' },
  'Quality Controller': { label: 'Quality Controller', color: 'text-rose-400' },
  'System': { label: 'System', color: 'text-muted-foreground' },
};
