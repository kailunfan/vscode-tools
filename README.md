# Developer Toolkit (vscode-tools)

A VS Code / Cursor extension that bundles small developer utilities. Currently includes **Unix timestamp** helpers: editor **hover**, **convert selection to local time string**, and **convert selection to Unix seconds**.

## Requirements

- VS Code **≥ 1.85** (or a compatible Cursor build)

## Features

### Timestamps

- **Hover**: Move the pointer over a second- or millisecond-level Unix timestamp in the editor to see a hover with **local** time as `YYYY-MM-DD HH:mm:ss` (token expansion on the current line; stops at spaces).
- **Commands** (context menu when text is selected, and Command Palette):  
  - **Convert to time string** (`vscode-tools.timestampToTimeString`): replaces the selection with local `YYYY-MM-DD HH:mm:ss`.  
  - **Convert to timestamp** (`vscode-tools.encodeToUnixSeconds`): replaces the selection with **Unix seconds**.
  - **Convert to timestamp (ms)** (`vscode-tools.encodeToUnixMilliseconds`): replaces the selection with **Unix milliseconds**.

**Parsing rules (summary)**

- **Seconds**: Integer part 1–11 digits; optional fractional part; converted to milliseconds internally.
- **Milliseconds**: Integer part 12–13 digits; must be an integer (no fraction).
- Values with an integer part of **14+** digits (e.g. nanoseconds) are **not** parsed.
- Caret expansion stays on **one line** and includes only digits and `,`, `_`, `.`; it **stops at spaces**. Manually selected text can still be normalized (spaces stripped) in the `model` layer.

## Development

```bash
npm install
npm run compile
```

Open this folder in VS Code or Cursor, then **Run Extension** (or **F5**) in Run and Debug to launch an Extension Development Host.

Watch mode:

```bash
npm run watch
```

## Package as VSIX

```bash
npm run package
```

Produces `vscode-tools-0.0.1.vsix` at the repo root (version follows `package.json`).

Install via **Extensions: Install from VSIX…**, or:

```bash
code --install-extension ./vscode-tools-0.0.1.vsix
```

On Cursor, use the `cursor` CLI if you have it set up instead of `code`.

## Project layout

```
src/
  extension.ts           # Entry point
  tools/
    registry.ts          # Registers all tools
    timestamp/
      index.ts           # Commands, hovers, VS Code wiring
      model.ts           # Pure parse/format (no vscode dependency)
```

To add a tool: implement it under `src/tools/<name>/`, register it in `registry.ts`, and update `package.json` `contributes`.

## Publishing

`publisher` in `package.json` is `local` for local VSIX builds. For the Marketplace, set your publisher id and add license, repository, and other required metadata.
