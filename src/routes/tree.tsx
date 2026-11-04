import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Pause, Play, RotateCcw, SkipForward, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/common";
import { useEnvKey, useStudents } from "@/hooks/use-data";
import { api } from "@/lib/api";
import { pageMeta } from "@/lib/meta";
import { cn } from "@/lib/utils";
import type { TreeCheckStep, TreeNode } from "@/lib/types";

export const Route = createFileRoute("/tree")({
  head: () => pageMeta("Eligibility Tree", "Animate preorder, inorder and postorder traversal of the scholarship eligibility tree for any student."),
  component: TreePage,
});

type Order = "pre" | "in" | "post";

function TreePage() {
  const env = useEnvKey();
  const students = useStudents();
  const tree = useQuery({ queryKey: [...env, "tree"], queryFn: api.tree });
  const [sid, setSid] = useState<string>("");
  const [order, setOrder] = useState<Order>("pre");
  const [idx, setIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  useEffect(() => { if (!sid && students.data?.[0]) setSid(students.data[0].id); }, [students.data, sid]);

  const check = useQuery({
    queryKey: [...env, "treeCheck", sid, order],
    queryFn: () => api.treeCheck(sid, order),
    enabled: !!sid,
  });
  useEffect(() => { setIdx(-1); setPlaying(false); }, [sid, order]);
  const steps = check.data?.steps ?? [];
  useEffect(() => {
    if (!playing) return;
    if (idx >= steps.length - 1) return setPlaying(false);
    const t = setTimeout(() => setIdx((i) => i + 1), 180);
    return () => clearTimeout(t);
  }, [playing, idx, steps.length]);

  const seen = useMemo(() => {
    const m = new Map<string, TreeCheckStep>();
    steps.slice(0, idx + 1).forEach((s) => m.set(s.node, s));
    return m;
  }, [steps, idx]);
  const current = steps[idx]?.node;
  const done = idx >= steps.length - 1 && steps.length > 0;
  const schs = tree.data?.children ?? [];

  return (
    <div>
      <PageHeader unit="Unit 1 · Trees" title="Eligibility Tree" subtitle="Root → scholarship → Merit / Need / Category → criteria. Pick a student and watch the traversal check each node." />
      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <Select value={sid} onValueChange={setSid}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Choose a student" /></SelectTrigger>
          <SelectContent>{students.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.id} · {s.name}</SelectItem>)}</SelectContent>
        </Select>
        <ToggleGroup type="single" variant="outline" value={order} onValueChange={(v) => v && setOrder(v as Order)}>
          <ToggleGroupItem value="pre">Preorder</ToggleGroupItem>
          <ToggleGroupItem value="in">Inorder</ToggleGroupItem>
          <ToggleGroupItem value="post">Postorder</ToggleGroupItem>
        </ToggleGroup>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => (idx >= steps.length - 1 && setIdx(-1), setPlaying((p) => !p))} disabled={!steps.length}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {playing ? "Pause" : "Animate"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIdx((i) => Math.min(i + 1, steps.length - 1))}><SkipForward className="h-4 w-4" /> Step</Button>
          <Button size="sm" variant="outline" onClick={() => setIdx(steps.length - 1)}>Show all</Button>
          <Button size="sm" variant="ghost" onClick={() => (setIdx(-1), setPlaying(false))}><RotateCcw className="h-4 w-4" /></Button>
        </div>
        <span className="font-mono text-xs text-muted-foreground">step {Math.max(0, idx + 1)} / {steps.length}</span>
      </Card>

      {tree.isLoading ? <LoadingState /> : tree.error ? <ErrorState error={tree.error} onRetry={tree.refetch} /> : !schs.length ? (
        <EmptyState title="No scholarships to build a tree from" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <Card className="p-4">
            <NodePill node={tree.data!} st={seen.get("root")} current={current === "root"} />
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {schs.map((sch) => (
                <div key={sch.id} className="rounded-lg border p-3">
                  <NodePill node={sch} st={seen.get(sch.id!)} current={current === sch.id} />
                  <div className="ml-3 mt-2 space-y-2 border-l pl-3">
                    {sch.children?.map((g) => (
                      <div key={g.id}>
                        <NodePill node={g} st={seen.get(g.id!)} current={current === g.id} small />
                        <div className="ml-3 mt-1 space-y-1 border-l border-dashed pl-3">
                          {g.children?.map((c) => <NodePill key={c.id} node={c} st={seen.get(c.id!)} current={current === c.id} small />)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <div className="space-y-4">
            <Card className="p-4">
              <h2 className="mb-2 font-semibold text-foreground">Verdict</h2>
              {!done ? <p className="text-sm text-muted-foreground">Run the traversal to the end to see the verdict.</p> : (
                <div>
                  <div className={cn("mb-2 flex items-center gap-2 font-semibold", check.data!.eligibleFor.length ? "text-teal" : "text-destructive")}>
                    {check.data!.eligibleFor.length ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                    {check.data!.eligibleFor.length ? `Eligible for ${check.data!.eligibleFor.length} scholarship(s)` : "Not eligible for any scholarship"}
                  </div>
                  <ul className="space-y-1 text-sm">
                    {schs.map((s) => {
                      const r = seen.get(s.id!);
                      return <li key={s.id} className={r?.passed ? "text-foreground" : "text-muted-foreground"}>{r?.passed ? "✓" : "✗"} {s.name}</li>;
                    })}
                  </ul>
                </div>
              )}
            </Card>
            <Card className="p-4">
              <h2 className="mb-2 font-semibold text-foreground">Visit log</h2>
              <ol className="max-h-96 space-y-1 overflow-y-auto font-mono text-xs">
                {steps.slice(0, idx + 1).map((s, i) => (
                  <li key={i} className={s.passed ? "text-teal" : "text-destructive"}>{i + 1}. {s.reason}</li>
                ))}
              </ol>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function NodePill({ node, st, current, small }: { node: TreeNode; st?: TreeCheckStep; current?: boolean; small?: boolean }) {
  return (
    <div
      title={st?.reason}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 transition-colors",
        small ? "text-xs" : "text-sm font-medium",
        !st && "bg-muted/40 text-muted-foreground",
        st?.passed && "border-teal bg-accent text-accent-foreground",
        st && !st.passed && "border-destructive/60 bg-destructive/10 text-destructive",
        current && "ring-2 ring-primary ring-offset-1",
      )}
    >
      {st && (st.passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />)}
      {node.name}
    </div>
  );
}
