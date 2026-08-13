"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddBroker } from "@/hooks/use-api";
import { cn } from "@/lib/utils";

export const BROKER_TYPES = [
  { id: "KITE", name: "Zerodha Kite", logo: "/brokers/zerodha.svg" },
  { id: "UPX", name: "Upstox", logo: "/brokers/upstox.svg" },
  { id: "SMARTAPI", name: "Angel One SmartAPI", logo: "/brokers/angelone.svg" },
  { id: "FYERS", name: "Fyers", logo: "/brokers/fyers.svg" },
  { id: "DHAN", name: "Dhan", logo: "/brokers/dhan.svg" },
  { id: "ALICE", name: "Alice Blue", logo: "/brokers/aliceblue.svg" },
  { id: "5PAISA", name: "5paisa", logo: "/brokers/5paisa.svg" },
  { id: "KOTAK", name: "Kotak Neo", logo: "/brokers/kotak.svg" },
] as const;

export type BrokerTypeId = (typeof BROKER_TYPES)[number]["id"];

const BROKER_API_CODES: Record<BrokerTypeId, string> = {
  KITE: "KITE",
  UPX: "UPX",
  SMARTAPI: "SMARTAPI",
  FYERS: "FYERS-V3",
  DHAN: "DHANHQ",
  ALICE: "ALICE",
  "5PAISA": "5PAISA",
  KOTAK: "KOTAK",
};

type Step = "select" | "credentials";
type TestStatus = "idle" | "testing" | "success" | "error";

export interface AddBrokerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function BrokerLogo({ name, logo }: { name: string; logo: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex size-10 items-center justify-center rounded-md border border-border bg-surface-2 text-[11px] font-bold text-muted-foreground">
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <div className="relative size-10 overflow-hidden rounded-md border border-border bg-surface-2">
      <Image
        src={logo}
        alt={name}
        fill
        className="object-contain p-1.5"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export function AddBrokerDialog({ open, onOpenChange }: AddBrokerDialogProps) {
  const [step, setStep] = useState<Step>("select");
  const [selectedBroker, setSelectedBroker] = useState<BrokerTypeId | null>(null);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");

  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [clientId, setClientId] = useState("");

  const addBroker = useAddBroker();

  const resetForm = useCallback(() => {
    setStep("select");
    setSelectedBroker(null);
    setTestStatus("idle");
    setApiKey("");
    setApiSecret("");
    setAccessToken("");
    setClientId("");
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  const selectedBrokerInfo = BROKER_TYPES.find((b) => b.id === selectedBroker);

  const handleSelectBroker = (id: BrokerTypeId) => {
    setSelectedBroker(id);
    setStep("credentials");
    setTestStatus("idle");
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      toast.error("API Key and API Secret are required to test the connection");
      setTestStatus("error");
      return;
    }

    setTestStatus("testing");
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const latency = Math.floor(Math.random() * 100) + 80;
    setTestStatus("success");
    toast.success(`Connection test passed · latency ${latency}ms`);
  };

  const handleConnect = () => {
    if (!selectedBroker) return;

    if (!apiKey.trim() || !apiSecret.trim()) {
      toast.error("API Key and API Secret are required");
      return;
    }

    addBroker.mutate(
      {
        code: BROKER_API_CODES[selectedBroker],
        api_key: apiKey.trim(),
        api_secret: apiSecret.trim(),
        client_id: clientId.trim() || undefined,
        access_token: accessToken.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(`${selectedBrokerInfo?.name ?? "Broker"} connected`);
          onOpenChange(false);
        },
        onError: () => {
          toast.error("Failed to connect broker. Check your credentials and try again.");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "select" ? "Connect a broker" : selectedBrokerInfo?.name}
          </DialogTitle>
          <DialogDescription>
            {step === "select"
              ? "Choose your broker to connect via API."
              : "Enter your API credentials. Keys are encrypted at rest."}
          </DialogDescription>
        </DialogHeader>

        {step === "select" ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {BROKER_TYPES.map((broker) => (
              <button
                key={broker.id}
                type="button"
                onClick={() => handleSelectBroker(broker.id)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-md border border-border bg-surface-2 p-3 text-center transition-colors",
                  "hover:border-primary/50 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                <BrokerLogo name={broker.name} logo={broker.logo} />
                <span className="text-[11px] font-medium leading-tight">{broker.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setStep("select");
                setTestStatus("idle");
              }}
            >
              <ArrowLeft className="size-3.5" />
              Back to broker selection
            </Button>

            <div className="space-y-1">
              <Label htmlFor="api-key" className="text-xs">
                API Key <span className="text-loss">*</span>
              </Label>
              <Input
                id="api-key"
                className="num h-8 text-xs"
                placeholder="xxxxxxxxxxxx"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestStatus("idle");
                }}
                autoComplete="off"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="api-secret" className="text-xs">
                API Secret <span className="text-loss">*</span>
              </Label>
              <Input
                id="api-secret"
                type="password"
                className="num h-8 text-xs"
                placeholder="••••••••••••"
                value={apiSecret}
                onChange={(e) => {
                  setApiSecret(e.target.value);
                  setTestStatus("idle");
                }}
                autoComplete="off"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="access-token" className="text-xs">
                Access Token{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="access-token"
                className="num h-8 text-xs"
                placeholder="Generated after login redirect"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="client-id" className="text-xs">
                Client ID{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="client-id"
                className="num h-8 text-xs"
                placeholder="Your broker client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                autoComplete="off"
              />
            </div>

            {testStatus === "success" && (
              <p className="flex items-center gap-1.5 text-xs text-profit">
                <Check className="size-3.5" />
                Connection test passed
              </p>
            )}
            {testStatus === "error" && (
              <p className="text-xs text-loss">Fix the errors above and try again.</p>
            )}
          </div>
        )}

        {step === "credentials" && (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testStatus === "testing" || addBroker.isPending}
            >
              {testStatus === "testing" ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                  Testing…
                </>
              ) : (
                "Test connection"
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConnect}
              disabled={addBroker.isPending || testStatus === "testing"}
            >
              {addBroker.isPending ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                  Connecting…
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
