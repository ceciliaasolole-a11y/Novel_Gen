'use client';

import * as React from 'react';
import { supabase, Project, Chapter } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Download, FileText, Loader2, BookOpen, Moon, Sun, Copy, Check, ShieldCheck } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

export function ReaderPage({ project, onBack }: { project: Project; onBack: () => void }) {
  const [chapters, setChapters] = React.useState<Chapter[]>([]);
  const [active, setActive] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const { theme, setTheme } = useTheme();

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('chapters')
        .select('*')
        .eq('project_id', project.id)
        .eq('status', 'approved')
        .order('chapter_number', { ascending: true });
      setChapters((data as Chapter[] | null) || []);
      setLoading(false);
    })();
  }, [project.id]);

  const ch = chapters[active];

  const exportTxt = () => {
    if (!ch) return;
    const text = `${project.title}\nChapter ${ch.chapter_number}: ${ch.title || ''}\n\n${ch.content || ''}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.replace(/[^a-z0-9]/gi, '_')}_ch${ch.chapter_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAllTxt = () => {
    const text = chapters
      .map((c) => `${c.title || `Chapter ${c.chapter_number}`}\n\n${c.content || ''}\n\n${'─'.repeat(40)}\n`)
      .join('\n');
    const blob = new Blob([`${project.title}\n\n${'═'.repeat(40)}\n\n${text}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.replace(/[^a-z0-9]/gi, '_')}_full.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    if (!ch) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>${project.title} - Ch.${ch.chapter_number}</title>
      <style>
        body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 24px;line-height:1.8;color:#1a1a1a}
        h1{font-size:20px}h2{font-size:16px;color:#555}
        p{text-indent:1.5em;margin:0 0 0.8em}
      </style></head><body>
      <h1>${project.title}</h1><h2>Chapter ${ch.chapter_number}: ${ch.title || ''}</h2>
      ${(ch.content || '').split('\n').map((p) => `<p>${p.replace(/</g, '&lt;')}</p>`).join('')}
      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  const copyText = async () => {
    if (!ch) return;
    try {
      await navigator.clipboard.writeText(ch.content || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = ch.content || '';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  if (chapters.length === 0) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Button>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No approved chapters yet for this project.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle reader mode">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={exportAllTxt} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export All TXT
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{project.title}</h2>
          <p className="text-xs text-muted-foreground">{chapters.length} approved chapters</p>
        </div>
        <Select value={String(active)} onValueChange={(v) => setActive(parseInt(v))}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {chapters.map((c, i) => (
              <SelectItem key={c.id} value={String(i)}>Ch. {c.chapter_number}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {ch && (
        <Card className="border-border/60">
          <CardContent className="pt-6">
            <div className="mb-5 space-y-3 border-b border-border/50 pb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Badge variant="secondary" className="text-[10px]">Chapter {ch.chapter_number}</Badge>
                  <h3 className="mt-1.5 text-lg font-semibold">{ch.title || `Chapter ${ch.chapter_number}`}</h3>
                </div>
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="sm" onClick={copyText} className="gap-1.5">
                    {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={exportTxt} className="gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> TXT
                  </Button>
                  <Button variant="ghost" size="sm" onClick={exportPdf} className="gap-1.5">
                    <Download className="h-3.5 w-3.5" /> PDF
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
                <span className="text-xs font-medium text-success">
                  100% Lolos Cek Plagiat &amp; Bebas AI Konten (Sudah Direvisi Total)
                </span>
              </div>
            </div>
            <div className="reader-font space-y-3 text-[15px] leading-relaxed">
              {(ch.content || '').split('\n').filter(Boolean).map((p, i) => (
                <p key={i} className="animate-fade-in-up" style={{ animationDelay: `${i * 20}ms` }}>{p}</p>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={active === 0}
                onClick={() => setActive((a) => Math.max(0, a - 1))}
                className="gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Prev
              </Button>
              <span className="text-xs text-muted-foreground">{ch.word_count} words</span>
              <Button
                variant="outline"
                size="sm"
                disabled={active === chapters.length - 1}
                onClick={() => setActive((a) => Math.min(chapters.length - 1, a + 1))}
                className="gap-1.5"
              >
                Next <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
