import { mkdir, readdir, rm, stat } from "node:fs/promises"
import { basename, join } from "node:path"

export const OPENCODE_BASE_VERSION = "1.18.14"
export const SUPPORTED_MIGRATION_CUTOFF = 20260622202450

export class SharedAgentDataIncompatibleError extends Error {
  constructor(readonly database: string, readonly latestMigration: number) {
    super(
      `Shared OpenCode data is newer than OpenCode Wife ${OPENCODE_BASE_VERSION} supports. ` +
        `Update OpenCode Wife before opening ${basename(database)}.`,
    )
    this.name = "SharedAgentDataIncompatibleError"
  }
}

export function migrationState(latestMigration: number | undefined) {
  if (latestMigration === undefined) return "needs-backup" as const
  if (latestMigration > SUPPORTED_MIGRATION_CUTOFF) return "incompatible" as const
  if (latestMigration < SUPPORTED_MIGRATION_CUTOFF) return "needs-backup" as const
  return "compatible" as const
}

export async function prepareSharedAgentData(input: { stateHome: string; wifeUserData: string }) {
  const databases = await findDatabases(input.stateHome)
  if (databases.length === 0) return { databases: 0, backups: 0 }

  const sqlite = await import("node:sqlite")
  const inspected = databases.map((file) => {
    const database = new sqlite.DatabaseSync(file, { readOnly: true, timeout: 5_000 })
    try {
      const table = database
        .prepare("SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'")
        .get() as { found?: number } | undefined
      const row = table
        ? (database.prepare("SELECT MAX(CAST(created_at AS INTEGER)) AS latest FROM __drizzle_migrations").get() as {
            latest: number | null
          })
        : undefined
      return { file, latestMigration: row?.latest === null ? undefined : row?.latest }
    } finally {
      database.close()
    }
  })

  const incompatible = inspected.find((item) => migrationState(item.latestMigration) === "incompatible")
  if (incompatible?.latestMigration !== undefined) {
    throw new SharedAgentDataIncompatibleError(incompatible.file, incompatible.latestMigration)
  }

  const pending = inspected.filter((item) => migrationState(item.latestMigration) === "needs-backup")
  if (pending.length === 0) return { databases: databases.length, backups: 0 }

  const backupRoot = join(input.wifeUserData, "backups", "agent-state")
  const directory = join(backupRoot, new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-"))
  await mkdir(directory, { recursive: true })
  await Promise.all(
    pending.map(async (item) => {
      const database = new sqlite.DatabaseSync(item.file, { readOnly: true, timeout: 5_000 })
      try {
        await sqlite.backup(database, join(directory, basename(item.file)))
      } finally {
        database.close()
      }
    }),
  )
  await pruneBackups(backupRoot)
  return { databases: databases.length, backups: pending.length }
}

async function findDatabases(stateHome: string) {
  const directory = join(stateHome, "opencode")
  const files = (await readdir(directory, { withFileTypes: true }).catch(() => []))
    .filter((entry) => entry.isFile() && /^opencode(?:-[A-Za-z0-9._-]+)?\.db$/.test(entry.name))
    .map((entry) => join(directory, entry.name))
  const sizes = await Promise.all(files.map(async (file) => ({ file, size: (await stat(file)).size })))
  return sizes.filter((item) => item.size > 0).map((item) => item.file)
}

async function pruneBackups(root: string) {
  const directories = (await readdir(root, { withFileTypes: true }).catch(() => []))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
  await Promise.all(directories.slice(0, -3).map((name) => rm(join(root, name), { recursive: true, force: true })))
}
