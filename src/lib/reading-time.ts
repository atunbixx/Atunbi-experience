export function readingTime(markdown: string, wpm = 220): string {
  const words = markdown.replace(/[#>*_`~\-\[\]\(\)]/g, ' ').split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / wpm));
  return `${minutes} min read`;
}
