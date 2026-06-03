import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const empty = { email: "", password: "", name: "", role: "personnel" };

export default function AccountDialog({ open, onOpenChange, user, onSave }) {
  const editing = !!user;
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) {
      setForm({ email: user.email, password: "", name: user.name || "", role: user.role });
    } else {
      setForm(empty);
    }
    setErrors({});
  }, [user, open]);

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!editing && !form.email.includes("@")) errs.email = "Valid email required";
    if (!editing && form.password.length < 6) errs.password = "Min 6 characters";
    if (editing && form.password && form.password.length < 6) errs.password = "Min 6 characters";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    if (editing) {
      const payload = { name: form.name || null, role: form.role };
      if (form.password) payload.password = form.password;
      onSave(payload);
    } else {
      onSave({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        name: form.name || null,
        role: form.role,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="account-dialog" className="max-w-md">
        <DialogHeader>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {editing ? "Edit account" : "New account"}
          </p>
          <DialogTitle className="text-2xl">
            {editing ? "Update access" : "Add a teammate"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Change name, role, or reset their password."
              : "Create a new login. Personnel can buy and sell. Admins can do anything."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="u-email" className="font-mono text-[10px] uppercase tracking-[0.2em]">Email</Label>
            <Input
              id="u-email"
              data-testid="user-email-input"
              type="email"
              value={form.email}
              disabled={editing}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="h-11"
              placeholder="alex@company.com"
            />
            {errors.email && <p className="text-xs text-destructive font-mono">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="u-name" className="font-mono text-[10px] uppercase tracking-[0.2em]">Name</Label>
            <Input
              id="u-name"
              data-testid="user-name-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-11"
              placeholder="Alex Doe"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="u-role" className="font-mono text-[10px] uppercase tracking-[0.2em]">Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger data-testid="user-role-select" id="u-role" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personnel" data-testid="role-option-personnel">Personnel</SelectItem>
                <SelectItem value="admin" data-testid="role-option-admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="u-password" className="font-mono text-[10px] uppercase tracking-[0.2em]">
              {editing ? "Reset password (optional)" : "Password"}
            </Label>
            <Input
              id="u-password"
              data-testid="user-password-input"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="h-11"
              placeholder={editing ? "Leave empty to keep current" : "min 6 characters"}
            />
            {errors.password && <p className="text-xs text-destructive font-mono">{errors.password}</p>}
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="outline" data-testid="cancel-user-btn" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" data-testid="save-user-btn">
              {editing ? "Save changes" : "Create account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
