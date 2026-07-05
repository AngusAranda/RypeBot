export type RiotRequestOptions = {
  apiKey?: string;
  query?: Record<string, string | number | boolean | undefined>;
};

export class RiotApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly responseBody?: string
  ) {
    super(message);
    this.name = "RiotApiError";
  }
}

export class MissingRiotApiKeyError extends Error {
  constructor() {
    super("Missing RIOT_API_KEY.");
    this.name = "MissingRiotApiKeyError";
  }
}

export class RiotHttpClient {
  constructor(private readonly defaultApiKey = process.env.RIOT_API_KEY) {}

  async getJson<T>(baseUrl: string, path: string, options: RiotRequestOptions = {}): Promise<T> {
    const apiKey = options.apiKey ?? this.defaultApiKey;

    if (!apiKey) {
      throw new MissingRiotApiKeyError();
    }

    const url = new URL(path, baseUrl);

    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url, {
      headers: {
        "X-Riot-Token": apiKey
      }
    });

    if (!response.ok) {
      const responseBody = await response.text().catch(() => undefined);
      throw new RiotApiError(`Riot API request failed with status ${response.status}.`, response.status, responseBody);
    }

    return await response.json() as T;
  }
}
