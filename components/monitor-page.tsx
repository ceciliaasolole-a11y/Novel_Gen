'use client';

import * as React from 'react';
import { supabase, Project, GenerationLog, Chapter } from '@/lib/supabase';
import { BACKEND_URL, AGENT_LABELS, PIPELINE_STEPS } from '@/lib/config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Activity, ArrowLeft, Loader2, CheckCircle2, XCircle, AlertTriangle, Radio, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MonitorPage({ project, onBack }: { project: Project; onBack: () => void }) {
  const [logs, setLogs] = React.useState<GenerationLog[]>([]);
  const [chapters, setChapters] = React.useState<Chapter[]>([]);
  const [connected, setConnected] = React.useState(false);
  const [streaming, setStreaming] = React.useState(false);
  const [activeAgent, setActiveAgent] = React.useState<string | null>(null);
  const [revisionActive, setRevisionActive] = React.useState(false);
  const logEndRef = React.useRef<HTMLDivElement>(null);

  const loadInitial = React.useCallback(async () => {
    const [{ data: l }, { data: c }] = await Promise.all([
      supabase.from('generation_logs').select('*').eq('project_id', project.id).order('created_at', { ascending: true }).limit(200),
      supabase.from('chapters').select('*').eq('project_id', project.id).order('chapter_number', { ascending: true }),
    ]);
    setLogs((l as GenerationLog[] | null) || []);
    setChapters((c as Chapter[] | null) || []);
  }, [project.id]);

  React.useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  React.useEffect(() => {
    if (!streaming) return;
    const t = setInterval(async () => {
      const [{ data: l }, { data: c }] = await Promise.all([
        supabase.from('generation_logs').select('*').eq('project_id', project.id).order('created_at', { ascending: true }).limit(300),
        supabase.from('chapters').select('*').eq('project_id', project.id).order('chapter_number', { ascending: true }),
      ]);
      setLogs((l as GenerationLog[] | null) || []);
      setChapters((c as Chapter[] | null) || []);
    }, 2500);
    return () => clearInterval(t);
  }, [streaming, project.id]);

  React.useEffect(() => {
    let es: EventSource | null = null;
    let closed = false;
    const connect = () => {
      es = new EventSource(`${BACKEND_URL}/stream/${project.id}`);
      setConnected(true);
      setStreaming(true);
      es.onmessage = (ev) => {
        if (closed) return;
        try {
          const d = JSON.parse(ev.data);
          if (d.type === 'done' || d.type === 'end') {
            setStreaming(false);
            setActiveAgent(null);
            setRevisionActive(false);
            es?.close();
            setConnected(false);
          } else if (d.type === 'log') {
            setActiveAgent(d.agent);
            if (d.level === 'error' && d.agent === 'Quality Controller') {
              setRevisionActive(true);
              setTimeout(() => setRevisionActive(false), 5000);
            }
          }
        } catch {}
      };
      es.onerror = () => {
        setConnected(false);
        es?.close();
      };
    };
    connect();
    return () => {
      closed = true;
      es?.close();
      setConnected(false);
    };
  }, [project.id]);

  React.useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  const approvedCount = chapters.filter((c) => c.status === 'approved').length;
  const pct = project.target_chapters ? Math.round((approvedCount / project.target_chapters) * 100) : 0;
  const currentChapter = chapters.find((c) => c.status === 'draft' || c.status === 'generating' || c.status === 'editing' || c.status === 'reviewing' || c.status === 'rejected');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Button>
        <div className="flex items-center gap-2">
          {connected ? (
            <Badge className="bg-success/15 text-success hover:bg-success/20">
              <Radio className="mr-1 h-3 w-3 animate-pulse" /> Live
            </Badge>
          ) : streaming ? (
            <Badge variant="outline" className="text-muted-foreground">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Polling
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">Idle</Badge>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight">{project.title}</h2>
        <p className="text-sm text-muted-foreground">Live monitor of the 6-agent pipeline.</p>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Overall Progress</CardTitle>
            <span className="text-sm font-medium text-primary">{approvedCount} / {project.target_chapters}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={pct} className="h-2" />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{pct}% complete</span>
            {currentChapter && <span>Working on Chapter {currentChapter.chapter_number}</span>}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* 6-Step Vertical Stepper */}
        <Card className="lg:col-span-1 border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">6-Agent Pipeline</CardTitle>
            <CardDescription className="text-xs">Real-time agent status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {PIPELINE_STEPS.map((step, i) => {
                const isActive = activeAgent === step.agent;
                const isRejected = revisionActive && step.agent === 'Quality Controller';
                const isRevisionTarget = revisionActive && step.agent === 'Creative Novelist';
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all',
                          isRejected
                            ? 'border-destructive bg-destructive/20 text-destructive animate-pulse-fast'
                            : isActive
                            ? 'border-success bg-success/20 text-success animate-pulse-soft'
                            : isRevisionTarget
                            ? 'border-warning bg-warning/20 text-warning animate-pulse-soft'
                            : 'border-border bg-muted/40 text-muted-foreground'
                        )}
                      >
                        {isRejected ? (
                          <RotateCcw className="h-3.5 w-3.5" />
                        ) : isActive ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          i + 1
                        )}
                      </div>
                      {i < PIPELINE_STEPS.length - 1 && (
                        <div className={cn('w-0.5 flex-1 min-h-[24px] transition-colors', isActive ? 'bg-success/40' : 'bg-border/60')} />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className={cn('text-xs font-semibold', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                        {step.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{step.desc}</p>
                      {isActive && (
                        <p className={cn('text-[10px] font-medium', isRejected ? 'text-destructive' : 'text-success')}>
                          {isRejected ? 'REJECTED → Sending back to Novelist...' : 'Active'}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Chapter status grid */}
        <Card className="lg:col-span-1 border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Chapters</CardTitle>
            <CardDescription className="text-xs">Per-chapter pipeline status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5 max-h-[420px] overflow-y-auto scrollbar-thin pr-1">
            {chapters.length === 0 && (
              <p className="py-8 text-center text-xs text-muted-foreground">No chapters yet. Waiting for Agent 1 & 2...</p>
            )}
            {chapters.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md border border-border/50 px-2.5 py-1.5 text-xs">
                <span className="font-medium">Ch. {c.chapter_number}</span>
                <ChapterStatus status={c.status} revision={c.revision_count} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Activity log */}
        <Card className="lg:col-span-1 border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Activity Log</CardTitle>
              <Activity className={cn('h-4 w-4', streaming && 'text-primary animate-pulse')} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[420px] overflow-y-auto scrollbar-thin space-y-1.5 pr-1 font-mono text-xs">
              {logs.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">Waiting for activity...</p>
              )}
              {logs.map((l) => {
                const agent = AGENT_LABELS[l.agent] || { label: l.agent, color: 'text-muted-foreground' };
                return (
                  <div key={l.id} className="flex items-start gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 animate-fade-in-up">
                    <span className="mt-0.5 shrink-0">
                      {l.level === 'error' ? (
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                      ) : l.level === 'warning' ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                      ) : l.level === 'success' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <span className={cn('h-1.5 w-1.5 rounded-full bg-primary', streaming && 'animate-pulse-soft')} />
                      )}
                    </span>
                    <div className="flex-1 leading-relaxed">
                      <span className={cn('font-semibold', agent.color)}>[{agent.label}]</span>{' '}
                      {l.chapter_number && <span className="text-muted-foreground">Ch{l.chapter_number} · </span>}
                      <span className="text-foreground/90">{l.message}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={logEndRef} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ChapterStatus({ status, revision }: { status: string; revision: number }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Pending', cls: 'bg-muted text-muted-foreground' },
    drafting: { label: 'Drafting', cls: 'bg-amber-500/15 text-amber-500' },
    editing: { label: 'Editing', cls: 'bg-violet-500/15 text-violet-500' },
    reviewing: { label: 'Reviewing', cls: 'bg-rose-500/15 text-rose-500' },
    rejected: { label: 'Rejected', cls: 'bg-warning/15 text-warning-foreground' },
    approved: { label: 'Approved', cls: 'bg-success/15 text-success' },
    generating: { label: 'Generating', cls: 'bg-primary/15 text-primary' },
  };
  const s = map[status] || { label: status, cls: 'bg-muted text-muted-foreground' };
  return (
    <div className="flex items-center gap-1.5">
      {revision > 0 && status !== 'approved' && (
        <span className="text-[10px] text-warning">rev {revision}</span>
      )}
      <Badge variant="outline" className={cn('text-[10px]', s.cls)}>{s.label}</Badge>
    </div>
  );
}
