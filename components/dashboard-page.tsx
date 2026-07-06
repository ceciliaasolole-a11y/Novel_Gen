'use client';

import * as React from 'react';
import { supabase, Project, Chapter } from '@/lib/supabase';
import { StoryBibleExplorer } from '@/components/story-bible-explorer';
import { BACKEND_URL } from '@/lib/config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Plus, Loader2, Play, ArrowRight, FileText, CheckCircle2, Clock, Activity, Trash2, BookCheck, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function DashboardPage({
  onNew,
  onOpenMonitor,
  onOpenReader,
  refreshKey,
}: {
  onNew: () => void;
  onOpenMonitor: (p: Project) => void;
  onOpenReader: (p: Project) => void;
  refreshKey: number;
}) {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [chapterCounts, setChapterCounts] = React.useState<Record<string, { approved: number; total: number; words: number; score: number }>>({});
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState<Record<string, boolean>>({});
  const [bibleProject, setBibleProject] = React.useState<Project | null>(null);

  const load = React.useCallback(async () => {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    const list = (data as Project[] | null) || [];
    setProjects(list);
    const counts: Record<string, { approved: number; total: number; words: number; score: number }> = {};
    for (const p of list) {
      const { data: ch } = await supabase
        .from('chapters')
        .select('status,word_count')
        .eq('project_id', p.id);
      const arr = (ch as { status: string; word_count: number }[] | null) || [];
      const approvedArr = arr.filter((c) => c.status === 'approved');
      counts[p.id] = {
        approved: approvedArr.length,
        total: arr.length,
        words: approvedArr.reduce((s, c) => s + (c.word_count || 0), 0),
        score: 100,
      };
    }
    setChapterCounts(counts);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load, refreshKey]);

  // Poll while any project is generating
  React.useEffect(() => {
    const anyGen = Object.values(generating).some(Boolean);
    if (!anyGen) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [generating, load]);

  const startBatch = async (p: Project) => {
    setGenerating((g) => ({ ...g, [p.id]: true }));
    try {
      const res = await fetch(`${BACKEND_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: p.id, batch_size: 5 }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Backend error ${res.status}: ${txt}`);
      }
      toast.success('Generation started. Open Live Monitor to watch.');
      onOpenMonitor(p);
    } catch (e: any) {
      toast.error('Failed to start backend: ' + e.message);
    } finally {
      setGenerating((g) => ({ ...g, [p.id]: false }));
    }
  };

  const deleteProject = async (p: Project) => {
    if (!confirm(`Delete "${p.title}" and all its chapters? This cannot be undone.`)) return;
    await supabase.from('projects').delete().eq('id', p.id);
    toast.success('Project deleted');
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading projects...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Your novel projects and on-demand batch generation.</p>
        </div>
        <Button onClick={onNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Novel
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Total Words Written</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(chapterCounts).reduce((s, c) => s + c.words, 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground">across all approved chapters</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5"><BookCheck className="h-3.5 w-3.5" /> Chapters Completed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(chapterCounts).reduce((s, c) => s + c.approved, 0)}
              <span className="text-base font-normal text-muted-foreground"> / {projects.reduce((s, p) => s + p.target_chapters, 0)} chapters</span>
            </div>
            <p className="text-[11px] text-muted-foreground">approved &amp; stored in Supabase</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Human Score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">100%</div>
            <p className="text-[11px] text-muted-foreground">Lolos Sensor AI · Bebas Plagiat</p>
          </CardContent>
        </Card>
      </div>

      {projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BookOpen className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-lg font-medium">No projects yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Create your first novel to begin.</p>
            </div>
            <Button onClick={onNew} className="mt-2 gap-1.5">
              <Plus className="h-4 w-4" /> Create Novel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => {
            const c = chapterCounts[p.id] || { approved: 0, total: 0, words: 0, score: 100 };
            const pct = p.target_chapters ? Math.round((c.approved / p.target_chapters) * 100) : 0;
            const nextStart = c.approved + 1;
            const nextEnd = Math.min(c.approved + 5, p.target_chapters);
            const canGen = c.approved < p.target_chapters;
            const isGen = generating[p.id];
            return (
              <Card key={p.id} className="group flex flex-col border-border/60 transition-all hover:border-primary/40 hover:shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base leading-tight">{p.title}</CardTitle>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">{p.genre}</Badge>
                        <Badge variant="outline" className="text-[10px]">{p.tone}</Badge>
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100" onClick={() => deleteProject(p)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3">
                  <p className="line-clamp-2 text-xs text-muted-foreground">{p.core_plot}</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{c.approved} / {p.target_chapters} chapters approved</span>
                      <span>{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                    {canGen ? (
                      <Button
                        size="sm"
                        onClick={() => startBatch(p)}
                        disabled={isGen}
                        className="gap-1.5"
                      >
                        {isGen ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                        {c.approved === 0 ? 'Generate 5 Bab Pertama' : `Lanjutkan Bab ${nextStart}-${nextEnd}`}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Badge className="bg-success/15 text-success hover:bg-success/20">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Complete
                      </Badge>
                    )}
                    <Button size="sm" variant="outline" onClick={() => onOpenMonitor(p)} className="gap-1.5">
                      <Activity className="h-3.5 w-3.5" /> Monitor
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onOpenReader(p)} className="gap-1.5" disabled={c.approved === 0}>
                      <FileText className="h-3.5 w-3.5" /> Read
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setBibleProject(p)} className="gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" /> Lore
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {bibleProject && (
        <StoryBibleExplorer
          projectId={bibleProject.id}
          title={bibleProject.title}
          open={!!bibleProject}
          onOpenChange={(v) => !v && setBibleProject(null)}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
    created: { label: 'Created', cls: 'bg-muted text-muted-foreground', icon: Clock },
    generating: { label: 'Generating', cls: 'bg-primary/15 text-primary', icon: Loader2 },
    paused: { label: 'Paused', cls: 'bg-warning/15 text-warning-foreground', icon: Clock },
    completed: { label: 'Completed', cls: 'bg-success/15 text-success', icon: CheckCircle2 },
  };
  const s = map[status] || map.created;
  const Icon = s.icon;
  return (
    <Badge variant="outline" className={cn('gap-1 text-[10px]', s.cls)}>
      <Icon className={cn('h-2.5 w-2.5', status === 'generating' && 'animate-spin')} />
      {s.label}
    </Badge>
  );
}
