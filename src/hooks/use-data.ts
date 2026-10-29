import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSettings } from "@/lib/settings";

/** Query-key prefix so switching mock mode / base URL refetches everything. */
export function useEnvKey() {
  const s = useSettings();
  return [s.mockMode ? "mock" : s.baseUrl] as const;
}

export function useStudents() {
  const env = useEnvKey();
  return useQuery({ queryKey: [...env, "students"], queryFn: api.listStudents });
}
export function useScholarships() {
  const env = useEnvKey();
  return useQuery({ queryKey: [...env, "scholarships"], queryFn: api.listScholarships });
}
export function useWeights() {
  const env = useEnvKey();
  return useQuery({ queryKey: [...env, "weights"], queryFn: api.getWeights });
}
export function useRuns() {
  const env = useEnvKey();
  return useQuery({ queryKey: [...env, "runs"], queryFn: api.allocations });
}
export function useGraph() {
  const env = useEnvKey();
  return useQuery({ queryKey: [...env, "graph"], queryFn: api.graph });
}
export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}
