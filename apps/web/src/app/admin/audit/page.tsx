"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import apiClient from "@/lib/api";
import { AuditLog } from "@/types";
import dayjs from "dayjs";

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [filters, setFilters] = useState({ user: "", entity: "", action: "" });
  const [startDate, setStartDate] = useState(dayjs().subtract(7, "day").format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(dayjs().format("YYYY-MM-DD"));

  const { data, isLoading } = useQuery({
    queryKey: ["audit", page, filters, startDate, endDate],
    queryFn: () => apiClient.get("/audit-log", {
      params: { page, pageSize: 25, startDate, endDate, userId: filters.user || undefined, entity: filters.entity || undefined, action: filters.action || undefined },
    }).then(r => r.data),
  });

  const rows: AuditLog[] = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Audit Log</h2>
        <p className="text-sm text-muted-foreground">Read-only log of all system actions</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 w-40" />
        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 w-40" />
        <Input placeholder="User" value={filters.user} onChange={e => setFilters({ ...filters, user: e.target.value })} className="h-9 w-28" />
        <Input placeholder="Entity" value={filters.entity} onChange={e => setFilters({ ...filters, entity: e.target.value })} className="h-9 w-28" />
        <Input placeholder="Action" value={filters.action} onChange={e => setFilters({ ...filters, action: e.target.value })} className="h-9 w-28" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Entity ID</TableHead>
                <TableHead>Payload</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No audit entries found</TableCell></TableRow>
              ) : rows.map(log => (
                <React.Fragment key={log.id}>
                  <TableRow>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {dayjs(log.createdAt).format("DD MMM, HH:mm:ss")}
                    </TableCell>
                    <TableCell>{log.userName}</TableCell>
                    <TableCell><Badge variant="info">{log.action}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{log.entity}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{log.entityId}</TableCell>
                    <TableCell>
                      {log.payload ? (
                        <Button variant="ghost" size="sm"
                          onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}>
                          {expandedRow === log.id ? "Hide" : "View JSON"}
                        </Button>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                  {expandedRow === log.id && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-gray-900 p-0">
                        <pre className="text-gray-300 text-xs font-mono p-4 overflow-auto max-h-60">
                          {JSON.stringify(log.payload, null, 2)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
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
    </div>
  );
}
