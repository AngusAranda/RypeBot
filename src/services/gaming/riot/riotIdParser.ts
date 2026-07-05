export type ParsedRiotIdInput = {
  gameName: string;
  tagLine?: string;
  isComplete: boolean;
};

export function parseRiotIdInput(input: string): ParsedRiotIdInput {
  const trimmedInput = input.trim();
  const separatorIndex = trimmedInput.indexOf("#");

  if (separatorIndex === -1) {
    return {
      gameName: trimmedInput,
      isComplete: false
    };
  }

  const gameName = trimmedInput.slice(0, separatorIndex).trim();
  const tagLine = trimmedInput.slice(separatorIndex + 1).trim();

  return {
    gameName,
    tagLine: tagLine || undefined,
    isComplete: Boolean(gameName && tagLine)
  };
}
