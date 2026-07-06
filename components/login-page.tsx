'use client';

import * as React from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookOpen, Mail, Lock, Loader2, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      toast.error('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      toast.success('Signed in');
    } catch (e: any) {
      toast.error(e.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0f] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-emerald-500/20 blur-[120px]" />
        <div className="absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-yellow-400/15 blur-[120px]" />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/10 blur-[100px]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-yellow-400 shadow-2xl shadow-emerald-500/30">
              <BookOpen className="h-7 w-7 text-black" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">AI Webnovel Generator</h1>
            <p className="mt-1 text-sm text-white/50">Self-Hosted Ultra Edition · Private Workspace</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl sm:p-8">
            <div className="mb-5 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-medium text-white/70">Admin Sign In</span>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-white/70">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !loading && handleSignIn()}
                    className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-white/70">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !loading && handleSignIn()}
                    className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30"
                  />
                </div>
              </div>
              <Button onClick={handleSignIn} disabled={loading} className="w-full bg-emerald-400 text-black hover:bg-emerald-300">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                Sign In
              </Button>
            </div>

            <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] text-white/40">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              Private & secure · Single-admin workspace · No public registration
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
