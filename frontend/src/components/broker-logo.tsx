import {
 useState } from "react";
import {
 cn } from "@/lib/utils";

const BROKER_DOMAINS: Record<string, string> = {
  "zerodha": "zerodha.com",
  "kite": "zerodha.com",
  "upstox": "upstox.com",
  "angel one": "angelone.in",
  "angel": "angelone.in",
  "fyers": "fyers.in",
  "dhan": "dhan.co",
  "alice blue": "aliceblueonline.com",
  "5paisa": "5paisa.com",
  "kotak neo": "kotaksecurities.com",
  "kotak": "kotaksecurities.com",
  "groww": "groww.in",
  "icici": "icicidirect.com",
  "hdfc": "hdfcsec.com",
  "finvasia": "finvasia.com",
  "flattrade": "flattrade.in",
  "interactive": "interactivebrokers.com",
  "shoonya": "finvasia.com"
};

const BROKER_COLORS: Record<string, string> = {
  zerodha: "#ff5722",
  upstox: "#673ab7",
  "angel one": "#ff9800",
  fyers: "#2196f3",
  dhan: "#009688",
  "alice blue": "#3f51b5",
  "5paisa": "#4caf50",
  "kotak neo": "#e91e63",
  finvasia: "#607d8b",
  flattrade: "#00bcd4",
  interactive: "#f44336",
};

function getBrokerColor(name: string) {
  const normalized = (name || "").toLowerCase().trim();
  for (const key in BROKER_COLORS) {
    if (normalized.includes(key)) return BROKER_COLORS[key];
  }
  return "#888888";
}

function getBrokerInitials(name: string) {
  if (!name) return "B";
  return name.slice(0, 2).toUpperCase();
}

interface BrokerLogoProps {
  name: string;
  size?: number;
  className?: string;
}

export function BrokerLogo({ name, size = 36, className }: BrokerLogoProps) {
  const [error, setError] = useState(false);
  
  const normalized = (name || "").toLowerCase().trim();
  let domain = "";
  for (const key in BROKER_DOMAINS) {
    if (normalized.includes(key)) {
      domain = BROKER_DOMAINS[key];
      break;
    }
  }

  const src = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null;

  if (error || !src) {
    return (
      <div
        className={cn("flex items-center justify-center rounded-md border border-border bg-surface-2 font-bold shrink-0", className)}
        style={{ width: size, height: size, color: getBrokerColor(name), fontSize: Math.max(10, size / 2.5) }}
      >
        {getBrokerInitials(name)}
      </div>
    );
  }

  return (
    <div 
      className={cn("overflow-hidden rounded-md border border-border bg-white flex items-center justify-center shrink-0", className)}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="w-full h-full object-contain p-1"
        onError={() => setError(true)}
      />
    </div>
  );
}
