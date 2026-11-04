export const pageMeta = (title: string, description: string) => ({
  meta: [
    { title: `${title} — ScholarAlloc` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — ScholarAlloc` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ],
});
