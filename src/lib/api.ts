// Single API client: REST calls when Mock mode is OFF, in-browser engine when ON.
import { toast } from "sonner";
import { getSettings, updateSettings } from "./settings";
import * as mock from "./mock-engine";
import { buildGraph, buildTree, components, sortStudents, traverse, treeCheck, Trie } from "./dsa";
import type {
  AllocationRequest,
  AllocationResult,
  AuditEntry,
  ComponentsResponse,
  GraphResponse,
  Scholarship,
  SortAlgo,
  SortKey,
  SortedResponse,
  Student,
  TraversalResponse,
  TreeCheckResponse,
  TreeNode,
  Weights,
} from "./types";

export class ApiError extends Error {}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const { baseUrl } = getSettings();
  let res: Response;
  try {
    res = await fetch(baseUrl.replace(/\/$/, "") + path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    notifyFailure(`Can't reach ${baseUrl}`);
    throw new ApiError(`Network error calling ${path}`);
  }
  if (!res.ok) {
    notifyFailure(`${init?.method ?? "GET"} ${path} failed (${res.status})`);
    throw new ApiError(`${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

let lastToast = 0;
function notifyFailure(msg: string) {
  if (Date.now() - lastToast < 3000) return;
  lastToast = Date.now();
  toast.error(msg, {
    description: "The backend didn't respond. You can keep working with sample data.",
    action: { label: "Switch to Mock mode", onClick: () => updateSettings({ mockMode: true }) },
  });
}

const isMock = () => getSettings().mockMode;
const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 120));
const body = (b: unknown) => JSON.stringify(b);

function mutateDb(fn: (db: mock.MockDb) => void, action: string, params: unknown) {
  const db = mock.getDb();
  fn(db);
  db.audit.unshift(mock.audit(action, JSON.stringify(params)));
  mock.saveDb(db);
}

export const api = {
  health: async () => (isMock() ? delay({ status: "ok (mock)" }) : http<{ status: string }>("/health")),

  // Students
  listStudents: async () => (isMock() ? delay(mock.getDb().students) : http<Student[]>("/students")),
  getStudent: async (id: string) =>
    isMock() ? delay(mock.getDb().students.find((s) => s.id === id)!) : http<Student>(`/students/${id}`),
  createStudent: async (s: Student) =>
    isMock()
      ? (mutateDb((db) => db.students.push(s), "Created student", { id: s.id }), delay(s))
      : http<Student>("/students", { method: "POST", body: body(s) }),
  updateStudent: async (s: Student) =>
    isMock()
      ? (mutateDb((db) => (db.students = db.students.map((x) => (x.id === s.id ? s : x))), "Updated student", { id: s.id }), delay(s))
      : http<Student>(`/students/${s.id}`, { method: "PUT", body: body(s) }),
  deleteStudent: async (id: string) =>
    isMock()
      ? (mutateDb((db) => (db.students = db.students.filter((x) => x.id !== id)), "Deleted student", { id }), delay(undefined))
      : http<void>(`/students/${id}`, { method: "DELETE" }),
  importStudents: async (items: Student[]) =>
    isMock()
      ? (mutateDb((db) => {
          const m = new Map(db.students.map((s) => [s.id, s]));
          items.forEach((s) => m.set(s.id, s));
          db.students = [...m.values()];
        }, "Imported students CSV", { count: items.length }),
        delay({ imported: items.length }))
      : http<{ imported: number }>("/students/import", { method: "POST", body: body(items) }),
  searchStudents: async (prefix: string): Promise<Student[]> => {
    if (!isMock()) return http<Student[]>(`/students/search?prefix=${encodeURIComponent(prefix)}`);
    const students = mock.getDb().students;
    const t = new Trie();
    students.forEach((s) => t.insert(s.name, s.id));
    const ids = new Set(t.search(prefix));
    return students.filter((s) => ids.has(s.id));
  },
  lookupStudent: async (id: string) =>
    isMock() ? (mock.getDb().students.find((s) => s.id === id) ?? null) : http<Student | null>(`/students/lookup/${id}`),
  sortedStudents: async (by: SortKey, algo: SortAlgo, weights: Weights) =>
    isMock()
      ? delay(sortStudents(mock.getDb().students, by, algo, weights))
      : http<SortedResponse>(`/students/sorted?by=${by}&algo=${algo}`),

  // Scholarships
  listScholarships: async () => (isMock() ? delay(mock.getDb().scholarships) : http<Scholarship[]>("/scholarships")),
  createScholarship: async (s: Scholarship) =>
    isMock()
      ? (mutateDb((db) => db.scholarships.push(s), "Created scholarship", { id: s.id }), delay(s))
      : http<Scholarship>("/scholarships", { method: "POST", body: body(s) }),
  updateScholarship: async (s: Scholarship) =>
    isMock()
      ? (mutateDb((db) => (db.scholarships = db.scholarships.map((x) => (x.id === s.id ? s : x))), "Updated scholarship", { id: s.id }), delay(s))
      : http<Scholarship>(`/scholarships/${s.id}`, { method: "PUT", body: body(s) }),
  deleteScholarship: async (id: string) =>
    isMock()
      ? (mutateDb((db) => (db.scholarships = db.scholarships.filter((x) => x.id !== id)), "Deleted scholarship", { id }), delay(undefined))
      : http<void>(`/scholarships/${id}`, { method: "DELETE" }),

  // Weights are a client preference stored with the mock db (also used in REST mode)
  getWeights: async () => mock.getDb().weights,
  saveWeights: async (w: Weights) => {
    mutateDb((db) => (db.weights = w), "Updated priority weights", w);
    return w;
  },

  // Tree
  tree: async () => (isMock() ? delay(buildTree(mock.getDb().scholarships)) : http<TreeNode>("/tree")),
  treeCheck: async (studentId: string, order: "pre" | "in" | "post") => {
    if (!isMock()) return http<TreeCheckResponse>(`/tree/check/${studentId}?order=${order}`);
    const db = mock.getDb();
    return delay(treeCheck(db.students.find((s) => s.id === studentId)!, db.scholarships, order));
  },

  // Graph
  graph: async () => {
    if (!isMock()) return http<GraphResponse>("/graph");
    const db = mock.getDb();
    return delay(buildGraph(db.students, db.scholarships));
  },
  traverse: async (start: string, mode: "bfs" | "dfs") => {
    if (!isMock()) return http<TraversalResponse>(`/graph/${mode}?start=${encodeURIComponent(start)}`);
    const db = mock.getDb();
    return traverse(buildGraph(db.students, db.scholarships), start, mode);
  },
  components: async (): Promise<ComponentsResponse> => {
    if (!isMock()) return http<ComponentsResponse>("/graph/components");
    const db = mock.getDb();
    return { components: components(buildGraph(db.students, db.scholarships)) };
  },

  // Allocation
  allocate: async (req: AllocationRequest) =>
    isMock() ? delay(mock.allocate(req)) : http<AllocationResult>("/allocate", { method: "POST", body: body(req) }),
  compare: async (req: { budget: number; weights: Weights }) => {
    if (!isMock()) return http<AllocationResult[]>("/allocate/compare", { method: "POST", body: body(req) });
    const out = (["PQ", "DP", "BACKTRACK", "BNB"] as const).map((algorithm) => mock.allocate({ ...req, algorithm, dryRun: true }));
    mutateDb(() => {}, "Compared all algorithms", req);
    return delay(out);
  },
  allocations: async () => (isMock() ? delay(mock.getDb().runs) : http<AllocationResult[]>("/allocations")),
  allocation: async (runId: string) =>
    isMock() ? delay(mock.getDb().runs.find((r) => r.runId === runId)!) : http<AllocationResult>(`/allocations/${runId}`),
  audit: async (): Promise<AuditEntry[]> => mock.getDb().audit,
  seed: async () => {
    if (!isMock()) return http<void>("/seed", { method: "POST" });
    mock.resetDb();
  },
};
