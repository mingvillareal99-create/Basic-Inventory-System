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
        toast.success("Account updated");
      } else {
        await api.post("/users", payload);
        toast.success("Account created");
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
      toast.success("Account deleted");
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed");
    }
  };

  return (
    <div className="space-y-6" data-testid="accounts-tab">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Accounts</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1 max-w-xl">
            Add and manage who can sign in. Personnel can buy items. Admins can do anything.
          </p>
        </div>
        <Button
          data-testid="add-user-btn"
          onClick={() => { setEditing(null); setDialogOpen(true); }}
          className="h-11 gap-2 bg-primary hover:bg-primary/90"
        >
          <Plus size={16} weight="bold" /> Add account
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border card-shadow overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground">Loading…</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center" data-testid="users-empty">
            <p className="font-semibold mb-1">No accounts yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border" data-testid="users-list">
            {users.map((u) => {
              const isAdminUser = u.role === "admin";
              const isSelf = u.id === currentUser?.id;
              return (
                <div
                  key={u.id}
                  data-testid={`user-row-${u.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors"
                >
                  <div className={`h-11 w-11 shrink-0 rounded-lg flex items-center justify-center ${isAdminUser ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"}`}>
                    {isAdminUser ? <ShieldStar size={20} weight="fill" /> : <User size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {u.name || u.username}
                      {isSelf && <span className="ml-2 text-xs text-muted-foreground font-normal">(you)</span>}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {u.username} · <span className="capitalize">{u.role}</span>
                      {u.created_at && ` · Added ${formatDate(u.created_at)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      data-testid={`edit-user-${u.id}`}
                      onClick={() => { setEditing(u); setDialogOpen(true); }}
                      className="h-10 w-10 inline-flex items-center justify-center border border-border hover:bg-muted rounded-lg"
                      title="Edit"
                    >
                      <PencilSimple size={16} />
                    </button>
                    <button
                      data-testid={`delete-user-${u.id}`}
                      onClick={() => setConfirmDelete(u.id)}
                      disabled={isSelf}
                      className="h-10 w-10 inline-flex items-center justify-center border border-border text-muted-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Delete"
                    >
                      <Trash size={16} />
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
