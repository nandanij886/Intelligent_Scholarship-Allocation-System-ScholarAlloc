// Core data structures & algorithms used across ScholarAlloc (pure TypeScript, no I/O).
import type {
  Category,
  Edge,
  GraphResponse,
  Scholarship,
  SortAlgo,
  SortKey,
  SortedResponse,
  Student,
  TraversalResponse,
  TreeCheckResponse,
  TreeCheckStep,
  TreeNode,
  Weights,
} from "./types";

/* ---------------- Priority score ---------------- */
const CAT_BONUS: Record<Category, number> = { General: 0, OBC: 0.6, SC: 1, ST: 1, EWS: 0.8 };
const INCOME_CAP = 1500000;

export function normaliseWeights(w: Weights): Weights {
  const t = w.merit + w.need + w.category || 1;
  return { merit: w.merit / t, need: w.need / t, category: w.category / t };
}

export function priorityScore(s: Student, weights: Weights): number {
  const w = normaliseWeights(weights);
  const merit = s.marks / 100;
  const need = 1 - Math.min(s.income, INCOME_CAP) / INCOME_CAP;
  const v = 100 * (w.merit * merit + w.need * need + w.category * CAT_BONUS[s.category]);
  return Math.round(v * 100) / 100;
}

/* ---------------- Eligibility criteria ---------------- */
export interface Criterion {
  group: "Merit" | "Need" | "Category";
  label: string;
  test: (s: Student) => boolean;
  explain: (s: Student, ok: boolean) => string;
}

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

export function criteriaFor(sch: Scholarship): Criterion[] {
  const c: Criterion[] = [
    {
      group: "Merit",
      label: `Marks ≥ ${sch.minMarks}%`,
      test: (s) => s.marks >= sch.minMarks,
      explain: (s, ok) => `Marks ${s.marks}% ${ok ? "≥" : "<"} ${sch.minMarks}%`,
    },
    {
      group: "Need",
      label: `Income ≤ ${inr(sch.maxIncome)}`,
      test: (s) => s.income <= sch.maxIncome,
      explain: (s, ok) => `Income ${inr(s.income)} ${ok ? "≤" : ">"} ${inr(sch.maxIncome)}`,
    },
    {
      group: "Category",
      label: sch.categories.length >= 5 ? "Any category" : `Category ∈ {${sch.categories.join(", ")}}`,
      test: (s) => sch.categories.includes(s.category),
      explain: (s, ok) => `Category ${s.category} ${ok ? "is" : "is not"} allowed`,
    },
  ];
  if (sch.genders?.length)
    c.push({
      group: "Category",
      label: `Gender ∈ {${sch.genders.join(", ")}}`,
      test: (s) => sch.genders!.includes(s.gender),
      explain: (s, ok) => `Gender ${s.gender} ${ok ? "matches" : "does not match"}`,
    });
  if (sch.branches?.length)
    c.push({
      group: "Merit",
      label: `Branch ∈ {${sch.branches.join(", ")}}`,
      test: (s) => sch.branches!.includes(s.branch),
      explain: (s, ok) => `Branch ${s.branch} ${ok ? "qualifies" : "does not qualify"}`,
    });
  if (sch.requireRural)
    c.push({ group: "Need", label: "Rural background", test: (s) => !!s.rural, explain: (_s, ok) => (ok ? "Rural student" : "Not from a rural area") });
  if (sch.requireSports)
    c.push({ group: "Merit", label: "Sports quota", test: (s) => !!s.sportsQuota, explain: (_s, ok) => (ok ? "Holds sports quota" : "No sports quota") });
  return c;
}

export const isEligible = (s: Student, sch: Scholarship) => criteriaFor(sch).every((c) => c.test(s));

/* ---------------- Eligibility tree ---------------- */
export function buildTree(scholarships: Scholarship[]): TreeNode {
  return {
    id: "root",
    name: "Scholarships",
    kind: "root",
    children: scholarships.map((sch) => {
      const crit = criteriaFor(sch);
      const groups = (["Merit", "Need", "Category"] as const).map((g) => ({
        id: `${sch.id}/${g}`,
        name: g,
        kind: "group" as const,
        children: crit
          .map((c, i) => ({ c, i }))
          .filter(({ c }) => c.group === g)
          .map(({ c, i }) => ({ id: `${sch.id}/${g}/${i}`, name: c.label, kind: "criterion" as const })),
      }));
      return { id: sch.id, name: sch.name, kind: "scholarship" as const, children: groups };
    }),
  };
}

export function treeCheck(student: Student, scholarships: Scholarship[], order: "pre" | "in" | "post"): TreeCheckResponse {
  const tree = buildTree(scholarships);
  const results = new Map<string, TreeCheckStep>();
  const eligibleFor: string[] = [];
  // Evaluate bottom-up first so internal nodes know their outcome.
  for (const sch of scholarships) {
    const crit = criteriaFor(sch);
    let allOk = true;
    for (const g of ["Merit", "Need", "Category"] as const) {
      let gOk = true;
      const reasons: string[] = [];
      crit.forEach((c, i) => {
        if (c.group !== g) return;
        const ok = c.test(student);
        gOk &&= ok;
        reasons.push(c.explain(student, ok));
        results.set(`${sch.id}/${g}/${i}`, { node: `${sch.id}/${g}/${i}`, passed: ok, reason: c.explain(student, ok) });
      });
      allOk &&= gOk;
      results.set(`${sch.id}/${g}`, { node: `${sch.id}/${g}`, passed: gOk, reason: `${g}: ${reasons.join("; ")}` });
    }
    if (allOk) eligibleFor.push(sch.id);
    results.set(sch.id, { node: sch.id, passed: allOk, reason: allOk ? `Eligible for ${sch.name}` : `Not eligible for ${sch.name}` });
  }
  results.set("root", { node: "root", passed: eligibleFor.length > 0, reason: `Eligible for ${eligibleFor.length} scholarship(s)` });

  const steps: TreeCheckStep[] = [];
  const visit = (n: TreeNode) => {
    const kids = n.children ?? [];
    const self = () => steps.push(results.get(n.id!)!);
    if (order === "pre") {
      self();
      kids.forEach(visit);
    } else if (order === "post") {
      kids.forEach(visit);
      self();
    } else {
      if (kids[0]) visit(kids[0]);
      self();
      kids.slice(1).forEach(visit);
    }
  };
  visit(tree);
  return { steps, eligibleFor };
}

/* ---------------- Trie (prefix search) ---------------- */
class TrieNode {
  children = new Map<string, TrieNode>();
  ids: string[] = [];
}
export class Trie {
  root = new TrieNode();
  insert(word: string, id: string) {
    for (const token of word.toLowerCase().split(/\s+/)) {
      let n = this.root;
      for (const ch of token) {
        if (!n.children.has(ch)) n.children.set(ch, new TrieNode());
        n = n.children.get(ch)!;
        if (!n.ids.includes(id)) n.ids.push(id);
      }
    }
  }
  search(prefix: string): string[] {
    let n = this.root;
    for (const ch of prefix.toLowerCase().trim()) {
      const next = n.children.get(ch);
      if (!next) return [];
      n = next;
    }
    return n.ids;
  }
}

/* ---------------- HashMap (separate chaining) ---------------- */
export class HashMap<V> {
  private buckets: [string, V][][];
  constructor(private size = 31) {
    this.buckets = Array.from({ length: size }, () => []);
  }
  private hash(key: string) {
    let h = 7;
    for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) % this.size;
    return h;
  }
  set(key: string, value: V) {
    const b = this.buckets[this.hash(key)];
    const e = b.find(([k]) => k === key);
    if (e) e[1] = value;
    else b.push([key, value]);
  }
  get(key: string): V | undefined {
    return this.buckets[this.hash(key)].find(([k]) => k === key)?.[1];
  }
}

/* ---------------- Sorting with comparison counter ---------------- */
type Cmp<T> = (a: T, b: T) => number;

function mergeSort<T>(arr: T[], cmp: Cmp<T>): T[] {
  if (arr.length <= 1) return arr;
  const mid = arr.length >> 1;
  const l = mergeSort(arr.slice(0, mid), cmp);
  const r = mergeSort(arr.slice(mid), cmp);
  const out: T[] = [];
  let i = 0, j = 0;
  while (i < l.length && j < r.length) out.push(cmp(l[i], r[j]) <= 0 ? l[i++] : r[j++]);
  return out.concat(l.slice(i), r.slice(j));
}
function quickSort<T>(arr: T[], cmp: Cmp<T>): T[] {
  const a = [...arr];
  const qs = (lo: number, hi: number) => {
    if (lo >= hi) return;
    const p = a[(lo + hi) >> 1];
    let i = lo, j = hi;
    while (i <= j) {
      while (cmp(a[i], p) < 0) i++;
      while (cmp(a[j], p) > 0) j--;
      if (i <= j) [a[i], a[j]] = [a[j], a[i]], i++, j--;
    }
    qs(lo, j);
    qs(i, hi);
  };
  qs(0, a.length - 1);
  return a;
}
function heapSort<T>(arr: T[], cmp: Cmp<T>): T[] {
  const a = [...arr];
  const n = a.length;
  const sift = (i: number, size: number) => {
    for (;;) {
      let m = i;
      const l = 2 * i + 1, r = l + 1;
      if (l < size && cmp(a[l], a[m]) > 0) m = l;
      if (r < size && cmp(a[r], a[m]) > 0) m = r;
      if (m === i) return;
      [a[i], a[m]] = [a[m], a[i]];
      i = m;
    }
  };
  for (let i = (n >> 1) - 1; i >= 0; i--) sift(i, n);
  for (let end = n - 1; end > 0; end--) {
    [a[0], a[end]] = [a[end], a[0]];
    sift(0, end);
  }
  return a;
}

export function sortStudents(students: Student[], by: SortKey, algo: SortAlgo, weights: Weights): SortedResponse {
  const withScore = students.map((s) => ({ ...s, priorityScore: priorityScore(s, weights) }));
  let comparisons = 0;
  const key = (s: Student) => (by === "marks" ? s.marks : by === "income" ? s.income : s.priorityScore!);
  // marks & priority descending, income ascending (neediest first)
  const dir = by === "income" ? 1 : -1;
  const cmp: Cmp<Student> = (a, b) => {
    comparisons++;
    return dir * (key(a) - key(b));
  };
  const t0 = performance.now();
  const items = algo === "merge" ? mergeSort(withScore, cmp) : algo === "quick" ? quickSort(withScore, cmp) : heapSort(withScore, cmp);
  const timeMs = Math.round((performance.now() - t0) * 1000) / 1000;
  return { items, comparisons, timeMs };
}

/* ---------------- Binary search ---------------- */
export interface BSStep { lo: number; hi: number; mid: number; midId: string; cmp: "found" | "go-right" | "go-left" }
export function binarySearchById(sortedIds: string[], target: string): { index: number; steps: BSStep[] } {
  let lo = 0, hi = sortedIds.length - 1;
  const steps: BSStep[] = [];
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const c = sortedIds[mid].localeCompare(target);
    steps.push({ lo, hi, mid, midId: sortedIds[mid], cmp: c === 0 ? "found" : c < 0 ? "go-right" : "go-left" });
    if (c === 0) return { index: mid, steps };
    if (c < 0) lo = mid + 1;
    else hi = mid - 1;
  }
  return { index: -1, steps };
}

/* ---------------- Max-heap ---------------- */
export class MaxHeap<T> {
  private a: T[] = [];
  constructor(private cmp: Cmp<T>) {}
  get size() { return this.a.length; }
  push(v: T) {
    this.a.push(v);
    let i = this.a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.cmp(this.a[i], this.a[p]) <= 0) break;
      [this.a[i], this.a[p]] = [this.a[p], this.a[i]];
      i = p;
    }
  }
  pop(): T | undefined {
    if (!this.a.length) return undefined;
    const top = this.a[0];
    const last = this.a.pop()!;
    if (this.a.length) {
      this.a[0] = last;
      let i = 0;
      for (;;) {
        let m = i;
        const l = 2 * i + 1, r = l + 1;
        if (l < this.a.length && this.cmp(this.a[l], this.a[m]) > 0) m = l;
        if (r < this.a.length && this.cmp(this.a[r], this.a[m]) > 0) m = r;
        if (m === i) break;
        [this.a[i], this.a[m]] = [this.a[m], this.a[i]];
        i = m;
      }
    }
    return top;
  }
}

/* ---------------- Graph ---------------- */
export function buildGraph(students: Student[], scholarships: Scholarship[]): GraphResponse {
  const edges: Edge[] = [];
  const outDegree: Record<string, number> = {};
  const inDegree: Record<string, number> = {};
  scholarships.forEach((s) => (inDegree[s.id] = 0));
  for (const st of students) {
    outDegree[st.id] = 0;
    for (const sch of scholarships)
      if (isEligible(st, sch)) {
        edges.push({ studentId: st.id, scholarshipId: sch.id });
        outDegree[st.id]++;
        inDegree[sch.id]++;
      }
  }
  return { students, scholarships, edges, outDegree, inDegree };
}

export function adjacency(edges: Edge[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  const add = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a)!.push(b);
  };
  edges.forEach((e) => {
    add(e.studentId, e.scholarshipId);
    add(e.scholarshipId, e.studentId);
  });
  return adj;
}

export function traverse(g: GraphResponse, start: string, mode: "bfs" | "dfs"): TraversalResponse {
  const adj = adjacency(g.edges);
  const visited = new Set<string>();
  const order: string[] = [];
  const steps: TraversalResponse["steps"] = [];
  const frontier: string[] = [start];
  while (frontier.length) {
    const cur = mode === "bfs" ? frontier.shift()! : frontier.pop()!;
    if (visited.has(cur)) continue;
    visited.add(cur);
    order.push(cur);
    const nbrs = [...(adj.get(cur) ?? [])];
    if (mode === "dfs") nbrs.reverse();
    for (const n of nbrs) if (!visited.has(n)) frontier.push(n);
    steps.push({ current: cur, visited: [...order], frontier: [...frontier] });
  }
  return { order, steps };
}

export function components(g: GraphResponse): string[][] {
  const adj = adjacency(g.edges);
  const seen = new Set<string>();
  const out: string[][] = [];
  const all = [...g.students.map((s) => s.id), ...g.scholarships.map((s) => s.id)];
  for (const id of all) {
    if (seen.has(id)) continue;
    const comp: string[] = [];
    const stack = [id];
    seen.add(id);
    while (stack.length) {
      const c = stack.pop()!;
      comp.push(c);
      for (const n of adj.get(c) ?? []) if (!seen.has(n)) seen.add(n), stack.push(n);
    }
    out.push(comp);
  }
  return out;
}
