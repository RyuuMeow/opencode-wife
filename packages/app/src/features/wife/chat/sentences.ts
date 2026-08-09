// Splits a reply into short sentences so the companion can deliver it one
// bubble at a time, like a person talking. Sentence boundaries are CJK/full
// width end marks, common punctuation, newlines, and English periods followed
// by a capital letter (decimals like "3.14" stay intact).
export function splitIntoSentences(text: string) {
  const code: string[] = []
  const protectedText = text.replace(/```[\s\S]*?```|`[^`\n]+`/g, (value) => {
    const token = `\uE000${code.length}\uE001`
    code.push(value)
    return token
  })
  return protectedText
    .split(/(?<=[。！？!?…\n])|(?<=[a-zA-Z]\.)(?=\s+[A-Z])/g)
    .map((segment) =>
      segment
        .replace(/\uE000(\d+)\uE001/g, (_, index: string) => code[Number(index)] ?? "")
        .trim(),
    )
    .filter(Boolean)
}
