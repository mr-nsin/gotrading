"use client";

import { useState } from "react";
import { Shield, ShieldOff } from "lucide-react";
import { toast } from "sonner";

import { StatusPill } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useDisable2FA,
  useProfile,
  useSetup2FA,
  useVerify2FA,
} from "@/hooks/use-api";

export function TwoFactorSetup() {
  const { data: profile } = useProfile();
  const setupMutation = useSetup2FA();
  const verifyMutation = useVerify2FA();
  const disableMutation = useDisable2FA();

  const [setupMode, setSetupMode] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const enabled = profile?.two_factor_enabled ?? false;

  const handleSetup = () => {
    setupMutation.mutate(undefined, {
      onSuccess: (data) => {
        setQrUrl(data.qr_url);
        setSecret(data.secret);
        setSetupMode(true);
      },
      onError: () => toast.error("Failed to start 2FA setup"),
    });
  };

  const handleVerify = () => {
    if (code.length !== 6) {
      toast.error("Enter a 6-digit verification code");
      return;
    }
    verifyMutation.mutate(code, {
      onSuccess: () => {
        toast.success("Two-factor authentication enabled");
        setSetupMode(false);
        setQrUrl(null);
        setSecret(null);
        setCode("");
      },
      onError: () => toast.error("Invalid verification code"),
    });
  };

  const handleDisable = () => {
    disableMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Two-factor authentication disabled");
        setSetupMode(false);
        setQrUrl(null);
        setSecret(null);
      },
      onError: () => toast.error("Failed to disable 2FA"),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded border border-border bg-surface-2 px-3 py-2.5">
        <div className="flex items-center gap-3">
          {enabled ? (
            <Shield className="size-5 text-profit" />
          ) : (
            <ShieldOff className="size-5 text-muted-foreground" />
          )}
          <div>
            <div className="text-sm font-medium">Two-factor authentication</div>
            <div className="text-[11px] text-muted-foreground">TOTP via authenticator app</div>
          </div>
        </div>
        <StatusPill
          status={enabled ? "active" : "inactive"}
          label={enabled ? "enabled" : "disabled"}
          dot
        />
      </div>

      {setupMode && qrUrl && (
        <div className="rounded border border-border bg-surface-2 p-4 space-y-3">
          <p className="text-[11px] text-muted-foreground">
            Scan this QR code with your authenticator app, then enter the 6-digit code below.
          </p>
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="2FA QR code" className="size-[180px] rounded border border-border bg-white p-2" />
          </div>
          {secret && (
            <div className="text-center">
              <span className="text-[10px] text-muted-foreground">Manual entry key: </span>
              <span className="num text-[11px] font-mono">{secret}</span>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Verification code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="h-8 text-xs num text-center tracking-widest"
              placeholder="000000"
              maxLength={6}
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={handleVerify}
              disabled={verifyMutation.isPending}
            >
              {verifyMutation.isPending ? "Verifying..." : "Verify & enable"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => {
                setSetupMode(false);
                setQrUrl(null);
                setSecret(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!setupMode && (
        <div>
          {enabled ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-loss border-loss/30 hover:bg-loss-muted"
              onClick={handleDisable}
              disabled={disableMutation.isPending}
            >
              {disableMutation.isPending ? "Disabling..." : "Disable 2FA"}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={handleSetup}
              disabled={setupMutation.isPending}
            >
              {setupMutation.isPending ? "Setting up..." : "Setup 2FA"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
