import { Effect } from "effect";

class SearchError extends Error {
  readonly _tag = "SearchError";
  constructor(message: string) {
    super(message);
    this.name = "SearchError";
  }
}

let searxngBaseUrl = "http://localhost:8080";

export function setSearxngUrl(url: string): void {
  searxngBaseUrl = url.replace(/\/+$/, "");
}

export const webSearch = (query: string): Effect.Effect<string, SearchError> =>
  Effect.tryPromise({
    try: async () => {
      const url = `${searxngBaseUrl}/search?q=${encodeURIComponent(query)}&format=json&language=en`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return "No search results found.";
        const data = (await res.json()) as {
          results?: Array<{ title?: string; url?: string; content?: string }>;
        };
        const results = data.results?.slice(0, 5) ?? [];
        if (results.length === 0) return "No search results found.";
        return results
          .map(
            (r) =>
              `Title: ${r.title ?? "N/A"}\nURL: ${r.url ?? "N/A"}\nContent: ${r.content ?? "N/A"}`,
          )
          .join("\n\n");
      } finally {
        clearTimeout(timeout);
      }
    },
    catch: (e) => new SearchError(e instanceof Error ? e.message : String(e)),
  });
