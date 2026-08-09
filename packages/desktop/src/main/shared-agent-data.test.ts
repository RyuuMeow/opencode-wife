import { describe, expect, test } from "bun:test"
import { migrationState, SUPPORTED_MIGRATION_CUTOFF } from "./shared-agent-data"

describe("shared Agent data compatibility", () => {
  test("backs up a legacy or unmigrated database", () => {
    expect(migrationState(undefined)).toBe("needs-backup")
    expect(migrationState(SUPPORTED_MIGRATION_CUTOFF - 1)).toBe("needs-backup")
  })

  test("accepts the bundled schema boundary", () => {
    expect(migrationState(SUPPORTED_MIGRATION_CUTOFF)).toBe("compatible")
  })

  test("rejects a database migrated by a newer OpenCode", () => {
    expect(migrationState(SUPPORTED_MIGRATION_CUTOFF + 1)).toBe("incompatible")
  })
})
