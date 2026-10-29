import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/common";

export const Route = createFileRoute("/tree")({
  head: () => ({
    meta: [
      { title: "Eligibility Tree — ScholarAlloc" },
      { name: "description", content: "Eligibility Tree in ScholarAlloc." },
      { property: "og:title", content: "Eligibility Tree — ScholarAlloc" },
      { property: "og:description", content: "Eligibility Tree in ScholarAlloc." },
    ],
  }),
  component: () => (
    <div>
      <PageHeader title="Eligibility Tree" />
      <EmptyState title="This page is not built yet" hint="It will be added in the next step." />
    </div>
  ),
});
