import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common";

export const Route = createFileRoute("/algorithms")({
  head: () => ({
    meta: [
      { title: "Algorithms & Complexity — ScholarAlloc" },
      { name: "description", content: "Every data structure and algorithm in ScholarAlloc with complexity and design rationale." },
      { property: "og:title", content: "Algorithms & Complexity — ScholarAlloc" },
      { property: "og:description", content: "Data structures, algorithms, complexity and why each was chosen." },
    ],
  }),
  component: AlgorithmsPage,
});

const ITEMS = [
  { name: "Array", where: "Student & scholarship lists, DP rows, adjacency matrix", time: "Access O(1), search O(n)", space: "O(n)", why: "Contiguous, cache-friendly storage for the core records; every other structure is built from it." },
  { name: "Tree (N-ary)", where: "Eligibility Tree page", time: "Traversal O(N) nodes", space: "O(h) recursion", why: "Criteria are naturally hierarchical (scholarship → group → rule). Pre/in/post-order shows how evaluation order changes what we learn first." },
  { name: "Graph (bipartite, adjacency list)", where: "Graph Explorer, eligibility edges", time: "Build O(S·K), degree O(1)", space: "O(V+E)", why: "Edges are sparse (most students qualify for few scholarships), so a list beats an O(V²) matrix; the matrix view shows the sparsity." },
  { name: "Heap (binary max-heap)", where: "Priority Queue allocation, Heap Sort", time: "push/pop O(log n), build O(n)", space: "O(n)", why: "Greedy allocation repeatedly needs the highest-priority remaining pair; a heap gives that in log time versus O(n) linear scans." },
  { name: "Trie", where: "Student search autocomplete", time: "Insert/search O(L)", space: "O(Σ·total chars)", why: "Prefix lookups independent of the number of students; each word of a name is indexed, so 'iye' finds 'Ananya Iyer'." },
  { name: "HashMap (separate chaining)", where: "Exact lookup by student ID", time: "Average O(1), worst O(n)", space: "O(n)", why: "IDs are unique keys; hashing beats scanning or even binary search for direct lookups." },
  { name: "Sorting (Merge / Quick / Heap)", where: "Students table sort", time: "Merge O(n log n) · Quick avg O(n log n), worst O(n²) · Heap O(n log n)", space: "Merge O(n) · Quick O(log n) · Heap O(1)", why: "Merge is stable, Quick is fast in practice, Heap is in-place with a guaranteed bound. The comparison counter makes the difference visible." },
  { name: "Binary Search", where: "Binary-search-by-ID demo", time: "O(log n)", space: "O(1)", why: "On a sorted ID array it halves the search space each step — 30 students need at most 5 comparisons." },
  { name: "BFS / DFS", where: "Graph Explorer traversals, connected components", time: "O(V+E)", space: "O(V)", why: "BFS (queue) explores level by level — who competes with whom directly; DFS (stack) goes deep and finds components cheaply." },
  { name: "Dynamic Programming (0/1 knapsack)", where: "Allocation Engine (DP)", time: "O(n·B·k) for n students, B budget units, k options", space: "O(n·B)", why: "Budget is a capacity and awards are weights: DP finds the best total priority under budget exactly, avoiding greedy's myopic choices." },
  { name: "Backtracking", where: "Allocation Engine (Backtracking)", time: "O((k+1)ⁿ) worst case", space: "O(n) depth", why: "Exhaustively tries assign/skip with undo when seats or funds run out. Exact on small inputs; a node cap keeps it responsive." },
  { name: "Branch and Bound", where: "Allocation Engine (BnB)", time: "Exponential worst, far fewer nodes in practice", space: "O(n) depth", why: "Same search as backtracking, but an optimistic bound (top remaining scores within seats & budget) prunes branches that cannot beat the best so far, seeded by the greedy solution." },
];

function AlgorithmsPage() {
  return (
    <div>
      <PageHeader unit="Reference" title="Algorithms & complexity" subtitle="Every structure used in ScholarAlloc, where it lives in the app, and why it was chosen." />
      <div className="grid gap-4 md:grid-cols-2">
        {ITEMS.map((it) => (
          <Card key={it.name} className="p-5 shadow-card">
            <h2 className="text-lg font-semibold">{it.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Used in: {it.where}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary" className="font-mono">Time: {it.time}</Badge>
              <Badge variant="outline" className="font-mono">Space: {it.space}</Badge>
            </div>
            <p className="mt-3 text-sm text-foreground">{it.why}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
