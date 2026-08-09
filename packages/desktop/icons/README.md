# OpenCode Wife Icons

The canonical source is `opencode-wife.svg`. Windows and raster desktop assets are generated with:

```powershell
./scripts/generate-wife-icons.ps1
```

Run `bun ./scripts/copy-icons.ts <dev|beta|prod>` from `packages/desktop` afterward to refresh build resources.
Electron Builder uses `icon.png` for macOS/Linux and the generated multi-size `icon.ico` for Windows.
