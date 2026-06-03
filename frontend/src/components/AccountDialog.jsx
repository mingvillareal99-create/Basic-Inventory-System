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
    if (!editing && !form.email.includes("@")) errs.email = "Enter a valid email address";
    if (!editing && form.password.length < 6) errs.password = "Use at least 6 characters";
    if (editing && form.password && form.password.length < 6) errs.password = "Use at least 6 characters";
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
          <DialogTitle className="text-xl">
            {editing ? "Edit account" : "Add a new account"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Update name, role, or reset their password."
              : "Create a sign-in for a team member."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="u-email">Email address</Label>
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
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="u-name">Full name</Label>
            <Input
              id="u-name"
              data-testid="user-name-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-11"
              placeholder="Alex Doe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="u-role">Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger data-testid="user-role-select" id="u-role" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personnel" data-testid="role-option-personnel">
                  Personnel (can buy and sell)
                </SelectItem>
                <SelectItem value="admin" data-testid="role-option-admin">
                  Admin (full access)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="u-password">
              {editing ? "New password (optional)" : "Password"}
            </Label>
            <Input
              id="u-password"
              data-testid="user-password-input"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="h-11"
              placeholder={editing ? "Leave empty to keep current password" : "At least 6 characters"}
            />
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="outline" data-testid="cancel-user-btn" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" data-testid="save-user-btn" className="bg-primary hover:bg-primary/90">
              {editing ? "Save changes" : "Create account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
