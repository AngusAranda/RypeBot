export const discordLimits = {
  embedDescription: 4096,
  embedFieldValue: 1024
} as const;

export function truncateDiscord(value: string, maxLength: number = discordLimits.embedFieldValue): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

export function bulletList(values: string[]): string {
  return values.length > 0 ? values.map((value) => `• ${value}`).join("\n") : "*None*";
}

export function spacedLines(values: string[]): string {
  return values.filter(Boolean).join("\n\n");
}

export function bold(value: string): string {
  return `**${value}**`;
}

export function italic(value: string): string {
  return `*${value}*`;
}

export function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll(/&#x27;/gi, "'");
}

export function cleanDataDragonText(value: string): string {
  return decodeHtmlEntities(value)
    .replaceAll(/<br\s*\/?>/gi, "\n")
    .replaceAll(/<\/(mainText|stats|attention|passive|active|rules|flavorText)>/gi, "\n")
    .replaceAll(/<(mainText|stats|attention|passive|active|rules|flavorText)[^>]*>/gi, "")
    .replaceAll(/<[^>]*>/g, "")
    .replaceAll(/[ \t]+\n/g, "\n")
    .replaceAll(/\n{3,}/g, "\n\n")
    .trim();
}
