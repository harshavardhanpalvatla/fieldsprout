import { Badge } from "@/components/ui/badge";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  draft:         { label: "Draft",              variant: "secondary" },
  submitted:     { label: "Sent to Warehouse",  variant: "info" },
  approved:      { label: "Approved",           variant: "success" },
  rejected:      { label: "Needs Attention",    variant: "destructive" },
  dispatched:    { label: "On Its Way",         variant: "warning" },
  delivered:     { label: "Delivered",          variant: "success" },
  active:        { label: "Active",             variant: "success" },
  pending:       { label: "Pending",            variant: "warning" },
  inactive:      { label: "Inactive",           variant: "secondary" },
  rep:           { label: "Sales Rep",          variant: "info" },
  warehouse_mgr: { label: "Warehouse Mgr",      variant: "default" },
  admin:         { label: "Admin",              variant: "secondary" },
  present:       { label: "Present",            variant: "success" },
  absent:        { label: "Absent",             variant: "destructive" },
  half_day:      { label: "Half Day",           variant: "warning" },
  visited:       { label: "Visited",            variant: "success" },
  verified:      { label: "Verified",           variant: "success" },
  planned:       { label: "Planned",            variant: "info" },
  missed:        { label: "Missed",             variant: "destructive" },
  cancelled:     { label: "Cancelled",          variant: "destructive" },
};

export function StatusBadge({ status }: { status: string }) {
  const key = status?.toLowerCase();
  const cfg = STATUS_CONFIG[key] ?? { label: status, variant: "secondary" as BadgeVariant };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
