'use client';

import * as React from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Lock, Loader2, UserCircle, Save, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function AccountSettingsPage() {
  const { user } = useAuth();
  const [newEmail, setNewEmail] = React.useState(user?.email || '');
  const [newPassword, setNewPassword] = React.useState('');
  const [savingEmail, setSavingEmail] = React.useState(false);
  const [savingPassword, setSavingPassword] = React.useState(false);

  const updateEmail = async () => {
    if (!newEmail.trim()) {
      toast.error('Email cannot be empty');
      return;
    }
    setSavingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      toast.success('Email updated. Check your inbox to confirm the change.');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update email');
    } finally {
      setSavingEmail(false);
    }
  };

  const updatePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated successfully');
      setNewPassword('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Account Settings</h2>
        <p className="text-sm text-muted-foreground">Manage your admin credentials securely.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-primary" /> Email Address
          </CardTitle>
          <CardDescription>Change the email used to sign in. You may need to confirm the new email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-email">New Email</Label>
            <Input id="new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="admin@example.com" />
          </div>
          <Button onClick={updateEmail} disabled={savingEmail} className="gap-2">
            {savingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Update Email
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-primary" /> Password
          </CardTitle>
          <CardDescription>Set a new password (minimum 6 characters).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-pass">New Password</Label>
            <Input id="new-pass" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <Button onClick={updatePassword} disabled={savingPassword} className="gap-2">
            {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Update Password
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCircle className="h-4 w-4 text-primary" /> Current Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Signed in as <span className="font-medium text-foreground">{user?.email || 'unknown'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
