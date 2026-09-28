export const pageHead = (title: string, description: string) => () => ({
  meta: [
    { title: `${title} · JBBA Marketing` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} · JBBA Marketing` },
    { property: "og:description", content: description },
  ],
});
