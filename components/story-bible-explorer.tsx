'use client';

import * as React from 'react';
import { supabase, type StoryBible, Project } from '@/lib/supabase';
import { BACKEND_URL } from '@/lib/config';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BookOpen, Users, Globe, GitBranch, Sparkles, Loader2, Save, Rocket, Edit3, Check } from 'lucide-react';
import { toast } from 'sonner';

type Bible = {
  title?: string;
  genre?: string;
  tone?: string;
  characters?: { name: string; role?: string; motivation?: string; want?: string; flaw?: string; appearance?: string; arc?: string }[];
  world_setting?: { location?: string; era?: string; rules?: string; factions?: string } | string;
  main_conflict?: string;
  themes?: string[];
  plot_arc?: { act?: string; summary?: string }[];
};

export function StoryBibleExplorer({
  projectId,
  title,
  open,
  onOpenChange,
  project,
  onPhase2Start,
}: {
  projectId: string;
  title: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project?: Project;
  onPhase2Start?: () => void;
}) {
  const [bible, setBible] = React.useState<Bible | null>(null);
  const [outlines, setOutlines] = React.useState<{ id: string; chapter_number: number; title: string; outline: string }[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [starting, setStarting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [{ data: bibleData }, { data: chData }] = await Promise.all([
      supabase.from('story_bibles').select('*').eq('project_id', projectId).maybeSingle(),
      supabase.from('chapters').select('id,chapter_number,title,outline').eq('project_id', projectId).order('chapter_number', { ascending: true }),
    ]);
    const row = bibleData as (StoryBible & { content: Bible }) | null;
    setBible(row?.content || null);
    setOutlines((chData as { id: string; chapter_number: number; title: string; outline: string }[] | null) || []);
    setLoading(false);
  }, [projectId]);

  React.useEffect(() => {
    if (!open) return;
    load();
  }, [open, load]);

  const world = typeof bible?.world_setting === 'string' ? { location: bible.world_setting } : bible?.world_setting || {};

  const updateBible = (updater: (b: Bible) => Bible) => setBible((prev) => (prev ? updater(prev) : prev));

  const updateOutline = (id: string, field: 'title' | 'outline', val: string) =>
    setOutlines((prev) => prev.map((o) => (o.id === id ? { ...o, [field]: val } : o)));

  const saveAll = async () => {
    if (!bible) return;
    setSaving(true);
    try {
      await supabase.from('story_bibles').update({ content: bible }).eq('project_id', projectId).then(async (r) => {
        if (r.error && r.error.code === 'PGRN116') {
          await supabase.from('story_bibles').insert({ project_id: projectId, content: bible });
        }
      });
      for (const o of outlines) {
        await supabase.from('chapters').update({ title: o.title, outline: o.outline }).eq('id', o.id);
      }
      toast.success('Story Bible & outline saved.');
      setEditing(false);
    } catch (e: any) {
      toast.error('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const startPhase2 = async () => {
    if (!project) return;
    setStarting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/phase2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, batch_size: 5, user_feedback: null }),
      });
      if (!res.ok) throw new Error(`Backend error ${res.status}`);
      toast.success('Phase 2 started! Agents 3-6 are now writing.');
      onOpenChange(false);
      onPhase2Start?.();
    } catch (e: any) {
      toast.error('Failed to start: ' + e.message);
    } finally {
      setStarting(false);
    }
  };

  const hasBible = !!bible;
  const hasOutlines = outlines.length > 0;
  const canStartPhase2 = hasBible && hasOutlines;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Story Bible &amp; Lore Explorer
            </DialogTitle>
            {hasBible && (
              <Button
                variant={editing ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditing((e) => !e)}
                className="gap-1.5"
              >
                {editing ? <Save className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
                {editing ? 'Save' : 'Edit'}
              </Button>
            )}
          </div>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !bible ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Story Bible belum dibuat. Jalankan Phase 1 (Draft Concept) untuk membangun lore otomatis.
            </div>
          ) : (
            <div className="space-y-5">
              {/* Meta */}
              <div className="flex flex-wrap gap-2">
                {bible.genre && <Badge variant="secondary">{bible.genre}</Badge>}
                {bible.tone && <Badge variant="outline">{bible.tone}</Badge>}
                {bible.themes?.map((t, i) => (
                  <Badge key={i} variant="outline" className="gap-1"><Sparkles className="h-3 w-3" />{t}</Badge>
                ))}
              </div>

              {/* Main conflict */}
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Main Conflict</p>
                {editing ? (
                  <Textarea value={bible.main_conflict || ''} onChange={(e) => updateBible((b) => ({ ...b, main_conflict: e.target.value }))} rows={2} className="text-sm" />
                ) : (
                  <p className="text-sm">{bible.main_conflict}</p>
                )}
              </div>

              {/* Characters */}
              {bible.characters && bible.characters.length > 0 && (
                <div>
                  <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Users className="h-4 w-4 text-primary" /> Characters</h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {bible.characters.map((c, i) => (
                      <div key={i} className="rounded-lg border border-border/60 p-3 space-y-1">
                        {editing ? (
                          <>
                            <Input value={c.name} onChange={(e) => updateBible((b) => { const ch = [...(b.characters || [])]; ch[i] = { ...ch[i], name: e.target.value }; return { ...b, characters: ch }; })} className="h-8 text-sm font-medium" />
                            <Input value={c.role || ''} onChange={(e) => updateBible((b) => { const ch = [...(b.characters || [])]; ch[i] = { ...ch[i], role: e.target.value }; return { ...b, characters: ch }; })} className="h-7 text-[11px] text-primary" placeholder="Role" />
                            <Input value={c.motivation || ''} onChange={(e) => updateBible((b) => { const ch = [...(b.characters || [])]; ch[i] = { ...ch[i], motivation: e.target.value }; return { ...b, characters: ch }; })} className="h-7 text-xs" placeholder="Motivation" />
                            <Input value={c.want || ''} onChange={(e) => updateBible((b) => { const ch = [...(b.characters || [])]; ch[i] = { ...ch[i], want: e.target.value }; return { ...b, characters: ch }; })} className="h-7 text-xs" placeholder="Want" />
                            <Input value={c.flaw || ''} onChange={(e) => updateBible((b) => { const ch = [...(b.characters || [])]; ch[i] = { ...ch[i], flaw: e.target.value }; return { ...b, characters: ch }; })} className="h-7 text-xs" placeholder="Flaw" />
                            <Input value={c.appearance || ''} onChange={(e) => updateBible((b) => { const ch = [...(b.characters || [])]; ch[i] = { ...ch[i], appearance: e.target.value }; return { ...b, characters: ch }; })} className="h-7 text-xs" placeholder="Appearance" />
                            <Input value={c.arc || ''} onChange={(e) => updateBible((b) => { const ch = [...(b.characters || [])]; ch[i] = { ...ch[i], arc: e.target.value }; return { ...b, characters: ch }; })} className="h-7 text-xs" placeholder="Arc" />
                          </>
                        ) : (
                          <>
                            <p className="font-medium">{c.name}</p>
                            {c.role && <p className="text-[11px] text-primary">{c.role}</p>}
                            {c.motivation && <p className="mt-1 text-xs text-muted-foreground"><span className="font-medium">Motivation:</span> {c.motivation}</p>}
                            {c.want && <p className="text-xs text-muted-foreground"><span className="font-medium">Want:</span> {c.want}</p>}
                            {c.flaw && <p className="text-xs text-muted-foreground"><span className="font-medium">Flaw:</span> {c.flaw}</p>}
                            {c.appearance && <p className="text-xs text-muted-foreground"><span className="font-medium">Appearance:</span> {c.appearance}</p>}
                            {c.arc && <p className="text-xs text-muted-foreground"><span className="font-medium">Arc:</span> {c.arc}</p>}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* World setting */}
              {(world.location || world.era || world.rules || world.factions) && (
                <div>
                  <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Globe className="h-4 w-4 text-primary" /> World Setting</h4>
                  <div className="rounded-lg border border-border/60 p-3 space-y-1.5 text-sm">
                    {editing ? (
                      <>
                        <div className="space-y-1"><Label className="text-[10px]">Location</Label><Input value={world.location || ''} onChange={(e) => updateBible((b) => ({ ...b, world_setting: { ...(typeof b.world_setting === 'object' ? b.world_setting : {}), location: e.target.value } }))} className="h-8" /></div>
                        <div className="space-y-1"><Label className="text-[10px]">Era</Label><Input value={world.era || ''} onChange={(e) => updateBible((b) => ({ ...b, world_setting: { ...(typeof b.world_setting === 'object' ? b.world_setting : {}), era: e.target.value } }))} className="h-8" /></div>
                        <div className="space-y-1"><Label className="text-[10px]">Rules</Label><Textarea value={world.rules || ''} onChange={(e) => updateBible((b) => ({ ...b, world_setting: { ...(typeof b.world_setting === 'object' ? b.world_setting : {}), rules: e.target.value } }))} rows={2} className="text-sm" /></div>
                        <div className="space-y-1"><Label className="text-[10px]">Factions</Label><Input value={world.factions || ''} onChange={(e) => updateBible((b) => ({ ...b, world_setting: { ...(typeof b.world_setting === 'object' ? b.world_setting : {}), factions: e.target.value } }))} className="h-8" /></div>
                      </>
                    ) : (
                      <>
                        {world.location && <p><span className="font-medium">Location:</span> {world.location}</p>}
                        {world.era && <p><span className="font-medium">Era:</span> {world.era}</p>}
                        {world.rules && <p><span className="font-medium">Rules:</span> {world.rules}</p>}
                        {world.factions && <p><span className="font-medium">Factions:</span> {world.factions}</p>}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Plot arc */}
              {bible.plot_arc && bible.plot_arc.length > 0 && (
                <div>
                  <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><GitBranch className="h-4 w-4 text-primary" /> Plot Timeline</h4>
                  <div className="space-y-2">
                    {bible.plot_arc.map((a, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">{i + 1}</div>
                          {i < (bible.plot_arc?.length || 0) - 1 && <div className="w-px flex-1 bg-border" />}
                        </div>
                        <div className="pb-2 flex-1">
                          {editing ? (
                            <>
                              <Input value={a.act || ''} onChange={(e) => updateBible((b) => { const pa = [...(b.plot_arc || [])]; pa[i] = { ...pa[i], act: e.target.value }; return { ...b, plot_arc: pa }; })} className="h-7 text-xs font-semibold text-primary mb-1" placeholder="Act" />
                              <Textarea value={a.summary || ''} onChange={(e) => updateBible((b) => { const pa = [...(b.plot_arc || [])]; pa[i] = { ...pa[i], summary: e.target.value }; return { ...b, plot_arc: pa }; })} rows={2} className="text-sm" placeholder="Summary" />
                            </>
                          ) : (
                            <>
                              {a.act && <p className="text-xs font-semibold text-primary">{a.act}</p>}
                              {a.summary && <p className="text-sm text-muted-foreground">{a.summary}</p>}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chapter outlines (editable) */}
              {outlines.length > 0 && (
                <div>
                  <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><BookOpen className="h-4 w-4 text-primary" /> Chapter Outlines</h4>
                  <div className="space-y-2">
                    {outlines.map((o) => (
                      <div key={o.id} className="rounded-lg border border-border/60 p-3 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">Ch. {o.chapter_number}</Badge>
                          {editing ? (
                            <Input value={o.title} onChange={(e) => updateOutline(o.id, 'title', e.target.value)} className="h-7 text-sm font-medium" />
                          ) : (
                            <span className="text-sm font-medium">{o.title}</span>
                          )}
                        </div>
                        {editing ? (
                          <Textarea value={o.outline || ''} onChange={(e) => updateOutline(o.id, 'outline', e.target.value)} rows={2} className="text-xs" />
                        ) : (
                          <p className="text-xs text-muted-foreground">{o.outline}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer: Save + Approve & Start Phase 2 */}
        {hasBible && (
          <DialogFooter className="gap-2 border-t pt-4">
            {editing && (
              <Button onClick={saveAll} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Changes
              </Button>
            )}
            {canStartPhase2 && !editing && (
              <Button onClick={startPhase2} disabled={starting} size="lg" className="gap-2 w-full bg-gradient-to-r from-primary to-primary/80">
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                Setujui Konsep &amp; Mulai Generate 5 Bab Pertama
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
