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

const empty = { username: "", password: "", name: "", role: "personnel" };

export default function AccountDialog({ open, onOpenChange, user, onSave }) {
  const editing = !!user;
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) {
      setForm({ username: user.username, password: "", name: user.name || "", role: user.role });
    } else {
      setForm(empty);
    }
    setErrors({});
  }, [user, open]);

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!editing && form.username.trim().length < 3) errs.username = "Username must be at least 3 characters";
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
        username: form.username.trim().toLowerCase(),
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
            <Label htmlFor="u-username">Username</Label>
            <Input
              id="u-username"
              data-testid="user-username-input"
              type="text"
              value={form.username}
              disabled={editing}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="h-11"
              placeholder="e.g. alex"
            />
            {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
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
