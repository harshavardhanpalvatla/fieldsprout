"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import apiClient from "@/lib/api";
import { Warehouse } from "@/types";

export default function WarehousesPage() {
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{ open: boolean; warehouse: Warehouse | null }>({ open: false, warehouse: null });
  const [form, setForm] = useState({ name: "", location: "", state: "", managerId: "" });
  const [toast, setToast] = useState("");
  const qc = useQueryClient();

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  const { data, isLoading } = useQuery({
    queryKey: ["warehouses-list", page],
    queryFn: () => apiClient.get("/warehouses", { params: { page, pageSize: 25 } }).then(r => r.data),
  });

  const { data: mgrUsersData } = useQuery({
    queryKey: ['wh-mgr-users'],
    queryFn: () => apiClient.get('/users?role=warehouse_mgr&pageSize=100').then(r => r.data.data ?? []),
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => apiClient.post("/warehouses", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["warehouses-list"] }); setDialog({ open: false, warehouse: null }); showToast("Warehouse created"); },
    onError: (e: unknown) => showToast((e as {response?: {data?: {error?: {message?: string}}}})?.response?.data?.error?.message ?? 'Action failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) => apiClient.patch(`/warehouses/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["warehouses-list"] }); setDialog({ open: false, warehouse: null }); showToast("Warehouse updated"); },
    onError: (e: unknown) => showToast((e as {response?: {data?: {error?: {message?: string}}}})?.response?.data?.error?.message ?? 'Action failed'),
  });

  const rows: Warehouse[] = data?.data ?? [];
  const meta = data?.meta;
  const mgrUsers: { id: string; name: string }[] = mgrUsersData ?? [];

  function openEdit(w: Warehouse) {
    setForm({ name: w.name, location: w.location, state: w.state, managerId: w.managerId ?? "" });
    setDialog({ open: true, warehouse: w });
  }

  return (
    <div className="space-y-4">
      {toast && <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-md text-sm font-medium text-white bg-green-600 shadow-lg">{toast}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Warehouses</h2>
          <p className="text-sm text-muted-foreground">Manage warehouse locations</p>
        </div>
        <Button size="sm" onClick={() => { setForm({ name: "", location: "", state: "", managerId: "" }); setDialog({ open: true, warehouse: null }); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Warehouse
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No warehouses found</TableCell></TableRow>
              ) : rows.map(w => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell className="text-muted-foreground">{w.location}</TableCell>
                  <TableCell className="text-muted-foreground">{w.state}</TableCell>
                  <TableCell><StatusBadge status={w.status} /></TableCell>
                  <TableCell><Button variant="outline" size="sm" onClick={() => openEdit(w)}>Edit</Button></TableCell>
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

      <Dialog open={dialog.open} onOpenChange={open => { if (!open) setDialog({ open: false, warehouse: null }); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog.warehouse ? "Edit Warehouse" : "Add Warehouse"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Location *</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
            <div className="space-y-1"><Label>State *</Label><Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} /></div>
            <div className="space-y-1"><Label>Manager</Label>
              <select value={form.managerId} onChange={e => setForm({ ...form, managerId: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">No manager</option>
                {mgrUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false, warehouse: null })}>Cancel</Button>
            <Button onClick={() => dialog.warehouse ? updateMutation.mutate({ id: dialog.warehouse.id, data: form }) : createMutation.mutate(form)}>
              {dialog.warehouse ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
