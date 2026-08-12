"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type NumberMode = "indian" | "international";
type Theme = "dark" | "light";

interface MoneyOptions {
  sign?: boolean;
  decimals?: number;
  forceCompact?: boolean;
}

interface SettingsContextType {
  theme: Theme;
  toggleTheme: () => void;
  numberMode: NumberMode;
  setNumberMode: (mode: NumberMode) => void;
  compact: boolean;
  setCompact: (compact: boolean) => void;
  strategyFilter: string;
  setStrategyFilter: (id: string) => void;
  brokerFilter: string;
  setBrokerFilter: (id: string) => void;
  killed: boolean;
  setKilled: (killed: boolean) => void;
  money: (value: number, options?: MoneyOptions) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

function formatIndianNumber(num: number): string {
  const absNum = Math.abs(num);
  if (absNum >= 10000000) {
    return (num / 10000000).toFixed(2) + " Cr";
  }
  if (absNum >= 100000) {
    return (num / 100000).toFixed(2) + " L";
  }
  return num.toLocaleString("en-IN");
}

function formatInternationalNumber(num: number): string {
  const absNum = Math.abs(num);
  if (absNum >= 1000000000) {
    return (num / 1000000000).toFixed(2) + "B";
  }
  if (absNum >= 1000000) {
    return (num / 1000000).toFixed(2) + "M";
  }
  if (absNum >= 1000) {
    return (num / 1000).toFixed(2) + "K";
  }
  return num.toLocaleString("en-US");
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [numberMode, setNumberMode] = useState<NumberMode>("indian");
  const [compact, setCompact] = useState(false);
  const [strategyFilter, setStrategyFilter] = useState("all");
  const [brokerFilter, setBrokerFilter] = useState("all");
  const [killed, setKilled] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("light", savedTheme === "light");
    }
    const savedCompact = localStorage.getItem("compactNumbers");
    if (savedCompact) setCompact(savedCompact === "true");
    const savedNumberMode = localStorage.getItem("numberMode") as NumberMode | null;
    if (savedNumberMode) setNumberMode(savedNumberMode);
  }, []);

  const handleSetNumberMode = (mode: NumberMode) => {
    setNumberMode(mode);
    localStorage.setItem("numberMode", mode);
  };

  const handleSetCompact = (value: boolean) => {
    setCompact(value);
    localStorage.setItem("compactNumbers", String(value));
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("light", newTheme === "light");
  };

  const money = (value: number, options: MoneyOptions = {}): string => {
    const { sign = false, decimals = 2, forceCompact = false } = options;
    const prefix = sign && value >= 0 ? "+" : "";
    
    let formatted: string;
    if (forceCompact || compact || Math.abs(value) >= 100000) {
      formatted = numberMode === "indian" 
        ? formatIndianNumber(value) 
        : formatInternationalNumber(value);
    } else {
      formatted = value.toLocaleString(numberMode === "indian" ? "en-IN" : "en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }

    return `${prefix}₹${formatted}`;
  };

  return (
    <SettingsContext.Provider
      value={{
        theme,
        toggleTheme,
        numberMode,
        setNumberMode: handleSetNumberMode,
        compact,
        setCompact: handleSetCompact,
        strategyFilter,
        setStrategyFilter,
        brokerFilter,
        setBrokerFilter,
        killed,
        setKilled,
        money,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
