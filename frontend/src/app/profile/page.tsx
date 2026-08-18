"use client";

import {
 User, EnvelopeSimple as Mail, Shield, Monitor, Trash as Trash2 } from "@phosphor-icons/react";
import {
 toast } from "sonner";

import {
 PageHeader, Panel, StatusPill } from "@/components/ui-kit";
import {
 Button } from "@/components/ui/button";
import {
 useProfile, useSessions, useRevokeSession } from "@/hooks/use-api";
import {
 formatDateTime } from "@/lib/format";

export default function ProfilePage() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions();
  const revokeMutation = useRevokeSession();

  const handleRevokeSession = (id: string) => {
    revokeMutation.mutate(id, {
      onSuccess: () => toast.success("Session revoked"),
      onError: () => toast.error("Failed to revoke session"),
    });
  };

  if (profileLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Profile"
        description="Manage your account settings and security"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Account Information" className="h-fit">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <User className="size-8 text-primary" weight="duotone" />
              </div>
              <div>
                <div className="font-semibold">{profile?.email}</div>
                <div className="flex items-center gap-2 mt-1">
                  <StatusPill status={profile?.subscription_tier || "FREE"} />
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="size-4 text-muted-foreground" weight="duotone" />
                <div>
                  <div className="text-sm font-medium">Email</div>
                  <div className="text-xs text-muted-foreground">{profile?.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Shield className="size-4 text-muted-foreground" weight="duotone" />
                <div>
                  <div className="text-sm font-medium">Subscription</div>
                  <div className="text-xs text-muted-foreground">
                    {profile?.subscription_tier} Plan
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Monitor className="size-4 text-muted-foreground" weight="duotone" />
                <div>
                  <div className="text-sm font-medium">Member Since</div>
                  <div className="text-xs text-muted-foreground">
                    {profile?.created_at ? formatDateTime(profile.created_at) : "N/A"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Active Sessions" className="h-fit">
          {sessionsLoading ? (
            <div className="text-sm text-muted-foreground">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-sm text-muted-foreground">No active sessions</div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Monitor className="size-5 text-muted-foreground" weight="duotone" />
                    <div>
                      <div className="text-sm font-medium">{session.device}</div>
                      <div className="text-xs text-muted-foreground">
                        {session.location} · {session.ip}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {session.is_current ? (
                          <span className="text-profit">Current session</span>
                        ) : (
                          session.last_active
                        )}
                      </div>
                    </div>
                  </div>
                  {!session.is_current && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-loss hover:bg-loss-muted"
                      onClick={() => handleRevokeSession(session.id)}
                      disabled={revokeMutation.isPending}
                    >
                      <Trash2 className="size-4" weight="bold" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Preferences">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <div className="text-sm font-medium">Theme</div>
              <div className="text-xs text-muted-foreground">Dark mode</div>
            </div>
            <StatusPill status="active" />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <div className="text-sm font-medium">Currency Format</div>
              <div className="text-xs text-muted-foreground">INR (Lakh/Crore)</div>
            </div>
            <StatusPill status="active" />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <div className="text-sm font-medium">Timezone</div>
              <div className="text-xs text-muted-foreground">Asia/Kolkata (IST)</div>
            </div>
            <StatusPill status="active" />
          </div>
        </div>
      </Panel>
    </div>
  );
}
