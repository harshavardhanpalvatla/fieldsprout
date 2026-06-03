"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import apiClient from "@/lib/api";
import { Dues } from "@/types";
import dayjs from "dayjs";

export default function DuesPage() {
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{ open: boolean; dues: Dues | null }>({ open: false, dues: null });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string }>({ open: false, id: "" });
  const [form, setForm] = useState({ distributorId: "", invoiceRef: "", amount: "", dueDate: dayjs().add(30, "day").format("YYYY-MM-DD") });
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const qc = useQueryClient();

  function showToast(msg: string, type: "success" | "error" = "success") { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); }

  const { data, isLoading } = useQuery({
    queryKey: ["dues", page],
    queryFn: () => apiClient.get("/dues", { params: { page, pageSize: 25 } }).then(r => r.data),
  });

  const { data: distributorsForDues } = useQuery({
    queryKey: ['distributors-for-dues'],
    queryFn: () => apiClient.get('/distributors?pageSize=200').then(r => r.data.data ?? []),
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => apiClient.post("/dues", { ...d, amount: Number(d.amount) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dues"] }); setDialog({ open: false, dues: null }); showToast("Due entry added"); },
    onError: (e: unknown) => showToast((e as {response?: {data?: {error?: {message?: string}}}})?.response?.data?.error?.message ?? 'Action failed', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) => apiClient.patch(`/dues/${id}`, { ...data, amount: Number(data.amount) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dues"] }); setDialog({ open: false, dues: null }); showToast("Due entry updated"); },
    onError: (e: unknown) => showToast((e as {response?: {data?: {error?: {message?: string}}}})?.response?.data?.error?.message ?? 'Action failed', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/dues/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dues"] }); setDeleteConfirm({ open: false, id: "" }); showToast("Deleted"); },
  });

  const syncTallyMutation = useMutation({
    mutationFn: () => apiClient.post("/dues/sync-tally"),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["dues"] });
      const { synced = 0, errors = 0 } = res.data.data ?? {};
      showToast(`Tally sync complete: ${synced} synced, ${errors} errors`, errors > 0 ? "error" : "success");
    },
    onError: () => showToast("Tally sync failed", "error"),
  });

  const rows: Dues[] = data?.data ?? [];
  const meta = data?.meta;

  function openEdit(due: Dues) {
    setForm({ distributorId: due.distributorId, invoiceRef: due.invoiceRef, amount: String(due.amount), dueDate: due.dueDate });
    setDialog({ open: true, dues: due });
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md text-sm font-medium text-white shadow-lg ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>{toast.msg}</div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Dues Management</h2>
          <p className="text-sm text-muted-foreground">Track distributor outstanding dues</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => syncTallyMutation.mutate()} disabled={syncTallyMutation.isPending}>
            <RefreshCw className={`h-4 w-4 mr-1 ${syncTallyMutation.isPending ? "animate-spin" : ""}`} />
            {syncTallyMutation.isPending ? "Syncing..." : "Sync from Tally"}
          </Button>
          <Button size="sm" onClick={() => { setForm({ distributorId: "", invoiceRef: "", amount: "", dueDate: dayjs().add(30, "day").format("YYYY-MM-DD") }); setDialog({ open: true, dues: null }); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Due
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Distributor</TableHead>
                <TableHead>Total Outstanding</TableHead>
                <TableHead>Invoice Ref</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No dues entries found</TableCell></TableRow>
              ) : rows.map(due => {
                const isOverdue = dayjs(due.dueDate).isBefore(dayjs(), "day");
                return (
                  <TableRow key={due.id}>
                    <TableCell className="font-medium">{due.distributorName}</TableCell>
                    <TableCell>₹{(due.totalOutstanding || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">{due.invoiceRef}</TableCell>
                    <TableCell>₹{(due.amount || 0).toLocaleString()}</TableCell>
                    <TableCell className={isOverdue ? "text-red-600 font-medium" : ""}>{dayjs(due.dueDate).format("DD MMM YYYY")}</TableCell>
                    <TableCell>
                      <Badge variant={due.source === "manual" ? "info" : "warning"}>
                        {due.source === "manual" ? "Manual" : "Tally Sync"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => openEdit(due)}>Edit</Button>
                        <Button variant="outline" size="sm" className="text-destructive border-destructive" onClick={() => setDeleteConfirm({ open: true, id: due.id })}>Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {meta && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
              <span>{rows.length} of {meta.total}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={rows.length < 25}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog.open} onOpenChange={open => { if (!open) setDialog({ open: false, dues: null }); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog.dues ? "Edit Due Entry" : "Add Due Entry"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Distributor *</Label>
              <select value={form.distributorId} onChange={e => setForm({ ...form, distributorId: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select distributor...</option>
                {(distributorsForDues ?? []).map((d: { id: string; name: string }) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label>Invoice Reference *</Label><Input value={form.invoiceRef} onChange={e => setForm({ ...form, invoiceRef: e.target.value })} /></div>
            <div className="space-y-1"><Label>Amount *</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
            <div className="space-y-1"><Label>Due Date *</Label><Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false, dues: null })}>Cancel</Button>
            <Button onClick={() => dialog.dues ? updateMutation.mutate({ id: dialog.dues.id, data: form }) : createMutation.mutate(form)}>
              {dialog.dues ? "Update" : "Add Due"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirm.open} onOpenChange={open => { if (!open) setDeleteConfirm({ open: false, id: "" }); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Due Entry</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this due entry? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm({ open: false, id: "" })}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteConfirm.id)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
