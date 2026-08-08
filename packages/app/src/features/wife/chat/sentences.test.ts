import { describe, expect, test } from "bun:test"
import { splitIntoSentences } from "./sentences"

describe("splitIntoSentences", () => {
  test("splits on CJK end marks", () => {
    expect(splitIntoSentences("你好。今天天氣不錯！要不要出去走走?")).toEqual([
      "你好。",
      "今天天氣不錯！",
      "要不要出去走走?",
    ])
  })

  test("splits on English periods followed by capitals", () => {
    expect(splitIntoSentences("Done. Next step is easy.")).toEqual(["Done.", "Next step is easy."])
  })

  test("keeps decimals intact", () => {
    expect(splitIntoSentences("價格是 3.14 元。")).toEqual(["價格是 3.14 元。"])
  })

  test("splits on newlines", () => {
    expect(splitIntoSentences("第一行\n第二行")).toEqual(["第一行", "第二行"])
  })

  test("returns empty for blank input", () => {
    expect(splitIntoSentences("")).toEqual([])
    expect(splitIntoSentences("   ")).toEqual([])
  })

  test("keeps a long run without boundaries as one segment", () => {
    expect(splitIntoSentences("這是一段很長但沒有句點的文字")).toEqual(["這是一段很長但沒有句點的文字"])
  })
})
