export async function webSearch(query: string): Promise<string> {
  const url = `http://localhost:8080/search?q=${encodeURIComponent(query)}&format=json&language=en`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return "No search results found.";
    const data = (await res.json()) as { results?: Array<{ title?: string; url?: string; content?: string }> };
    const results = data.results?.slice(0, 5) ?? [];
    if (results.length === 0) return "No search results found.";
    return results
      .map((r) => `Title: ${r.title ?? "N/A"}\nURL: ${r.url ?? "N/A"}\nContent: ${r.content ?? "N/A"}`)
      .join("\n\n");
  } catch (e: unknown) {
    return `Search error: ${e instanceof Error ? e.message : String(e)}`;
  } finally {
    clearTimeout(timeout);
  }
}
