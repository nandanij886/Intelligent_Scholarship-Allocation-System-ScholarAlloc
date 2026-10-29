// In-browser mock backend: seed store (localStorage) + the four allocation algorithms.
import { DEFAULT_WEIGHTS, seedScholarships, seedStudents } from "./seed";
import { isEligible, MaxHeap, priorityScore } from "./dsa";
import type {
  Algorithm,
  AllocStep,
  Allocation,
  AllocationRequest,
  AllocationResult,
  AuditEntry,
  Scholarship,
  Student,
  Unallocated,
  Weights,
} from "./types";

/* ---------------- Store ---------------- */
export interface MockDb {
  students: Student[];
  scholarships: Scholarship[];
  runs: AllocationResult[];
  audit: AuditEntry[];
  weights: Weights;
}
const KEY = "scholaralloc-db-v1";
const freshDb = (): MockDb => ({
  students: seedStudents(),
  scholarships: seedScholarships(),
  runs: [],
  audit: [],
  weights: { ...DEFAULT_WEIGHTS },
});
let mem: MockDb | null = null;

export function getDb(): MockDb {
  if (mem) return mem;
  if (typeof window === "undefined") return freshDb();
  try {
    const raw = localStorage.getItem(KEY);
    mem = raw ? (JSON.parse(raw) as MockDb) : freshDb();
  } catch {
    mem = freshDb();
  }
  return mem;
}
export function saveDb(db: MockDb) {
  mem = db;
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(db));
}
export function resetDb() {
  const db = freshDb();
  db.audit.push(audit("Reset seed data", "{}"));
  saveDb(db);
}
export function audit(action: string, params: string): AuditEntry {
  return { id: Math.random().toString(36).slice(2, 10), at: new Date().toISOString(), actor: "Admin (local)", action, params };
}

/* ---------------- Allocation ---------------- */
interface Pair { student: Student; sch: Scholarship; score: number }
interface Ctx {
  students: Student[];
  scholarships: Scholarship[];
  budget: number;
  weights: Weights;
  scores: Map<string, number>;
  options: Map<string, Scholarship[]>; // student -> eligible scholarships (by amount asc)
}

const TREE_LIMIT = 90;
const NODE_CAP = 60000;

function makeCtx(students: Student[], scholarships: Scholarship[], req: AllocationRequest): Ctx {
  const schs = scholarships.map((s) => {
    const seats = req.seatOverrides?.[s.id] ?? s.seats;
    return { ...s, seats, totalFund: req.seatOverrides?.[s.id] !== undefined ? seats * s.amount : s.totalFund };
  });
  const scores = new Map(students.map((s) => [s.id, priorityScore(s, req.weights)]));
  const options = new Map(
    students.map((st) => [st.id, schs.filter((sch) => isEligible(st, sch)).sort((a, b) => a.amount - b.amount)]),
  );
  return { students, scholarships: schs, budget: req.budget, weights: req.weights, scores, options };
}

class Resources {
  seats = new Map<string, number>();
  fund = new Map<string, number>();
  budget: number;
  constructor(ctx: Ctx) {
    ctx.scholarships.forEach((s) => (this.seats.set(s.id, s.seats), this.fund.set(s.id, s.totalFund)));
    this.budget = ctx.budget;
  }
  why(sch: Scholarship): string | null {
    if (this.seats.get(sch.id)! <= 0) return `No seats left in ${sch.name}`;
    if (this.fund.get(sch.id)! < sch.amount) return `${sch.name} fund exhausted`;
    if (this.budget < sch.amount) return "Overall budget exhausted";
    return null;
  }
  take(sch: Scholarship, sign = 1) {
    this.seats.set(sch.id, this.seats.get(sch.id)! - sign);
    this.fund.set(sch.id, this.fund.get(sch.id)! - sign * sch.amount);
    this.budget -= sign * sch.amount;
  }
}

function unallocatedFor(ctx: Ctx, allocs: Allocation[]): Unallocated[] {
  const got = new Set(allocs.map((a) => a.studentId));
  const used = new Map<string, number>();
  allocs.forEach((a) => used.set(a.scholarshipId, (used.get(a.scholarshipId) ?? 0) + 1));
  const spent = allocs.reduce((t, a) => t + a.amount, 0);
  return ctx.students
    .filter((s) => !got.has(s.id))
    .map((s) => {
      const opts = ctx.options.get(s.id)!;
      if (!opts.length) return { studentId: s.id, reason: "Not eligible for any scholarship" };
      const full = opts.filter((o) => (used.get(o.id) ?? 0) >= o.seats);
      if (full.length === opts.length)
        return { studentId: s.id, reason: `Outranked — seats full in ${opts.map((o) => o.name).join(", ")}` };
      if (opts.every((o) => spent + o.amount > ctx.budget)) return { studentId: s.id, reason: "Overall budget exhausted" };
      return { studentId: s.id, reason: "Not selected — higher total priority achieved without this award" };
    });
}

function finish(ctx: Ctx, algorithm: Algorithm, allocations: Allocation[], extra: Partial<AllocationResult>, t0: number): AllocationResult {
  const fundsUsed = allocations.reduce((t, a) => t + a.amount, 0);
  return {
    runId: `RUN-${Date.now().toString(36).toUpperCase()}-${algorithm}`,
    algorithm,
    createdAt: new Date().toISOString(),
    budget: ctx.budget,
    weights: ctx.weights,
    allocations: allocations.sort((a, b) => b.score - a.score),
    unallocated: unallocatedFor(ctx, allocations),
    totalPriority: Math.round(allocations.reduce((t, a) => t + a.score, 0) * 100) / 100,
    fundsUsed,
    seatsFilled: allocations.length,
    utilisation: ctx.budget ? Math.round((fundsUsed / ctx.budget) * 10000) / 100 : 0,
    nodesExplored: 0,
    nodesPruned: 0,
    steps: [],
    ...extra,
    timeMs: Math.round((performance.now() - t0) * 1000) / 1000,
  };
}

/* a) Greedy priority queue */
function runPQ(ctx: Ctx): AllocationResult {
  const t0 = performance.now();
  const heap = new MaxHeap<Pair>((a, b) => a.score - b.score || b.sch.amount - a.sch.amount);
  ctx.students.forEach((st) => ctx.options.get(st.id)!.forEach((sch) => heap.push({ student: st, sch, score: ctx.scores.get(st.id)! })));
  const res = new Resources(ctx);
  const done = new Set<string>();
  const allocs: Allocation[] = [];
  const steps: AllocStep[] = [];
  let explored = 0, pruned = 0;
  while (heap.size) {
    const p = heap.pop()!;
    explored++;
    let reason = done.has(p.student.id) ? "Already allocated" : res.why(p.sch);
    if (!reason) {
      res.take(p.sch);
      done.add(p.student.id);
      allocs.push({ studentId: p.student.id, scholarshipId: p.sch.id, amount: p.sch.amount, score: p.score });
      reason = "Assigned";
    } else pruned++;
    steps.push({ kind: "heap", studentId: p.student.id, scholarshipId: p.sch.id, score: p.score, action: reason === "Assigned" ? "assigned" : "skipped", reason, heapSize: heap.size });
  }
  return finish(ctx, "PQ", allocs, { steps, nodesExplored: explored, nodesPruned: pruned }, t0);
}

/* b) Group 0/1 knapsack DP over budget, then seat-repair */
function runDP(ctx: Ctx): AllocationResult {
  const t0 = performance.now();
  const unit = 5000;
  const cap = Math.max(0, Math.floor(ctx.budget / unit));
  const studs = ctx.students.filter((s) => ctx.options.get(s.id)!.length);
  const n = studs.length;
  const dp: Float64Array[] = Array.from({ length: n + 1 }, () => new Float64Array(cap + 1));
  const choice: Int16Array[] = Array.from({ length: n + 1 }, () => new Int16Array(cap + 1).fill(-1));
  const steps: AllocStep[] = [];
  const sampleCols = Math.min(24, cap + 1);
  const capacities = Array.from({ length: sampleCols }, (_, k) => Math.round((k * cap) / Math.max(1, sampleCols - 1)));
  let cells = 0;
  for (let i = 1; i <= n; i++) {
    const st = studs[i - 1];
    const v = ctx.scores.get(st.id)!;
    const opts = ctx.options.get(st.id)!;
    for (let c = 0; c <= cap; c++) {
      cells++;
      let best = dp[i - 1][c], pick = -1;
      opts.forEach((o, k) => {
        const w = Math.ceil(o.amount / unit);
        if (w <= c && dp[i - 1][c - w] + v > best + 1e-9) (best = dp[i - 1][c - w] + v), (pick = k);
      });
      dp[i][c] = best;
      choice[i][c] = pick;
    }
    steps.push({ kind: "dp", row: i, studentId: st.id, values: capacities.map((c) => Math.round(dp[i][c] * 10) / 10) });
  }
  // Reconstruct
  const chosen = new Map<string, Scholarship>();
  let c = cap;
  for (let i = n; i >= 1; i--) {
    const k = choice[i][c];
    if (k >= 0) {
      const o = ctx.options.get(studs[i - 1].id)![k];
      chosen.set(studs[i - 1].id, o);
      c -= Math.ceil(o.amount / unit);
    }
  }
  // Seat repair: highest score keeps seat; displaced students try alternatives
  const res = new Resources(ctx);
  const allocs: Allocation[] = [];
  const order = [...chosen.keys()].sort((a, b) => ctx.scores.get(b)! - ctx.scores.get(a)!);
  let repaired = 0;
  const place = (id: string, prefer?: Scholarship): Scholarship | null => {
    const opts = prefer ? [prefer, ...ctx.options.get(id)!.filter((o) => o.id !== prefer.id)] : ctx.options.get(id)!;
    for (const o of opts)
      if (!res.why(o)) {
        res.take(o);
        allocs.push({ studentId: id, scholarshipId: o.id, amount: o.amount, score: ctx.scores.get(id)! });
        return o;
      }
    // One-level augmenting path: move a seat holder to another free scholarship
    for (const o of opts) {
      if (res.seats.get(o.id)! > 0) continue;
      for (const a of allocs.filter((x) => x.scholarshipId === o.id)) {
        const alt = ctx.options.get(a.studentId)!.find((x) => x.id !== o.id && !res.why(x) && res.budget - x.amount + o.amount >= o.amount);
        if (!alt) continue;
        res.take(o, -1);
        res.take(alt);
        a.scholarshipId = alt.id;
        a.amount = alt.amount;
        if (res.why(o)) { res.take(alt, -1); res.take(o); a.scholarshipId = o.id; a.amount = o.amount; continue; }
        res.take(o);
        allocs.push({ studentId: id, scholarshipId: o.id, amount: o.amount, score: ctx.scores.get(id)! });
        return o;
      }
    }
    return null;
  };
  for (const id of order) {
    const got = place(id, chosen.get(id));
    if (got?.id !== chosen.get(id)!.id) repaired++;
  }
  // Fill leftover seats greedily
  const placed = new Set(allocs.map((a) => a.studentId));
  studs.filter((s) => !placed.has(s.id)).sort((a, b) => ctx.scores.get(b.id)! - ctx.scores.get(a.id)!).forEach((s) => place(s.id));
  return finish(ctx, "DP", allocs, {
    steps,
    dpCapacities: capacities.map((k) => k * unit),
    nodesExplored: cells,
    nodesPruned: repaired,
    note: `DP table ${n}×${cap + 1} (₹${unit.toLocaleString("en-IN")} units). ${repaired} seat conflict(s) repaired after reconstruction.`,
  }, t0);
}

/* c) Backtracking and d) Branch & Bound share a search */
function runSearch(ctx: Ctx, bnb: boolean): AllocationResult {
  const t0 = performance.now();
  const studs = ctx.students.filter((s) => ctx.options.get(s.id)!.length).sort((a, b) => ctx.scores.get(b.id)! - ctx.scores.get(a.id)!);
  const n = studs.length;
  const scoreArr = studs.map((s) => ctx.scores.get(s.id)!);
  const res = new Resources(ctx);
  const totalSeats = ctx.scholarships.reduce((t, s) => t + s.seats, 0);
  let seatsLeft = totalSeats;
  const current: Allocation[] = [];
  let best: Allocation[] = [];
  let bestVal = -1;
  let explored = 0, pruned = 0, idSeq = 0, capped = false;
  const steps: AllocStep[] = [];
  const rec = (parentId: number | null, label: string, status: "explored" | "pruned" | "solution", depth: number, value: number) => {
    const id = idSeq++;
    if (steps.length < TREE_LIMIT) steps.push({ kind: "tree", id, parentId, label, status, depth, value: Math.round(value * 10) / 10 });
    return id;
  };
  // Upper bound: current value + best `seatsLeft` remaining scores (sorted desc => prefix of suffix)
  const minAmt = Math.min(...ctx.scholarships.map((s) => s.amount));
  const bound = (i: number, val: number) => {
    let b = val;
    const room = Math.min(seatsLeft, Math.floor(res.budget / minAmt));
    for (let k = i; k < n && k - i < room; k++) b += scoreArr[k];
    return b;
  };
  const dfs = (i: number, val: number, nodeId: number) => {
    if (explored >= NODE_CAP) return void (capped = true);
    explored++;
    if (i === n || seatsLeft === 0) {
      if (val > bestVal) {
        bestVal = val;
        best = [...current];
        if (steps[nodeId]) (steps[nodeId] as { status: string }).status = "solution";
      }
      return;
    }
    if (bnb && bound(i, val) <= bestVal) {
      pruned++;
      if (steps[nodeId]) (steps[nodeId] as { status: string }).status = "pruned";
      return;
    }
    const st = studs[i];
    for (const o of ctx.options.get(st.id)!) {
      if (res.why(o)) {
        pruned++;
        rec(nodeId, `${st.id}→${o.id} ✗`, "pruned", i + 1, val);
        continue;
      }
      res.take(o);
      seatsLeft--;
      current.push({ studentId: st.id, scholarshipId: o.id, amount: o.amount, score: scoreArr[i] });
      const child = rec(nodeId, `${st.id}→${o.id}`, "explored", i + 1, val + scoreArr[i]);
      dfs(i + 1, val + scoreArr[i], child);
      current.pop();
      seatsLeft++;
      res.take(o, -1);
      if (capped) return;
    }
    const skip = rec(nodeId, `skip ${st.id}`, "explored", i + 1, val);
    dfs(i + 1, val, skip);
  };
  if (bnb) {
    // Incumbent from greedy gives Branch & Bound a strong initial lower bound.
    const g = runPQ(ctx);
    best = g.allocations;
    bestVal = g.totalPriority;
  }
  const root = rec(null, "start", "explored", 0, 0);
  dfs(0, 0, root);
  return finish(ctx, bnb ? "BNB" : "BACKTRACK", best, {
    steps,
    nodesExplored: explored,
    nodesPruned: pruned,
    note: capped ? `Search stopped at the ${NODE_CAP.toLocaleString()}-node safety cap; best solution found so far is shown.` : "Search completed — solution is optimal for the model.",
  }, t0);
}

export function allocate(req: AllocationRequest): AllocationResult {
  const db = getDb();
  const ctx = makeCtx(db.students, db.scholarships, req);
  const result =
    req.algorithm === "PQ" ? runPQ(ctx) : req.algorithm === "DP" ? runDP(ctx) : runSearch(ctx, req.algorithm === "BNB");
  if (!req.dryRun) {
    db.runs.unshift(result);
    db.runs = db.runs.slice(0, 40);
    db.audit.unshift(audit(`Ran allocation (${req.algorithm})`, JSON.stringify({ budget: req.budget, weights: req.weights })));
    saveDb(db);
  }
  return result;
}

export function allocateWith(students: Student[], scholarships: Scholarship[], req: AllocationRequest): AllocationResult {
  const ctx = makeCtx(students, scholarships, req);
  return req.algorithm === "PQ" ? runPQ(ctx) : req.algorithm === "DP" ? runDP(ctx) : runSearch(ctx, req.algorithm === "BNB");
}
