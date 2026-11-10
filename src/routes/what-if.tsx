import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState, Metric, PageHeader } from "@/components/common";
import { WeightsEditor } from "@/components/weights-editor";
import { useRuns, useScholarships, useStudents } from "@/hooks/use-data";
import { allocateWith } from "@/lib/mock-engine";
import { compactInr } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import type { Weights } from "@/lib/types";

export const Route = createFileRoute("/what-if")({
  head: () => pageMeta("What-If Simulator", "Change budget, seats or weights and see which students gain or lose a scholarship versus the last run."),
  component: WhatIfPage,
});

function WhatIfPage() {
  const runs = useRuns();
  const students = useStudents();
  const schs = useScholarships();
  const last = runs.data?.[0];
  const [budget, setBudget] = useState(0);
  const [weights, setWeights] = useState<Weights | null>(null);
  const [seats, setSeats] = useState<Record<string, number>>({});
  const reset = () => {
    if (!last || !schs.data) return;
    setBudget(last.budget);
    setWeights(last.weights);
    setSeats(Object.fromEntries(schs.data.map((s) => [s.id, s.seats])));
  };
  useEffect(() => { if (last && !weights) reset(); }, [last, schs.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const sim = useMemo(() => {
    if (!last || !weights || !students.data || !schs.data) return null;
    const sch = schs.data.map((s) => ({ ...s, seats: seats[s.id] ?? s.seats }));
    return allocateWith(students.data, sch, { algorithm: last.algorithm, budget, weights, dryRun: true });
  }, [last, weights, budget, seats, students.data, schs.data]);

  if (runs.isLoading || students.isLoading) return <LoadingState />;
  if (!last) return (
    <div>
      <PageHeader title="What-If Simulator" />
      <EmptyState title="No allocation run yet" hint="Run an allocation first, then come back to test changes." action={<Button asChild size="sm"><Link to="/allocate">Go to Allocation Engine</Link></Button>} />
    </div>
  );

  const before = new Map(last.allocations.map((a) => [a.studentId, a.scholarshipId]));
  const after = new Map(sim?.allocations.map((a) => [a.studentId, a.scholarshipId]) ?? []);
  const name = (id: string) => students.data?.find((s) => s.id === id)?.name ?? id;
  const sname = (id: string) => schs.data?.find((s) => s.id === id)?.name ?? id;
  const gains = [...after.keys()].filter((id) => !before.has(id));
  const losses = [...before.keys()].filter((id) => !after.has(id));
  const moves = [...after.keys()].filter((id) => before.has(id) && before.get(id) !== after.get(id));
  const d = (a: number, b: number, f = (x: number) => x.toFixed(1)) => `${f(b)} (${b - a >= 0 ? "+" : ""}${f(b - a)})`;

  return (
    <div>
      <PageHeader unit="Sensitivity analysis" title="What-If Simulator" subtitle={`Compared with the last ${last.algorithm} run. Changes here are not saved.`} actions={<Button variant="outline" size="sm" onClick={reset}>Reset to last run</Button>} />
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <Label>Budget (₹)</Label>
          <Input className="mt-2" type="number" value={budget} onChange={(e) => setBudget(+e.target.value)} />
          <p className="mt-1 text-xs text-muted-foreground">Last run: {compactInr(last.budget)}</p>
        </Card>
        <Card className="p-4">{weights && <WeightsEditor value={weights} onChange={setWeights} />}</Card>
        <Card className="p-4">
          <Label>Seats per scholarship</Label>
          <div className="mt-2 grid max-h-56 gap-2 overflow-auto">
            {schs.data?.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{s.name}</span>
                <Input className="h-8 w-20" type="number" min={0} value={seats[s.id] ?? s.seats} onChange={(e) => setSeats({ ...seats, [s.id]: +e.target.value })} />
              </div>
            ))}
          </div>
        </Card>
      </div>
      {sim && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            <Metric label="Total priority" value={d(last.totalPriority, sim.totalPriority)} />
            <Metric label="Seats filled" value={d(last.seatsFilled, sim.seatsFilled, (x) => String(x))} />
            <Metric label="Funds used" value={d(last.fundsUsed, sim.fundsUsed, compactInr)} />
            <Metric label="Utilisation %" value={d(last.utilisation, sim.utilisation)} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <DeltaList title="Gain a scholarship" tone="teal" items={gains.map((id) => `${name(id)} → ${sname(after.get(id)!)}`)} />
            <DeltaList title="Lose their scholarship" tone="destructive" items={losses.map((id) => `${name(id)} (was ${sname(before.get(id)!)})`)} />
            <DeltaList title="Switch scholarship" tone="outline" items={moves.map((id) => `${name(id)}: ${sname(before.get(id)!)} → ${sname(after.get(id)!)}`)} />
          </div>
        </>
      )}
    </div>
  );
}

function DeltaList({ title, items, tone }: { title: string; items: string[]; tone: "teal" | "destructive" | "outline" }) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <Badge variant="outline" className={tone === "teal" ? "border-teal text-teal" : tone === "destructive" ? "border-destructive text-destructive" : ""}>{items.length}</Badge>
      </div>
      {items.length ? <ul className="space-y-1 text-sm">{items.map((t) => <li key={t}>{t}</li>)}</ul> : <p className="text-sm text-muted-foreground">No one.</p>}
    </Card>
  );
}
