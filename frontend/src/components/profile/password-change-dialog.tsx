"use client";

import {
 useState } from "react";
import {
 toast } from "sonner";

import {
 Button } from "@/components/ui/button";
import {

  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
 Input } from "@/components/ui/input";
import {
 Label } from "@/components/ui/label";
import {
 useChangePassword } from "@/hooks/use-api";

export function PasswordChangeDialog() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const changeMutation = useChangePassword();

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrors({});
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!currentPassword) next.current = "Current password is required";
    if (!newPassword) next.new = "New password is required";
    else if (newPassword.length < 8) next.new = "Password must be at least 8 characters";
    if (newPassword !== confirmPassword) next.confirm = "Passwords do not match";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    changeMutation.mutate(
      { current_password: currentPassword, new_password: newPassword },
      {
        onSuccess: () => {
          toast.success("Password updated");
          reset();
          setOpen(false);
        },
        onError: () => toast.error("Failed to update password"),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-xs">
          Change password
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            Enter your current password and choose a new one (minimum 8 characters).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <PasswordField
            label="Current password"
            value={currentPassword}
            onChange={setCurrentPassword}
            error={errors.current}
          />
          <PasswordField
            label="New password"
            value={newPassword}
            onChange={setNewPassword}
            error={errors.new}
          />
          <PasswordField
            label="Confirm password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            error={errors.confirm}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={changeMutation.isPending}>
            {changeMutation.isPending ? "Updating..." : "Update password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-xs"
        autoComplete="off"
      />
      {error && <p className="text-[10px] text-loss">{error}</p>}
    </div>
  );
}
