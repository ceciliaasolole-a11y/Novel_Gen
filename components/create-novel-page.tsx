'use client';

import * as React from 'react';
import { supabase, Project, ManualCharacter } from '@/lib/supabase';
import { GENRES, TONES, LANGUAGES, TARGET_RATINGS, CHARACTER_ROLES } from '@/lib/config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PenLine, Sparkles, ArrowRight, Loader2, Plus, Trash2, Users, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

type CharMode = 'auto' | 'manual';

export function CreateNovelPage({ onCreated }: { onCreated: (p: Project) => void }) {
  const [title, setTitle] = React.useState('');
  const [corePlot, setCorePlot] = React.useState('');
  const [genre, setGenre] = React.useState('Fantasy');
  const [targetChapters, setTargetChapters] = React.useState(20);
  const [tone, setTone] = React.useState('Fast-Paced Action');
  const [language, setLanguage] = React.useState('Bahasa Indonesia');
  const [subGenre, setSubGenre] = React.useState('');
  const [targetRating, setTargetRating] = React.useState('General');
  const [charMode, setCharMode] = React.useState<CharMode>('auto');
  const [characters, setCharacters] = React.useState<ManualCharacter[]>([]);
  const [saving, setSaving] = React.useState(false);

  const canSubmit = title.trim() && corePlot.trim() && !saving &&
    (charMode === 'auto' || characters.every((c) => c.name.trim() && c.role.trim()));

  const addChar = () => setCharacters((p) => [...p, { name: '', role: 'Protagonis', want: '', flaw: '' }]);
  const removeChar = (i: number) => setCharacters((p) => p.filter((_, idx) => idx !== i));
  const updateChar = (i: number, field: keyof ManualCharacter, val: string) =>
    setCharacters((p) => p.map((c, idx) => (idx === i ? { ...c, [field]: val } : c)));

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      title: title.trim(),
      genre,
      core_plot: corePlot.trim(),
      target_chapters: targetChapters,
      tone,
      status: 'created',
      output_language: language,
      sub_genre: subGenre.trim() || null,
      target_rating: targetRating,
      manual_characters: charMode === 'manual' && characters.length > 0 ? characters : null,
    };
    const { data, error } = await supabase.from('projects').insert(payload).select('*').single();
    setSaving(false);
    if (error || !data) {
      toast.error('Failed to create project: ' + (error?.message || 'unknown'));
      return;
    }
    toast.success('Project created. Agent 1 & 2 will draft the concept.');
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
          Define the core of your story. Phase 1 runs Agent 1 & 2 to build the Story Bible and chapter outline for your review.
        </p>
      </div>

      {/* Story Core */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">Story Core</CardTitle>
          <CardDescription>The seed idea that drives the entire novel.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">Novel Title</Label>
            <Input id="title" placeholder="e.g. The Last Cultivator of Ash" value={title} onChange={(e) => setTitle(e.target.value)} />
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

          <div className="grid gap-4 sm:grid-cols-2">
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
              <Label>Output Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Target Chapters</Label>
              <Input
                type="number"
                min={5}
                max={200}
                value={targetChapters}
                onChange={(e) => setTargetChapters(Math.max(5, Math.min(200, parseInt(e.target.value) || 5)))}
              />
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
            <div className="space-y-1.5">
              <Label>Target Readers / Rating</Label>
              <Select value={targetRating} onValueChange={setTargetRating}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TARGET_RATINGS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subgenre">Sub-Genre / Tags</Label>
            <Input
              id="subgenre"
              placeholder="e.g. Cultivation, LitRPG, Romance, Isekai, System, Reincarnation"
              value={subGenre}
              onChange={(e) => setSubGenre(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">Comma-separated tags to guide the AI agents.</p>
          </div>
        </CardContent>
      </Card>

      {/* Character Input System */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5 text-primary" /> Character Design</CardTitle>
          <CardDescription>Let AI design characters automatically, or input them manually.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={charMode} onValueChange={(v) => setCharMode(v as CharMode)} className="grid gap-3 sm:grid-cols-2">
            <Label
              htmlFor="char-auto"
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all ${charMode === 'auto' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border/60 hover:border-primary/40'}`}
            >
              <RadioGroupItem value="auto" id="char-auto" className="mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-sm"><Wand2 className="h-4 w-4 text-primary" /> Auto-Generate Characters</div>
                <p className="text-xs text-muted-foreground">Agent 1 (World Architect) will design unique character profiles based on your core plot.</p>
              </div>
            </Label>
            <Label
              htmlFor="char-manual"
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all ${charMode === 'manual' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border/60 hover:border-primary/40'}`}
            >
              <RadioGroupItem value="manual" id="char-manual" className="mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-sm"><Users className="h-4 w-4 text-primary" /> Input Characters Manually</div>
                <p className="text-xs text-muted-foreground">Define each character's name, role, greatest desire (want), and fatal flaw.</p>
              </div>
            </Label>
          </RadioGroup>

          {charMode === 'manual' && (
            <div className="space-y-3">
              {characters.length === 0 && (
                <p className="rounded-lg border border-dashed border-border/60 py-6 text-center text-xs text-muted-foreground">
                  No characters added yet. Click "+ Tambah Karakter" to begin.
                </p>
              )}
              {characters.map((c, i) => (
                <div key={i} className="rounded-lg border border-border/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Character #{i + 1}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeChar(i)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Nama</Label>
                      <Input value={c.name} onChange={(e) => updateChar(i, 'name', e.target.value)} placeholder="e.g. Arka Valerius" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Peran</Label>
                      <Select value={c.role} onValueChange={(v) => updateChar(i, 'role', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CHARACTER_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Keinginan Terbesar (Want)</Label>
                      <Input value={c.want} onChange={(e) => updateChar(i, 'want', e.target.value)} placeholder="e.g. Membalas kematian ayahnya" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Kelemahan Fatal (Flaw)</Label>
                      <Input value={c.flaw} onChange={(e) => updateChar(i, 'flaw', e.target.value)} placeholder="e.g. Terlalu percaya pada siapa pun" />
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addChar} className="w-full gap-1.5 border-dashed">
                <Plus className="h-4 w-4" /> Tambah Karakter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button onClick={submit} disabled={!canSubmit} size="lg" className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Create Project & Draft Concept
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
