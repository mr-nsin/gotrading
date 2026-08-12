"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile, useUpdateProfile } from "@/hooks/use-api";
import type { Profile } from "@/lib/api";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const MOBILE_REGEX = /^(\+91\s?)?[6-9]\d{9}$/;

function validate(form: Pick<Profile, "name" | "email" | "mobile" | "pan">) {
  const errors: Record<string, string> = {};
  if (!form.name?.trim()) errors.name = "Name is required";
  if (!form.email?.trim()) errors.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Invalid email";
  if (form.mobile && !MOBILE_REGEX.test(form.mobile.replace(/\s/g, ""))) {
    errors.mobile = "Invalid mobile number";
  }
  if (form.pan && !PAN_REGEX.test(form.pan.toUpperCase())) {
    errors.pan = "Invalid PAN format (e.g. ABCPM1234K)";
  }
  return errors;
}

export function AccountForm() {
  const { data: profile, isLoading } = useProfile();
  const updateMutation = useUpdateProfile();

  const [form, setForm] = useState({ name: "", email: "", mobile: "", pan: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name ?? "",
        email: profile.email ?? "",
        mobile: profile.mobile ?? "",
        pan: profile.pan ?? "",
      });
    }
  }, [profile]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSave = () => {
    const validation = validate(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    updateMutation.mutate(
      {
        name: form.name.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        pan: form.pan.toUpperCase().trim(),
      },
      {
        onSuccess: () => toast.success("Profile updated"),
        onError: () => toast.error("Failed to update profile"),
      },
    );
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading account details...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Full name"
          value={form.name}
          onChange={(v) => handleChange("name", v)}
          error={errors.name}
        />
        <Field
          label="Email"
          value={form.email}
          onChange={(v) => handleChange("email", v)}
          error={errors.email}
          className="num"
        />
        <Field
          label="Mobile"
          value={form.mobile}
          onChange={(v) => handleChange("mobile", v)}
          error={errors.mobile}
          className="num"
          placeholder="+91 98200 41235"
        />
        <Field
          label="PAN"
          value={form.pan}
          onChange={(v) => handleChange("pan", v.toUpperCase())}
          error={errors.pan}
          className="num uppercase"
          placeholder="ABCPM1234K"
        />
      </div>
      <Button
        size="sm"
        className="h-8 text-xs"
        onClick={handleSave}
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending ? "Saving..." : "Save changes"}
      </Button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  className,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  className?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-8 text-xs ${className ?? ""}`}
        placeholder={placeholder}
      />
      {error && <p className="text-[10px] text-loss">{error}</p>}
    </div>
  );
}
