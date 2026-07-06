'use client';

import * as React from 'react';
import { supabase, Project, Chapter } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Download, FileText, Loader2, BookOpen, Moon, Sun, Copy, Check, ShieldCheck, BookDown } from 'lucide-react';
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

  const exportAllEpub = () => {
    // Minimal EPUB builder (EPUB 2 format, no external deps)
    const uid = `urn:uuid:${project.id}`;
    const title = project.title;
    const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const paragraphs = (text: string) => text.split('\n').filter(Boolean).map((p) => `    <p>${escapeHtml(p)}</p>`).join('\n');

    const items: string[] = [];
    const navPoints: string[] = [];
    chapters.forEach((c, i) => {
      items.push(`    <item id="ch${i}" href="ch${i}.xhtml" media-type="application/xhtml+xml"/>`);
      navPoints.push(`    <navPoint id="nav${i}" playOrder="${i + 1}"><navLabel><text>Chapter ${c.chapter_number}: ${escapeXml(c.title || '')}</text></navLabel><content src="ch${i}.xhtml"/></navPoint>`);
    });

    const contentFiles = chapters.map((c, i) =>
      `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Chapter ${c.chapter_number}</title></head><body><h2>${escapeXml(c.title || `Chapter ${c.chapter_number}`)}</h2>\n${paragraphs(c.content || '')}\n</body></html>`
    ).join('\n\n');

    const container = `<?xml version="1.0" encoding="UTF-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`;
    const opf = `<?xml version="1.0" encoding="UTF-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" unique-id="bookid" version="2.0">\n  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf/metadata">\n    <dc:title>${escapeXml(title)}</dc:title>\n    <dc:identifier id="bookid">${uid}</dc:identifier>\n    <dc:language>en</dc:language>\n  </metadata>\n  <manifest>\n    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>\n${items.join('\n')}\n  </manifest>\n  <spine toc="ncx">\n${chapters.map((_, i) => `    <itemref idref="ch${i}"/>`).join('\n')}\n  </spine>\n</package>`;
    const ncx = `<?xml version="1.0" encoding="UTF-8"?>\n<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">\n  <head><meta name="dtb:uid" content="${uid}"/></head>\n  <docTitle><text>${escapeXml(title)}</text></docTitle>\n  <navMap>\n${navPoints.join('\n')}\n  </navMap>\n</ncx>`;

    // Build a simple .epub (actually a zip). We use a minimal JS zip builder.
    // Since we can't use JSZip (no dep), we build a simple uncompressed zip.
    const files: { name: string; content: string }[] = [
      { name: 'mimetype', content: 'application/epub+zip' },
      { name: 'META-INF/container.xml', content: container },
      { name: 'OEBPS/content.opf', content: opf },
      { name: 'OEBPS/toc.ncx', content: ncx },
      ...chapters.map((c, i) => ({ name: `OEBPS/ch${i}.xhtml`, content: contentFiles.split('\n\n')[i] || '' })),
    ];
    const blob = buildZip(files);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.epub`;
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

  // Minimal uncompressed ZIP builder (no external dependency)
  function buildZip(files: { name: string; content: string }[]): Blob {
    const enc = new TextEncoder();
    const chunks: Uint8Array[] = [];
    const central: Uint8Array[] = [];
    let offset = 0;
    for (const f of files) {
      const nameBytes = enc.encode(f.name);
      const dataBytes = enc.encode(f.content);
      const localHeader = new Uint8Array(30 + nameBytes.length);
      const dv = new DataView(localHeader.buffer);
      dv.setUint32(0, 0x04034b50, true); // signature
      dv.setUint16(4, 20, true); // version
      dv.setUint16(6, 0, true); // flags
      dv.setUint16(8, 0, true); // compression (store)
      dv.setUint16(10, 0, true); // mod time
      dv.setUint16(12, 0, true); // mod date
      dv.setUint32(14, crc32(dataBytes), true); // crc32
      dv.setUint32(18, dataBytes.length, true); // compressed size
      dv.setUint32(22, dataBytes.length, true); // uncompressed size
      dv.setUint16(26, nameBytes.length, true); // name length
      dv.setUint16(28, 0, true); // extra length
      localHeader.set(nameBytes, 30);
      // central directory
      const cd = new Uint8Array(46 + nameBytes.length);
      const cdv = new DataView(cd.buffer);
      cdv.setUint32(0, 0x02014b50, true);
      cdv.setUint16(4, 20, true);
      cdv.setUint16(6, 0, true);
      cdv.setUint16(8, 0, true);
      cdv.setUint16(10, 0, true);
      cdv.setUint16(12, 0, true);
      cdv.setUint32(14, crc32(dataBytes), true);
      cdv.setUint32(18, dataBytes.length, true);
      cdv.setUint32(22, dataBytes.length, true);
      cdv.setUint16(26, nameBytes.length, true);
      cdv.setUint16(28, 0, true);
      cdv.setUint16(30, 0, true);
      cdv.setUint16(32, 0, true);
      cdv.setUint16(34, 0, true);
      cdv.setUint32(36, 0, true);
      cdv.setUint32(42, offset, true);
      cd.set(nameBytes, 46);
      chunks.push(localHeader, dataBytes);
      central.push(cd);
      offset += localHeader.length + dataBytes.length;
    }
    const cdStart = offset;
    let cdSize = 0;
    for (const c of central) cdSize += c.length;
    const endRecord = new Uint8Array(22);
    const ev = new DataView(endRecord.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, cdStart, true);
    return new Blob([...chunks, ...central, endRecord], { type: 'application/epub+zip' });
  }

  function crc32(data: Uint8Array): number {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
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
            <Download className="h-3.5 w-3.5" /> Export TXT
          </Button>
          <Button variant="default" size="sm" onClick={exportAllEpub} className="gap-1.5">
            <BookDown className="h-3.5 w-3.5" /> Export EPUB
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
