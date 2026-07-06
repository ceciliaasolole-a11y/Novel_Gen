'use client';

import * as React from 'react';
import { AppShell, TabId } from '@/components/app-shell';
import { DashboardPage } from '@/components/dashboard-page';
import { StoryBibleExplorer } from '@/components/story-bible-explorer';
import { CreateNovelPage } from '@/components/create-novel-page';
import { MonitorPage } from '@/components/monitor-page';
import { ReaderPage } from '@/components/reader-page';
import { ApiKeysPage } from '@/components/api-keys-page';
import { AccountSettingsPage } from '@/components/account-settings-page';
import { LoginPage } from '@/components/login-page';
import { useAuth } from '@/components/auth-provider';
import type { Project } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { session, loading } = useAuth();
  const [tab, setTab] = React.useState<TabId>('dashboard');
  const [activeProject, setActiveProject] = React.useState<Project | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [bibleOpen, setBibleOpen] = React.useState(false);
  const [bibleProject, setBibleProject] = React.useState<Project | null>(null);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  const goMonitor = (p: Project) => { setActiveProject(p); setTab('monitor'); };
  const goReader = (p: Project) => { setActiveProject(p); setTab('reader'); };
  const goNew = () => setTab('create');
  const goBible = (p: Project) => { setBibleProject(p); setBibleOpen(true); };

  return (
    <AppShell active={tab} onTab={setTab}>
      {tab === 'dashboard' && (
        <DashboardPage onNew={goNew} onOpenMonitor={goMonitor} onOpenReader={goReader} onOpenBible={goBible} refreshKey={refreshKey} />
      )}
      {tab === 'create' && (
        <CreateNovelPage
          onCreated={(p) => {
            setRefreshKey((k) => k + 1);
            setActiveProject(p);
            setTab('dashboard');
          }}
        />
      )}
      {tab === 'monitor' && activeProject && (
        <MonitorPage project={activeProject} onBack={() => { setRefreshKey((k) => k + 1); setTab('dashboard'); }} />
      )}
      {tab === 'monitor' && !activeProject && (
        <div className="py-20 text-center text-sm text-muted-foreground">Select a project from the dashboard first.</div>
      )}
      {tab === 'reader' && activeProject && (
        <ReaderPage project={activeProject} onBack={() => setTab('dashboard')} />
      )}
      {tab === 'reader' && !activeProject && (
        <div className="py-20 text-center text-sm text-muted-foreground">Select a project from the dashboard first.</div>
      )}
      {tab === 'apikeys' && <ApiKeysPage />}
      {tab === 'account' && <AccountSettingsPage />}
      {bibleProject && (
        <StoryBibleExplorer
          projectId={bibleProject.id}
          title={bibleProject.title}
          open={bibleOpen}
          onOpenChange={setBibleOpen}
          project={bibleProject}
          onPhase2Start={() => { setRefreshKey((k) => k + 1); goMonitor(bibleProject); }}
        />
      )}
    </AppShell>
  );
}
