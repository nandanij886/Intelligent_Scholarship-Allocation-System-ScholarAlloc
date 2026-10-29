export type Category = "General" | "OBC" | "SC" | "ST" | "EWS";
export type Gender = "Male" | "Female" | "Other";
export const CATEGORIES: Category[] = ["General", "OBC", "SC", "ST", "EWS"];
export const GENDERS: Gender[] = ["Male", "Female", "Other"];

export interface Student {
  id: string;
  name: string;
  marks: number;
  income: number;
  category: Category;
  gender: Gender;
  branch: string;
  rural?: boolean;
  sportsQuota?: boolean;
  priorityScore?: number;
}

export interface Scholarship {
  id: string;
  name: string;
  minMarks: number;
  maxIncome: number;
  categories: Category[];
  genders?: Gender[];
  branches?: string[];
  requireRural?: boolean;
  requireSports?: boolean;
  seats: number;
  amount: number;
  totalFund: number;
}

export interface Weights {
  merit: number;
  need: number;
  category: number;
}

export type Algorithm = "PQ" | "DP" | "BACKTRACK" | "BNB";
export const ALGORITHMS: { id: Algorithm; label: string; short: string }[] = [
  { id: "PQ", label: "Priority Queue (Greedy)", short: "Greedy PQ" },
  { id: "DP", label: "Dynamic Programming (Knapsack)", short: "DP Knapsack" },
  { id: "BACKTRACK", label: "Backtracking", short: "Backtracking" },
  { id: "BNB", label: "Branch and Bound", short: "Branch & Bound" },
];

export type SortKey = "marks" | "income" | "priority";
export type SortAlgo = "merge" | "quick" | "heap";

export interface SortedResponse {
  items: Student[];
  comparisons: number;
  timeMs: number;
}

export interface TreeNode {
  id?: string;
  name: string;
  kind?: "root" | "scholarship" | "group" | "criterion";
  children?: TreeNode[];
}

export interface TreeCheckStep {
  node: string;
  passed: boolean;
  reason: string;
}
export interface TreeCheckResponse {
  steps: TreeCheckStep[];
  eligibleFor: string[];
}

export interface Edge {
  studentId: string;
  scholarshipId: string;
}
export interface GraphResponse {
  students: Student[];
  scholarships: Scholarship[];
  edges: Edge[];
  outDegree: Record<string, number>;
  inDegree: Record<string, number>;
}
export interface TraversalStep {
  current: string;
  visited: string[];
  frontier: string[];
}
export interface TraversalResponse {
  order: string[];
  steps: TraversalStep[];
}
export interface ComponentsResponse {
  components: string[][];
}

export interface Allocation {
  studentId: string;
  scholarshipId: string;
  amount: number;
  score: number;
}
export interface Unallocated {
  studentId: string;
  reason: string;
}

export type AllocStep =
  | {
      kind: "heap";
      studentId: string;
      scholarshipId: string;
      score: number;
      action: "assigned" | "skipped";
      reason: string;
      heapSize: number;
    }
  | { kind: "dp"; row: number; studentId: string; values: number[] }
  | {
      kind: "tree";
      id: number;
      parentId: number | null;
      label: string;
      status: "explored" | "pruned" | "solution";
      depth: number;
      value: number;
    };

export interface AllocationRequest {
  algorithm: Algorithm;
  budget: number;
  weights: Weights;
  seatOverrides?: Record<string, number>;
  dryRun?: boolean;
}

export interface AllocationResult {
  runId: string;
  algorithm: Algorithm;
  createdAt: string;
  budget: number;
  weights: Weights;
  allocations: Allocation[];
  unallocated: Unallocated[];
  totalPriority: number;
  fundsUsed: number;
  seatsFilled: number;
  utilisation: number;
  nodesExplored: number;
  nodesPruned: number;
  timeMs: number;
  steps: AllocStep[];
  dpCapacities?: number[];
  note?: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  params: string;
}
