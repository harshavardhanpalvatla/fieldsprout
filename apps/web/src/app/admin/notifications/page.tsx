"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import apiClient from "@/lib/api";
import { NotificationConfig } from "@/types";
import dayjs from "dayjs";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${checked ? "bg-primary" : "bg-gray-200"}`}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function NotificationsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "config"],
    queryFn: () => apiClient.get("/notifications/config").then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ event, field, value }: { event: string; field: string; value: boolean }) =>
      apiClient.patch(`/notifications/config/${event}`, { [field]: value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", "config"] }),
  });

  const configs: NotificationConfig[] = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Notification Configuration</h2>
        <p className="text-sm text-muted-foreground">Configure push, WhatsApp, and SMS notifications per event</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead className="text-center">Push</TableHead>
                <TableHead className="text-center">WhatsApp</TableHead>
                <TableHead className="text-center">SMS</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : configs.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No notification configs found</TableCell></TableRow>
              ) : configs.map(config => (
                <TableRow key={config.event}>
                  <TableCell className="font-medium">
                    {config.event.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </TableCell>
                  <TableCell className="text-center">
                    <Toggle checked={config.pushEnabled} onChange={v => updateMutation.mutate({ event: config.event, field: "pushEnabled", value: v })} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Toggle checked={config.whatsappEnabled} onChange={v => updateMutation.mutate({ event: config.event, field: "whatsappEnabled", value: v })} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Toggle checked={config.smsEnabled} onChange={v => updateMutation.mutate({ event: config.event, field: "smsEnabled", value: v })} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{config.recipient}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {config.updatedAt ? dayjs(config.updatedAt).format("DD MMM, HH:mm") : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
