interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Mediastack MCP — wraps Mediastack API (api.mediastack.com/v1)
 *
 * BYO key: requires an API key from https://mediastack.com/
 * Passed via _apiKey parameter. Free tier: 500 requests/month.
 *
 * Tools:
 * - search_news: search news articles by keywords, categories, countries, or languages
 * - latest_news: get the latest news headlines, optionally filtered by category or country
 */


const BASE = 'http://api.mediastack.com/v1';

// ── Helpers ───────────────────────────────────────────────────────────

function extractKey(args: Record<string, unknown>): string {
  const key = args._apiKey as string;
  delete args._apiKey;
  if (!key) throw new Error('Mediastack API key required. Get one at https://mediastack.com/ and pass via _apiKey.');
  return key;
}

async function mediastackGet(apiKey: string, path: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set('access_key', apiKey);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mediastack API error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  if (data.error) {
    const err = data.error as { message?: string; code?: string };
    throw new Error(`Mediastack error: ${err.message ?? err.code ?? 'Unknown error'}`);
  }

  return data;
}

// ── Tool definitions ──────────────────────────────────────────────────

const tools: McpToolExport['tools'] = [
  {
    name: 'search_news',
    description:
      'Search news articles by keywords. Optionally filter by category (business, technology, science, health, sports, entertainment, general), country (ISO2 codes), or language. Returns headlines, descriptions, sources, and published dates.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        _apiKey: { type: 'string', description: 'Mediastack API key' },
        keywords: {
          type: 'string',
          description: 'Search keywords (e.g., "artificial intelligence", "climate summit")',
        },
        categories: {
          type: 'string',
          description: 'Comma-separated categories: business, technology, science, health, sports, entertainment, general',
        },
        countries: {
          type: 'string',
          description: 'Comma-separated ISO2 country codes (e.g., "us,gb,de")',
        },
        languages: {
          type: 'string',
          description: 'Comma-separated language codes (e.g., "en,es,fr")',
        },
        limit: {
          type: 'number',
          description: 'Max results to return (1-100, default 25)',
        },
      },
      required: ['_apiKey', 'keywords'],
    },
  },
  {
    name: 'latest_news',
    description:
      'Get the latest news headlines. Optionally filter by category, country, or language. Returns the most recent articles with titles, descriptions, sources, and URLs.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        _apiKey: { type: 'string', description: 'Mediastack API key' },
        categories: {
          type: 'string',
          description: 'Comma-separated categories: business, technology, science, health, sports, entertainment, general',
        },
        countries: {
          type: 'string',
          description: 'Comma-separated ISO2 country codes (e.g., "us,gb")',
        },
        limit: {
          type: 'number',
          description: 'Max results to return (1-100, default 25)',
        },
      },
      required: ['_apiKey'],
    },
  },
];

// ── callTool dispatcher ───────────────────────────────────────────────

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const key = extractKey(args);

  switch (name) {
    case 'search_news':
      return searchNews(
        key,
        args.keywords as string,
        args.categories as string | undefined,
        args.countries as string | undefined,
        args.languages as string | undefined,
        (args.limit as number) ?? 25,
      );
    case 'latest_news':
      return latestNews(
        key,
        args.categories as string | undefined,
        args.countries as string | undefined,
        (args.limit as number) ?? 25,
      );
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── Tool implementations ─────────────────────────────────────────────

type Article = {
  author: string;
  title: string;
  description: string;
  url: string;
  source: string;
  image: string;
  category: string;
  language: string;
  country: string;
  published_at: string;
};

function formatArticles(articles: Article[]) {
  return articles.map((a) => ({
    title: a.title ?? null,
    description: a.description ?? null,
    url: a.url ?? null,
    source: a.source ?? null,
    author: a.author ?? null,
    category: a.category ?? null,
    language: a.language ?? null,
    country: a.country ?? null,
    published_at: a.published_at ?? null,
  }));
}

async function searchNews(
  apiKey: string,
  keywords: string,
  categories?: string,
  countries?: string,
  languages?: string,
  limit?: number,
) {
  const safeLimit = Math.min(100, Math.max(1, limit ?? 25));
  const params: Record<string, string> = {
    keywords,
    limit: String(safeLimit),
  };
  if (categories) params.categories = categories;
  if (countries) params.countries = countries;
  if (languages) params.languages = languages;

  const data = (await mediastackGet(apiKey, '/news', params)) as {
    pagination: { total: number; count: number; offset: number };
    data: Article[];
  };

  return {
    total: data.pagination?.total ?? 0,
    count: data.pagination?.count ?? 0,
    articles: formatArticles(data.data ?? []),
  };
}

async function latestNews(
  apiKey: string,
  categories?: string,
  countries?: string,
  limit?: number,
) {
  const safeLimit = Math.min(100, Math.max(1, limit ?? 25));
  const params: Record<string, string> = {
    limit: String(safeLimit),
  };
  if (categories) params.categories = categories;
  if (countries) params.countries = countries;

  const data = (await mediastackGet(apiKey, '/news', params)) as {
    pagination: { total: number; count: number; offset: number };
    data: Article[];
  };

  return {
    total: data.pagination?.total ?? 0,
    count: data.pagination?.count ?? 0,
    articles: formatArticles(data.data ?? []),
  };
}

export default { tools, callTool, meter: { credits: 5 } } satisfies McpToolExport;
