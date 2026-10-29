import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { updateSettings, useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, unit, actions }: { title: string; subtitle?: string; unit?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {unit && <div className="mb-1 font-mono text-xs uppercase tracking-widest text-teal">{unit}</div>}
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon, tone = "primary" }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode; tone?: "primary" | "teal" }) {
  return (
    <Card className="relative overflow-hidden p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-1 font-display text-2xl font-semibold text-foreground">{value}</div>
          {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
        </div>
        {icon && (
          <div className={cn("rounded-lg p-2", tone === "teal" ? "bg-accent text-accent-foreground" : "bg-secondary text-primary")}>{icon}</div>
        )}
      </div>
    </Card>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { mockMode } = useSettings();
  return (
    <Card className="flex flex-col items-center gap-3 border-destructive/40 p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <div className="font-medium text-foreground">Couldn't load data</div>
      <div className="max-w-md text-sm text-muted-foreground">{error instanceof Error ? error.message : String(error)}</div>
      <div className="flex gap-2">
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        )}
        {!mockMode && (
          <Button size="sm" onClick={() => updateSettings({ mockMode: true })}>
            Switch to Mock mode
          </Button>
        )}
      </div>
    </Card>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center">
      <Inbox className="h-8 w-8 text-muted-foreground" />
      <div className="font-medium text-foreground">{title}</div>
      {hint && <div className="max-w-sm text-sm text-muted-foreground">{hint}</div>}
      {action}
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border bg-muted/40 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-mono text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}
