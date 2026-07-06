'use client';

import * as React from 'react';
import { supabase, Project } from '@/lib/supabase';
import { GENRES, TONES } from '@/lib/config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PenLine, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function CreateNovelPage({ onCreated }: { onCreated: (p: Project) => void }) {
  const [title, setTitle] = React.useState('');
  const [corePlot, setCorePlot] = React.useState('');
  const [genre, setGenre] = React.useState('Fantasy');
  const [targetChapters, setTargetChapters] = React.useState(20);
  const [tone, setTone] = React.useState('Fast-Paced Action');
  const [saving, setSaving] = React.useState(false);

  const canSubmit = title.trim() && corePlot.trim() && !saving;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('projects')
      .insert({
        title: title.trim(),
        genre,
        core_plot: corePlot.trim(),
        target_chapters: targetChapters,
        tone,
        status: 'created',
      })
      .select('*')
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error('Failed to create project: ' + (error?.message || 'unknown'));
      return;
    }
    toast.success('Project created. Ready to generate.');
    onCreated(data as Project);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <PenLine className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-semibold tracking-tight">New Novel Project</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Define the core of your story. Agent 1 (World Architect) will expand this into a full Story Bible.
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">Story Core</CardTitle>
          <CardDescription>The seed idea that drives the entire novel.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">Novel Title</Label>
            <Input
              id="title"
              placeholder="e.g. The Last Cultivator of Ash"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="core">Core Plot / Inti Cerita</Label>
            <Textarea
              id="core"
              placeholder="Describe the central premise, main character, conflict, and what makes this story unique. The more vivid, the better the agents can build on it."
              value={corePlot}
              onChange={(e) => setCorePlot(e.target.value)}
              rows={6}
              className="resize-y"
            />
            <p className="text-[11px] text-muted-foreground">{corePlot.length} characters</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Genre</Label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Target Chapters</Label>
              <Input
                type="number"
                min={5}
                max={200}
                value={targetChapters}
                onChange={(e) => setTargetChapters(Math.max(5, Math.min(200, parseInt(e.target.value) || 5)))}
              />
              <p className="text-[10px] text-muted-foreground">Generated in batches of 5. Free input: 10, 50, 200, etc.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Tone / Gaya Bahasa</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={submit} disabled={!canSubmit} size="lg" className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Create Project
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
