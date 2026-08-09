import { describe, expect, test } from "bun:test"
import {
  generateWifeChoicesWithRetry,
  normalizeWifeChoices,
  projectWifeChoiceContext,
  resolveWifeHistoryChoices,
  WIFE_CHOICE_CONTEXT_TOTAL_LIMIT,
  wifeChoiceGeneratorSystemPrompt,
  wifeChoiceModelAvailable,
} from "./wife-choice-generator"

describe("wife choice generator", () => {
  test("accepts only two or three unique explicit choice tags", () => {
    expect(normalizeWifeChoices("<choice>繼續</choice>\n<choice>換個方向</choice>")).toEqual([
      "繼續",
      "換個方向",
    ])
    expect(normalizeWifeChoices("<choice>繼續</choice>\n<choice>繼續</choice>")).toBeUndefined()
    expect(normalizeWifeChoices("- 繼續\n- 換個方向")).toBeUndefined()
    expect(normalizeWifeChoices("說明\n<choice>繼續</choice>\n<choice>換個方向</choice>")).toBeUndefined()
  })

  test("projects bounded visible conversation and persona context", () => {
    const context = projectWifeChoiceContext({
      characterName: "Hiyori",
      behavior: { userAddress: "隊長", personaInstructions: "自然溫柔" },
      latestUserMessage: "接下來呢？",
      assistantMessages: ["我們可以先做設定。"],
      transcript: Array.from({ length: 12 }, (_, index) => ({
        id: String(index),
        turnID: String(index),
        role: index % 2 ? ("assistant" as const) : ("user" as const),
        content: `訊息 ${index} ${"長".repeat(900)}`,
      })),
    })
    expect(context.length).toBeLessThanOrEqual(WIFE_CHOICE_CONTEXT_TOTAL_LIMIT)
    expect(context).toContain("Hiyori")
    expect(context).toContain("隊長")
    expect(context).toContain("接下來呢")
    expect(context).toContain("我們可以先做設定")
    expect(JSON.parse(context).recentTranscript.length).toBeLessThanOrEqual(8)
  })

  test("uses a strict same-language no-tools output contract", () => {
    const prompt = wifeChoiceGeneratorSystemPrompt()
    expect(prompt).toContain("exactly 2 or 3")
    expect(prompt).toContain("same language")
    expect(prompt).toContain("Do not use tools")
    expect(prompt).toContain("<choice>")
    expect(prompt).not.toContain("<message>")
    expect(wifeChoiceGeneratorSystemPrompt(true)).toContain("previous output was invalid")
  })

  test("retries invalid output once and rejects a second invalid response", async () => {
    const attempts: boolean[] = []
    expect(
      await generateWifeChoicesWithRetry(async (retry) => {
        attempts.push(retry)
        return retry ? "<choice>繼續</choice><choice>換個方向</choice>" : "- 繼續\n- 換個方向"
      }),
    ).toEqual(["繼續", "換個方向"])
    expect(attempts).toEqual([false, true])
    await expect(generateWifeChoicesWithRetry(async () => "只有普通文字")).rejects.toThrow("invalid output twice")
  })

  test("requires the configured provider, model, and variant", () => {
    const models = [{ provider: { id: "opencode" }, id: "deepseek-v4-flash", variants: { low: {} } }]
    expect(wifeChoiceModelAvailable(models, { providerID: "opencode", modelID: "deepseek-v4-flash", variant: "low" }))
      .toBe(true)
    expect(wifeChoiceModelAvailable(models, { providerID: "other", modelID: "deepseek-v4-flash" })).toBe(false)
    expect(wifeChoiceModelAvailable(models, { providerID: "opencode", modelID: "deepseek-v4-flash", variant: "high" }))
      .toBe(false)
  })

  test("restores only choices attached to the latest unanswered assistant message", () => {
    const history = { choices: ["舊格式"], assistantMessageID: "assistant-2" }
    expect(resolveWifeHistoryChoices(history, { assistantMessageID: "assistant-2", choices: ["繼續", "停一下"] }))
      .toEqual({ choices: ["繼續", "停一下"], stale: false })
    expect(resolveWifeHistoryChoices(history, { assistantMessageID: "assistant-1", choices: ["過期"] })).toEqual({
      choices: ["舊格式"],
      stale: true,
    })
  })
})
