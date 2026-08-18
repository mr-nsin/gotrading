"use client";

import {
 Bell, Check, Checks as CheckCheck } from "@phosphor-icons/react";
import {
 toast } from "sonner";

import {
 PageHeader, Panel, StatusPill } from "@/components/ui-kit";
import {
 Button } from "@/components/ui/button";
import {
 ScrollArea } from "@/components/ui/scroll-area";
import {

  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/use-api";
import {
 formatRelativeTime } from "@/lib/format";
import {
 cn } from "@/lib/utils";

export default function NotificationsPage() {
  const { data: notifications = [], isLoading } = useNotifications();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const handleMarkRead = (id: string) => {
    markReadMutation.mutate(id);
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate(undefined, {
      onSuccess: (data) => toast.success(`Marked ${data.count} notifications as read`),
    });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const categoryIcons: Record<string, string> = {
    trade: "📈",
    risk: "⚠️",
    broker: "🔌",
    system: "⚙️",
  };

  return (
    <div className="space-y-3">
      <PageHeader
        title="Notifications"
        description="Stay updated with trading alerts and system notifications"
        actions={
          unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="mr-2 size-4" weight="bold" />
              Mark all read
            </Button>
          )
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <div className="panel px-4 py-3">
          <div className="text-xs text-muted-foreground">Unread</div>
          <div className="num mt-1 text-xl font-semibold">{unreadCount}</div>
        </div>
        <div className="panel px-4 py-3">
          <div className="text-xs text-muted-foreground">Trade Alerts</div>
          <div className="num mt-1 text-xl font-semibold text-profit">
            {notifications.filter((n) => n.category === "trade").length}
          </div>
        </div>
        <div className="panel px-4 py-3">
          <div className="text-xs text-muted-foreground">Risk Alerts</div>
          <div className="num mt-1 text-xl font-semibold text-warn">
            {notifications.filter((n) => n.category === "risk").length}
          </div>
        </div>
        <div className="panel px-4 py-3">
          <div className="text-xs text-muted-foreground">System</div>
          <div className="num mt-1 text-xl font-semibold text-muted-foreground">
            {notifications.filter((n) => n.category === "system").length}
          </div>
        </div>
      </div>

      <Panel title="All Notifications" bodyClassName="">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
            <Bell className="mb-2 size-8 opacity-50" weight="duotone" />
            <span className="text-xs">No notifications</span>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-320px)]">
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex gap-3 px-4 py-3 transition-colors",
                    !n.read && "bg-accent/30"
                  )}
                >
                  <div className="text-xl">{categoryIcons[n.category] || "📌"}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{n.title}</span>
                          <StatusPill status={n.level} />
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                      </div>
                      {!n.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => handleMarkRead(n.id)}
                        >
                          <Check className="size-3.5" weight="bold" />
                        </Button>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {formatRelativeTime(n.time)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </Panel>
    </div>
  );
}
