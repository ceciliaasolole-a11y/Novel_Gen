'use client';

import * as React from 'react';
import { supabase, type StoryBible } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, Globe, GitBranch, Sparkles, Loader2 } from 'lucide-react';

type Bible = {
  title?: string;
  genre?: string;
  tone?: string;
  characters?: { name: string; role?: string; motivation?: string; appearance?: string; arc?: string }[];
  world_setting?: { location?: string; era?: string; rules?: string; factions?: string } | string;
  main_conflict?: string;
  themes?: string[];
  plot_arc?: { act?: string; summary?: string }[];
};

export function StoryBibleExplorer({ projectId, title, open, onOpenChange }: { projectId: string; title: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [bible, setBible] = React.useState<Bible | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from('story_bibles')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as (StoryBible & { content: Bible }) | null;
        setBible(row?.content || null);
        setLoading(false);
      });
  }, [open, projectId]);

  const world = typeof bible?.world_setting === 'string' ? { location: bible.world_setting } : bible?.world_setting || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Story Bible &amp; Lore Explorer
          </DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !bible ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Story Bible belum dibuat. Jalankan generate untuk membangun lore otomatis.
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
              {bible.main_conflict && (
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Main Conflict</p>
                  <p className="text-sm">{bible.main_conflict}</p>
                </div>
              )}

              {/* Characters */}
              {bible.characters && bible.characters.length > 0 && (
                <div>
                  <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Users className="h-4 w-4 text-primary" /> Characters</h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {bible.characters.map((c, i) => (
                      <div key={i} className="rounded-lg border border-border/60 p-3">
                        <p className="font-medium">{c.name}</p>
                        {c.role && <p className="text-[11px] text-primary">{c.role}</p>}
                        {c.motivation && <p className="mt-1 text-xs text-muted-foreground"><span className="font-medium">Motivation:</span> {c.motivation}</p>}
                        {c.appearance && <p className="text-xs text-muted-foreground"><span className="font-medium">Appearance:</span> {c.appearance}</p>}
                        {c.arc && <p className="text-xs text-muted-foreground"><span className="font-medium">Arc:</span> {c.arc}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* World setting */}
              {(world.location || world.era || world.rules || world.factions) && (
                <div>
                  <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Globe className="h-4 w-4 text-primary" /> World Setting</h4>
                  <div className="rounded-lg border border-border/60 p-3 space-y-1 text-sm">
                    {world.location && <p><span className="font-medium">Location:</span> {world.location}</p>}
                    {world.era && <p><span className="font-medium">Era:</span> {world.era}</p>}
                    {world.rules && <p><span className="font-medium">Rules:</span> {world.rules}</p>}
                    {world.factions && <p><span className="font-medium">Factions:</span> {world.factions}</p>}
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
                          {i < bible.plot_arc!.length - 1 && <div className="w-px flex-1 bg-border" />}
                        </div>
                        <div className="pb-2">
                          {a.act && <p className="text-xs font-semibold text-primary">{a.act}</p>}
                          {a.summary && <p className="text-sm text-muted-foreground">{a.summary}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
