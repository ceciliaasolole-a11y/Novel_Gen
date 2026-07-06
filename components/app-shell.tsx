'use client';

import * as React from 'react';
import { BookOpen, Settings, PenLine, LayoutDashboard, Eye, Activity, KeyRound, Sparkles, Moon, Sun, LogOut } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type TabId = 'dashboard' | 'create' | 'monitor' | 'reader' | 'apikeys' | 'account';

const NAV: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'create', label: 'New Novel', icon: PenLine },
  { id: 'monitor', label: 'Live Monitor', icon: Activity },
  { id: 'reader', label: 'Reader', icon: Eye },
  { id: 'apikeys', label: 'API Keys', icon: KeyRound },
  { id: 'account', label: 'Account', icon: Settings },
];

export function AppShell({
  active,
  onTab,
  children,
}: {
  active: TabId;
  onTab: (t: TabId) => void;
  children: React.ReactNode;
}) {
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const email = user?.email || 'User';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/20">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-semibold tracking-tight sm:text-base">AI Webnovel Generator</h1>
              <p className="hidden text-[11px] text-muted-foreground sm:block">Self-Hosted Ultra Edition</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-8 items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-2 pr-3 text-xs font-medium transition-colors hover:bg-muted">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase">
                    {email.charAt(0)}
                  </span>
                  <span className="hidden max-w-[140px] truncate sm:inline">{email}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <nav className="mx-auto max-w-7xl px-2 sm:px-6">
          <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-thin">
            {NAV.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTab(item.id)}
                  className={cn(
                    'group relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all sm:text-sm',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className={cn('h-4 w-4', isActive && 'text-primary')} />
                  <span className="whitespace-nowrap">{item.label}</span>
                  {isActive && (
                    <span className="absolute -bottom-2 left-3 right-3 h-0.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <footer className="mx-auto max-w-7xl px-4 pb-8 pt-4 text-center text-[11px] text-muted-foreground sm:px-6">
        <div className="flex items-center justify-center gap-1.5">
          <Sparkles className="h-3 w-3" />
          <span>5-Agent Pipeline · Groq · Gemini · OpenRouter · On-Demand Execution</span>
        </div>
      </footer>
    </div>
  );
}
