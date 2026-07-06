'use client';

import * as React from 'react';
import { supabase, ApiKeyRow } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { KeyRound, Eye, EyeOff, Save, CheckCircle2, AlertTriangle, ExternalLink, Zap, Brain, Router } from 'lucide-react';
import { toast } from 'sonner';

type ProviderKey = {
  provider: 'groq' | 'gemini' | 'openrouter';
  label: string;
  model: string;
  agent: string;
  icon: React.ElementType;
  link: string;
  placeholder: string;
};

const PROVIDERS: ProviderKey[] = [
  {
    provider: 'groq',
    label: 'Groq API Key',
    model: 'Llama-3.3-70b-Versatile',
    agent: 'Agent 1 · World Architect + Agent 2 · Outline Plotter',
    icon: Zap,
    link: 'https://console.groq.com/keys',
    placeholder: 'gsk_...',
  },
  {
    provider: 'gemini',
    label: 'Google Gemini API Key',
    model: 'Gemini 1.5 Pro',
    agent: 'Agent 3 · Creative Novelist',
    icon: Brain,
    link: 'https://aistudio.google.com/app/apikey',
    placeholder: 'AIza...',
  },
  {
    provider: 'openrouter',
    label: 'OpenRouter API Key',
    model: 'DeepSeek-V3 / Gemini',
    agent: 'Agent 4 · Chief Editor + Agent 5 · Quality Controller',
    icon: Router,
    link: 'https://openrouter.ai/keys',
    placeholder: 'sk-or-...',
  },
];

export function ApiKeysPage() {
  const [keys, setKeys] = React.useState<Record<string, string>>({});
  const [saved, setSaved] = React.useState<Record<string, boolean>>({});
  const [show, setShow] = React.useState<Record<string, boolean>>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.from('api_keys').select('*');
      const map: Record<string, string> = {};
      (data as ApiKeyRow[] | null)?.forEach((r) => {
        map[r.provider] = r.api_key;
      });
      setKeys(map);
      setLoading(false);
    })();
  }, []);

  const save = async (provider: string) => {
    const value = keys[provider]?.trim();
    if (!value) {
      toast.error('API key cannot be empty');
      return;
    }
    const { error } = await supabase
      .from('api_keys')
      .upsert({ provider, api_key: value }, { onConflict: 'provider,user_id' });
    if (error) {
      toast.error('Failed to save: ' + error.message);
      return;
    }
    setSaved((s) => ({ ...s, [provider]: true }));
    toast.success(`${provider} key saved to database`);
    setTimeout(() => setSaved((s) => ({ ...s, [provider]: false })), 2000);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-semibold tracking-tight">API Key Configuration</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Keys are stored in your Supabase database and read by the Railway backend at generation time. Use free-tier keys from each provider.
        </p>
      </div>

      <div className="grid gap-4">
        {PROVIDERS.map((p) => {
          const Icon = p.icon;
          const hasKey = !!keys[p.provider];
          return (
            <Card key={p.provider} className="overflow-hidden border-border/60 transition-colors hover:border-primary/40">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{p.label}</CardTitle>
                      <CardDescription className="mt-0.5 text-xs">{p.agent}</CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {hasKey ? (
                      <Badge variant="default" className="bg-success/15 text-success hover:bg-success/20">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Configured
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-warning-foreground bg-warning/15">
                        <AlertTriangle className="mr-1 h-3 w-3" /> Required
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">{p.model}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor={p.provider} className="text-xs">
                    Secret Key
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id={p.provider}
                        type={show[p.provider] ? 'text' : 'password'}
                        placeholder={p.placeholder}
                        value={keys[p.provider] || ''}
                        onChange={(e) => setKeys((k) => ({ ...k, [p.provider]: e.target.value }))}
                        className="pr-10 font-mono text-sm"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShow((s) => ({ ...s, [p.provider]: !s[p.provider] }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {show[p.provider] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button onClick={() => save(p.provider)} size="default" className="gap-1.5">
                      {saved[p.provider] ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                      Save
                    </Button>
                  </div>
                </div>
                <a
                  href={p.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Get free key <ExternalLink className="h-3 w-3" />
                </a>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="pt-6 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
            Keys never leave your own Supabase project. The Railway backend reads them only when you press a Generate button (on-demand).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
