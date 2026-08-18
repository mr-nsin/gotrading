"use client";

import {
 useEffect, useState } from "react";
import {
 toast } from "sonner";

import {
 useSettings } from "@/components/settings-provider";
import {
 Button } from "@/components/ui/button";
import {
 Label } from "@/components/ui/label";
import {

  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
 Switch } from "@/components/ui/switch";
import {
 usePreferences, useUpdatePreferences } from "@/hooks/use-api";

const TIMEZONES = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "America/New_York (EST)" },
  { value: "Europe/London", label: "Europe/London (GMT)" },
];

export function PreferencesForm() {
  const { theme, toggleTheme, numberMode, setNumberMode, compact, setCompact } = useSettings();
  const { data: prefs } = usePreferences();
  const updateMutation = useUpdatePreferences();
  const [timezone, setTimezone] = useState("Asia/Kolkata");

  useEffect(() => {
    if (prefs?.timezone) setTimezone(prefs.timezone);
    if (prefs?.compact_numbers !== undefined) setCompact(prefs.compact_numbers);
    if (prefs?.currency_format) {
      setNumberMode(prefs.currency_format.includes("LAKH") ? "indian" : "international");
    }
  }, [prefs, setCompact, setNumberMode]);

  const handleSave = () => {
    updateMutation.mutate(
      {
        theme,
        currency_format: numberMode === "indian" ? "INR_LAKH_CRORE" : "INR_M_B",
        compact_numbers: compact,
        timezone,
      },
      {
        onSuccess: () => toast.success("Preferences saved"),
        onError: () => toast.error("Failed to save preferences"),
      },
    );
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Currency format</Label>
        <Select
          value={numberMode}
          onValueChange={(v) => setNumberMode(v as "indian" | "international")}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="indian">Indian (Lakh / Crore)</SelectItem>
            <SelectItem value="international">International (Million / Billion)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between text-[12px]">
        <span>Compact number display</span>
        <Switch checked={compact} onCheckedChange={setCompact} />
      </div>

      <div className="flex items-center justify-between text-[12px]">
        <span>Dark terminal theme</span>
        <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
      </div>

      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Timezone</Label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        onClick={handleSave}
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending ? "Saving..." : "Save preferences"}
      </Button>
    </div>
  );
}
