"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import apiClient from "@/lib/api";
import { User, Warehouse } from "@/types";

const ROLES = ["admin", "warehouse_mgr", "rep"] as const;

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ role: "", status: "", state: "", territory: "" });
  const [userDialog, setUserDialog] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });
  const [deactivateConfirm, setDeactivateConfirm] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });
  const [warehouseDialog, setWarehouseDialog] = useState<{ open: boolean; userId: string }>({ open: false, userId: "" });
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [importDialog, setImportDialog] = useState(false);
  const [importResults, setImportResults] = useState<{ created: number; failed: number; errors: string[] } | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", role: "rep", territory: "", state: "", warehouseId: "" });
  const qc = useQueryClient();

  function showToast(msg: string, type: "success" | "error" = "success") { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  const { data, isLoading } = useQuery({
    queryKey: ["users", page, filters],
    queryFn: () => apiClient.get("/users", {
      params: { page, pageSize: 25, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "")) },
    }).then(r => r.data),
  });

  const { data: warehouseData } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => apiClient.get("/warehouses").then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => apiClient.post("/users", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setUserDialog({ open: false, user: null }); showToast("User created"); },
    onError: (e: unknown) => showToast((e as {response?: {data?: {error?: {message?: string}}}})?.response?.data?.error?.message ?? 'Action failed', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) => apiClient.patch(`/users/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setUserDialog({ open: false, user: null }); showToast("User updated"); },
    onError: (e: unknown) => showToast((e as {response?: {data?: {error?: {message?: string}}}})?.response?.data?.error?.message ?? 'Action failed', 'error'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (userId: string) => apiClient.post(`/users/${userId}/deactivate`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setDeactivateConfirm({ open: false, user: null }); showToast("User deactivated"); },
    onError: (e: unknown) => showToast((e as {response?: {data?: {error?: {message?: string}}}})?.response?.data?.error?.message ?? 'Action failed', 'error'),
  });

  const assignWarehouseMutation = useMutation({
    mutationFn: ({ userId, warehouseId }: { userId: string; warehouseId: string }) =>
      apiClient.post(`/warehouses/${warehouseId}/managers`, { userId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setWarehouseDialog({ open: false, userId: "" }); setSelectedWarehouse(""); showToast("Warehouse assigned"); },
    onError: (e: unknown) => showToast((e as {response?: {data?: {error?: {message?: string}}}})?.response?.data?.error?.message ?? 'Action failed', 'error'),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => { const fd = new FormData(); fd.append("file", file); return apiClient.post("/users/bulk-import", fd, { headers: { "Content-Type": "multipart/form-data" } }); },
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ["users"] }); setImportResults(res.data.data); },
  });

  const rows: User[] = data?.data ?? [];
  const meta = data?.meta;
  const warehouses: Warehouse[] = warehouseData?.data ?? [];

  function openEdit(user: User) {
    setForm({ name: user.name, phone: user.phone, role: user.role, territory: user.territory ?? "", state: user.state ?? "", warehouseId: user.warehouseId ?? "" });
    setUserDialog({ open: true, user });
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md text-sm font-medium text-white shadow-lg ${toast.type === "error" ? "bg-red-600" : "bg-green-600"}`}>{toast.msg}</div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Users</h2>
          <p className="text-sm text-muted-foreground">Manage field reps, warehouse managers, and admins</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportDialog(true)}>
            <Upload className="h-4 w-4 mr-1" /> Bulk Import
          </Button>
          <Button size="sm" onClick={() => { setForm({ name: "", phone: "", role: "rep", territory: "", state: "", warehouseId: "" }); setUserDialog({ open: true, user: null }); }}>
            <Plus className="h-4 w-4 mr-1" /> Add User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select value={filters.role} onChange={e => setFilters({ ...filters, role: e.target.value })}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <Input placeholder="State" value={filters.state} onChange={e => setFilters({ ...filters, state: e.target.value })} className="h-9 w-28" />
        <Input placeholder="Territory" value={filters.territory} onChange={e => setFilters({ ...filters, territory: e.target.value })} className="h-9 w-28" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Territory</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No users found</TableCell></TableRow>
              ) : rows.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.phone}</TableCell>
                  <TableCell><Badge variant="info">{user.role.replace("_", " ")}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{user.territory ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{user.state ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={user.status} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => openEdit(user)}>Edit</Button>
                      <Button variant="outline" size="sm" onClick={() => setWarehouseDialog({ open: true, userId: user.id })}>Warehouse</Button>
                      {user.status === "active" && (
                        <Button variant="outline" size="sm" className="text-destructive border-destructive"
                          onClick={() => setDeactivateConfirm({ open: true, user })}>Deactivate</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {meta && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
              <span>Showing {rows.length} of {meta.total}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={rows.length < 25}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={userDialog.open} onOpenChange={open => { if (!open) setUserDialog({ open: false, user: null }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{userDialog.user ? "Edit User" : "Add New User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Full Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Phone * (+91...)</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+919876543210" /></div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {ROLES.map(r => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label>Territory</Label><Input value={form.territory} onChange={e => setForm({ ...form, territory: e.target.value })} /></div>
            <div className="space-y-2"><Label>State</Label><Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialog({ open: false, user: null })}>Cancel</Button>
            <Button disabled={createMutation.isPending || updateMutation.isPending}
              onClick={() => userDialog.user ? updateMutation.mutate({ id: userDialog.user.id, data: form }) : createMutation.mutate(form)}>
              {userDialog.user ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Warehouse Dialog */}
      <Dialog open={warehouseDialog.open} onOpenChange={open => { if (!open) setWarehouseDialog({ open: false, userId: "" }); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Warehouse</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Warehouse</Label>
            <select value={selectedWarehouse} onChange={e => setSelectedWarehouse(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Select...</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarehouseDialog({ open: false, userId: "" })}>Cancel</Button>
            <Button disabled={!selectedWarehouse || assignWarehouseMutation.isPending}
              onClick={() => assignWarehouseMutation.mutate({ userId: warehouseDialog.userId, warehouseId: selectedWarehouse })}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirm */}
      <Dialog open={deactivateConfirm.open} onOpenChange={open => { if (!open) setDeactivateConfirm({ open: false, user: null }); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Deactivate User</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to deactivate <strong className="text-foreground">{deactivateConfirm.user?.name}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateConfirm({ open: false, user: null })}>Cancel</Button>
            <Button variant="destructive" disabled={deactivateMutation.isPending}
              onClick={() => deactivateConfirm.user && deactivateMutation.mutate(deactivateConfirm.user.id)}>
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={importDialog} onOpenChange={open => { if (!open) { setImportDialog(false); setImportResults(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bulk Import Users</DialogTitle></DialogHeader>
          {importResults ? (
            <div className="space-y-2">
              <div className={`p-3 rounded text-sm ${importResults.failed === 0 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                Created: {importResults.created} | Failed: {importResults.failed}
              </div>
              {importResults.errors?.map((e, i) => <div key={i} className="text-sm text-red-600">{e}</div>)}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">Upload an Excel file (.xlsx) with user data</p>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <Button asChild variant="outline">
                  <span>{importMutation.isPending ? "Importing..." : "Choose File"}</span>
                </Button>
                <input type="file" hidden accept=".xlsx,.xls" onChange={e => { const f = e.target.files?.[0]; if (f) importMutation.mutate(f); }} />
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportDialog(false); setImportResults(null); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
