import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2, Plus, RefreshCw, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AllowedEmail {
  email: string;
  addedAt: string;
}

export default function Admin() {
  const [newEmail, setNewEmail] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: emails, isLoading, refetch } = useQuery<AllowedEmail[]>({
    queryKey: ['/api/admin/allowed-emails'],
    queryFn: async () => {
      const res = await fetch('/api/admin/allowed-emails', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch emails');
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch('/api/admin/allowed-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add email');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/allowed-emails'] });
      setNewEmail('');
      toast({ title: 'Email added', description: 'User can now access the dashboard' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch(`/api/admin/allowed-emails/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove email');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/allowed-emails'] });
      toast({ title: 'Email removed', description: 'User access has been revoked' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmail.trim()) {
      addMutation.mutate(newEmail.trim());
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Access Management</h1>
          <p className="text-muted-foreground mt-1">Manage who can access the dashboard</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add User
          </CardTitle>
          <CardDescription>Enter an email address to grant dashboard access</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex gap-2">
            <Input
              type="email"
              placeholder="user@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1"
              data-testid="input-email"
            />
            <Button type="submit" disabled={addMutation.isPending || !newEmail.trim()} data-testid="button-add">
              {addMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Add'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Allowed Users
          </CardTitle>
          <CardDescription>{emails?.length || 0} users have access</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : emails && emails.length > 0 ? (
            <div className="space-y-2">
              {emails.map((item) => (
                <div
                  key={item.email}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  data-testid={`row-email-${item.email}`}
                >
                  <div>
                    <div className="font-mono text-sm">{item.email}</div>
                    <div className="text-xs text-muted-foreground">
                      Added {new Date(item.addedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeMutation.mutate(item.email)}
                    disabled={removeMutation.isPending}
                    data-testid={`button-remove-${item.email}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No users added yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
