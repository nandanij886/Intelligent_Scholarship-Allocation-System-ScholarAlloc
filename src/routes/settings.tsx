import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plug, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/common";
import { updateSettings, useSettings } from "@/lib/settings";
import { api } from "@/lib/api";
import { useInvalidateAll } from "@/hooks/use-data";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ScholarAlloc" },
      { name: "description", content: "Configure the API base URL, mock mode, theme and sample data." },
      { property: "og:title", content: "Settings — ScholarAlloc" },
      { property: "og:description", content: "Configure the API base URL, mock mode, theme and sample data." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const s = useSettings();
  const [url, setUrl] = useState(s.baseUrl);
  const [testing, setTesting] = useState(false);
  const invalidate = useInvalidateAll();

  const test = async () => {
    setTesting(true);
    try {
      const r = await fetch(url.replace(/\/$/, "") + "/health");
      if (r.ok) toast.success(`Connected: ${url}`, { description: JSON.stringify(await r.json().catch(() => ({}))) });
      else toast.error(`Health check returned ${r.status}`);
    } catch {
      toast.error(`Can't reach ${url}/health`, { description: "Is the backend running and allowing CORS?" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" subtitle="Saved in this browser." />
      <Card className="space-y-6 p-5 shadow-card">
        <div className="space-y-2">
          <Label htmlFor="url">API base URL</Label>
          <div className="flex gap-2">
            <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} className="font-mono" />
            <Button onClick={() => (updateSettings({ baseUrl: url }), toast.success("Base URL saved"))}>Save</Button>
          </div>
          <Button variant="outline" size="sm" onClick={test} disabled={testing}>
            <Plug className="h-4 w-4" /> {testing ? "Testing…" : "Test connection"}
          </Button>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label>Mock mode</Label>
            <p className="text-sm text-muted-foreground">Run every feature in the browser with sample data — no backend needed.</p>
          </div>
          <Switch checked={s.mockMode} onCheckedChange={(v) => updateSettings({ mockMode: v })} />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label>Dark theme</Label>
            <p className="text-sm text-muted-foreground">Easier on the eyes at night.</p>
          </div>
          <Switch checked={s.theme === "dark"} onCheckedChange={(v) => updateSettings({ theme: v ? "dark" : "light" })} />
        </div>
        <div className="flex items-center justify-between gap-4 border-t pt-5">
          <div>
            <Label>Reset sample data</Label>
            <p className="text-sm text-muted-foreground">Restores 30 students, 8 scholarships and clears runs ({s.mockMode ? "mock store" : "POST /seed"}).</p>
          </div>
          <Button
            variant="destructive"
            onClick={async () => {
              await api.seed();
              invalidate();
              toast.success("Sample data restored");
            }}
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </div>
      </Card>
    </div>
  );
}
