// Splits a reply into short sentences so the companion can deliver it one
// bubble at a time, like a person talking. Sentence boundaries are CJK/full
// width end marks, common punctuation, newlines, and English periods followed
// by a capital letter (decimals like "3.14" stay intact).
export function splitIntoSentences(text: string) {
  return text
    .split(/(?<=[。！？!?…\n])|(?<=[a-zA-Z]\.)(?=\s+[A-Z])/g)
    .map((segment) => segment.trim())
    .filter(Boolean)
}
