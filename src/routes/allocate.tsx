import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ErrorState, LoadingState, PageHeader } from "@/components/common";
import { WeightsEditor } from "@/components/weights-editor";
import { AllocationTables, Playback, ResultMetrics } from "@/components/alloc-view";
import { useInvalidateAll, useScholarships, useStudents, useWeights } from "@/hooks/use-data";
import { api } from "@/lib/api";
import { inr } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { ALGORITHMS, type Algorithm, type AllocationResult, type Weights } from "@/lib/types";

export const Route = createFileRoute("/allocate")({
  head: () => pageMeta("Allocation Engine", "Allocate scholarships with a greedy priority queue, 0/1 knapsack DP, backtracking or branch and bound."),
  component: AllocatePage,
});

function AllocatePage() {
  const students = useStudents();
  const schs = useScholarships();
  const wq = useWeights();
  const invalidate = useInvalidateAll();
  const [budget, setBudget] = useState<number | null>(null);
  const [weights, setWeights] = useState<Weights | null>(null);
  const [algo, setAlgo] = useState<Algorithm>("PQ");
  const [result, setResult] = useState<AllocationResult | null>(null);
  const totalFund = schs.data?.reduce((a, s) => a + s.totalFund, 0) ?? 0;
  useEffect(() => { if (schs.data && budget === null) setBudget(totalFund); }, [schs.data, budget, totalFund]);
  useEffect(() => { if (wq.data && !weights) setWeights(wq.data); }, [wq.data, weights]);

  const run = useMutation({
    mutationFn: () => api.allocate({ algorithm: algo, budget: budget!, weights: weights! }),
    onSuccess: (r) => (setResult(r), invalidate(), toast.success(`${algo} run complete`)),
  });

  if (students.isLoading || schs.isLoading || !weights || budget === null) return <LoadingState />;
  if (students.error || schs.error) return <ErrorState error={students.error ?? schs.error} />;

  return (
    <div>
      <PageHeader unit="Heap · DP · Backtracking · B&B" title="Allocation Engine" subtitle="Set the budget and weights, pick an algorithm, and run." />
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <Label>Total budget (₹)</Label>
          <Input className="mt-2" type="number" value={budget} onChange={(e) => setBudget(+e.target.value)} />
          <p className="mt-1 text-xs text-muted-foreground">Sum of all funds: {inr(totalFund)} <button className="underline" onClick={() => setBudget(totalFund)}>reset</button></p>
        </Card>
        <Card className="p-4"><WeightsEditor value={weights} onChange={setWeights} /></Card>
        <Card className="p-4">
          <Label>Allocation method</Label>
          <RadioGroup className="mt-2" value={algo} onValueChange={(v) => setAlgo(v as Algorithm)}>
            {ALGORITHMS.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm"><RadioGroupItem value={a.id} /> {a.label}</label>
            ))}
          </RadioGroup>
          <p className="mt-2 text-xs text-muted-foreground">Priority Queue is the default. Other methods are used to compare results.</p>
          <Button className="mt-4 w-full" onClick={() => run.mutate()} disabled={run.isPending}><Play className="h-4 w-4" /> {run.isPending ? "Running…" : "Run allocation"}</Button>
        </Card>
      </div>
      {result && (
        <div className="space-y-4">
          <ResultMetrics r={result} />
          <Playback r={result} />
          <AllocationTables r={result} students={students.data ?? []} scholarships={schs.data ?? []} />
        </div>
      )}
    </div>
  );
}
