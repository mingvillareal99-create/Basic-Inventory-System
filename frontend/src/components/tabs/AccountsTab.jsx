import { useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AccountDialog from "@/components/AccountDialog";
import { Plus, PencilSimple, Trash, ShieldStar, User } from "@phosphor-icons/react";

function formatDate(iso) {
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }); }
  catch { return iso; }
}

export default function AccountsTab({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/users");
      setUsers(data);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const onSave = async (payload) => {
    try {
      if (editing) {
        await api.patch(`/users/${editing.id}`, payload);
        toast.success("User updated");
      } else {
        await api.post("/users", payload);
        toast.success("User created");
      }
      setDialogOpen(false);
      setEditing(null);
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed");
    }
  };

  const onDelete = async () => {
    const id = confirmDelete;
    setConfirmDelete(null);
    try {
      await api.delete(`/users/${id}`);
      toast.success("User deleted");
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed");
    }
  };

  return (
    <div className="space-y-6 animate-fade-up" data-testid="accounts-tab">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Team / Access
          </p>
          <h1 className="text-3xl md:text-4xl tracking-tight font-semibold mt-1">
            Accounts.
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Manage who can log in and what they can do. Personnel can buy and sell. Admins can do everything.
          </p>
        </div>
        <Button
          data-testid="add-user-btn"
          onClick={() => { setEditing(null); setDialogOpen(true); }}
          className="h-11 gap-2"
        >
          <Plus size={14} weight="bold" /> Add account
        </Button>
      </div>

      <div className="border border-border rounded-md overflow-hidden bg-card">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Loading…</div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center" data-testid="users-empty">
            <p className="font-semibold mb-1">No accounts yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border" data-testid="users-list">
            {users.map((u) => {
              const isAdmin = u.role === "admin";
              const isSelf = u.id === currentUser?.id;
              return (
                <div key={u.id} data-testid={`user-row-${u.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className={`h-10 w-10 shrink-0 rounded-md flex items-center justify-center ${isAdmin ? "bg-foreground/10" : "bg-muted"}`}>
                    {isAdmin ? <ShieldStar size={18} weight="fill" /> : <User size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.name || u.email}{isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {u.email} · <span className="font-mono uppercase">{u.role}</span>
                      {u.created_at && ` · added ${formatDate(u.created_at)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      data-testid={`edit-user-${u.id}`}
                      onClick={() => { setEditing(u); setDialogOpen(true); }}
                      className="h-9 w-9 inline-flex items-center justify-center border border-border hover:bg-muted rounded-md"
                      title="Edit"
                    >
                      <PencilSimple size={14} />
                    </button>
                    <button
                      data-testid={`delete-user-${u.id}`}
                      onClick={() => setConfirmDelete(u.id)}
                      disabled={isSelf}
                      className="h-9 w-9 inline-flex items-center justify-center border border-border hover:bg-destructive hover:text-destructive-foreground hover:border-destructive rounded-md disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Delete"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AccountDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}
        user={editing}
        onSave={onSave}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent data-testid="confirm-delete-user-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this account?</AlertDialogTitle>
            <AlertDialogDescription>
              They will lose access immediately. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-user-btn">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete-user-btn"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
