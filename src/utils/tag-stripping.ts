export function stripPrivateTags(text: string): string {
  return text.replace(/<private>[\s\S]*?<\/private>/gi, '');
}

export function extractPrivateTags(text: string): string[] {
  const matches: string[] = [];
  const regex = /<private>[\s\S]*?<\/private>/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[0]);
  }
  return matches;
}

export function hasPrivateTags(text: string): boolean {
  return /<private>[\s\S]*?<\/private>/gi.test(text);
}