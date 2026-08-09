import { PermissionV1 } from "@opencode-ai/core/v1/permission"
import { AppNodeBuilder } from "@opencode-ai/core/effect/app-node-builder"
import { LayerNode } from "@opencode-ai/core/effect/layer-node"
import { describe, expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { EventV2Bridge } from "../src/event-v2-bridge"
import { CrossSpawnSpawner } from "@opencode-ai/core/cross-spawn-spawner"
import { Permission } from "../src/permission"
import { InstanceBootstrap } from "../src/project/bootstrap"
import { InstanceStore } from "../src/project/instance-store"
import { SessionID } from "../src/session/schema"
import { testEffect } from "./lib/effect"

const noopBootstrap = Layer.succeed(InstanceBootstrap.Service, InstanceBootstrap.Service.of({ run: Effect.void }))
const env = AppNodeBuilder.build(
  LayerNode.group([Permission.node, EventV2Bridge.node, CrossSpawnSpawner.node, InstanceStore.node]),
  [[InstanceStore.bootstrapNode, noopBootstrap]],
)
const it = testEffect(env)

// The read-only profile planned for the wife session (docs/09):
// deny everything, then allow the read-only tools back in. Last match wins,
// so the allow rules override the global deny for read/glob/grep.
const readOnlyRuleset: PermissionV1.Ruleset = [
  { permission: "*", action: "deny", pattern: "*" },
  { permission: "read", action: "allow", pattern: "*" },
  { permission: "glob", action: "allow", pattern: "*" },
  { permission: "grep", action: "allow", pattern: "*" },
]
const handoffRuleset: PermissionV1.Ruleset = [{ permission: "*", action: "deny", pattern: "*" }]

describe("wife read-only session ruleset", () => {
  test("denies write and execution tools", () => {
    for (const tool of ["bash", "edit", "write", "apply_patch", "task", "skill"]) {
      expect(Permission.evaluate(tool, "*", readOnlyRuleset).action).toBe("deny")
    }
  })

  test("allows read-only tools", () => {
    for (const tool of ["read", "glob", "grep"]) {
      expect(Permission.evaluate(tool, "*", readOnlyRuleset).action).toBe("allow")
    }
  })

  test("denies anything not explicitly allowed", () => {
    expect(Permission.evaluate("webfetch", "*", readOnlyRuleset).action).toBe("deny")
    expect(Permission.evaluate("mcp__github", "*", readOnlyRuleset).action).toBe("deny")
  })

  test("removes write tools from the visible set", () => {
    const tools = ["bash", "edit", "write", "apply_patch", "task", "skill", "read", "glob", "grep"]
    expect(Permission.disabled(tools, readOnlyRuleset)).toEqual(
      new Set(["bash", "edit", "write", "apply_patch", "task", "skill"]),
    )
  })

  test("removes every tool from the handoff session", () => {
    const tools = ["bash", "edit", "read", "glob", "grep", "webfetch", "mcp__github"]
    expect(Permission.disabled(tools, handoffRuleset)).toEqual(new Set(tools))
    tools.forEach((tool) => expect(Permission.evaluate(tool, "*", handoffRuleset).action).toBe("deny"))
  })

  it.instance(
    "rejects a write tool call and lets a read tool pass without asking",
    () =>
      Effect.gen(function* () {
        const permission = yield* Permission.Service
        const ask = (tool: string) =>
          permission.ask({
            id: PermissionV1.ID.ascending(),
            sessionID: SessionID.make("session_test"),
            permission: tool,
            patterns: ["*"],
            metadata: {},
            always: [],
            ruleset: readOnlyRuleset,
          })

        const denied = yield* ask("bash").pipe(Effect.flip)
        expect(denied).toBeInstanceOf(PermissionV1.DeniedError)
        yield* ask("read")
      }),
    { git: true },
  )
})
