import * as vscode from "vscode";
import {
  formatLocalDateTime,
  parseTimeStringToUnixMilliseconds,
  parseTimeStringToUnixSeconds,
  parseTimestamp,
} from "./model";

/** 与 package.json contributes.commands 保持一致 */
export const TIMESTAMP_ENCODE_COMMAND = "vscode-tools.encodeToUnixSeconds";
export const TIMESTAMP_ENCODE_MS_COMMAND = "vscode-tools.encodeToUnixMilliseconds";
export const TIMESTAMP_TO_TIME_STRING_COMMAND = "vscode-tools.timestampToTimeString";

/** 含 `http` / 路径匹配：少数环境下仅 `"*"` 未覆盖 REST Client 等注册的 `http` 语言。 */
const TIMESTAMP_HOVER_SELECTOR: vscode.DocumentSelector = [
  "*",
  "http",
  { pattern: "**/*.http" },
  { pattern: "**/*.rest" },
];

/** 从光标位置向左右扩展，得到一行内可尝试解析为时间戳的连续片段；遇空格停止、不跨越空格。 */
function getTimestampRangeAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position
): vscode.Range | undefined {
  const line = document.lineAt(position.line).text;
  if (line.length === 0) {
    return undefined;
  }
  let col = Math.min(position.character, line.length - 1);
  const isTokenChar = (c: string) => /[\d,._]/.test(c);

  let idx = col;
  if (!isTokenChar(line[idx]) && line[idx] !== "-") {
    if (idx > 0 && (isTokenChar(line[idx - 1]) || line[idx - 1] === "-")) {
      idx -= 1;
    } else {
      return undefined;
    }
  }

  let start = idx;
  while (start > 0 && isTokenChar(line[start - 1])) {
    start -= 1;
  }
  if (start > 0 && line[start - 1] === "-") {
    start -= 1;
  }

  let end = idx + 1;
  while (end < line.length && isTokenChar(line[end])) {
    end += 1;
  }

  const raw = line.slice(start, end);
  if (parseTimestamp(raw) === null) {
    return undefined;
  }
  return new vscode.Range(position.line, start, position.line, end);
}

function buildTimestampHoverMarkdown(local: string): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  md.appendCodeblock(local, "plaintext");
  return md;
}

export function registerTimestampTool(context: vscode.ExtensionContext): void {
  const hoverDisposable = vscode.languages.registerHoverProvider(TIMESTAMP_HOVER_SELECTOR, {
    provideHover(
      document: vscode.TextDocument,
      position: vscode.Position,
      _token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
      const range = getTimestampRangeAtPosition(document, position);
      if (!range) {
        return undefined;
      }
      const raw = document.getText(range);
      const ms = parseTimestamp(raw);
      if (ms === null) {
        return undefined;
      }
      const local = formatLocalDateTime(ms);
      return new vscode.Hover(buildTimestampHoverMarkdown(local), range);
    },
  });

  const toStringDisposable = vscode.commands.registerCommand(
    TIMESTAMP_TO_TIME_STRING_COMMAND,
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("没有活动的编辑器。");
        return;
      }
      const sel = editor.selection;
      if (sel.isEmpty) {
        vscode.window.showWarningMessage("请先选中要转换的时间戳文本。");
        return;
      }
      const raw = editor.document.getText(sel);
      const ms = parseTimestamp(raw);
      if (ms === null) {
        vscode.window.showErrorMessage(
          `无法解析为秒级或毫秒级时间戳：「${raw.trim().slice(0, 80)}${raw.trim().length > 80 ? "…" : ""}」`
        );
        return;
      }
      const out = formatLocalDateTime(ms);
      if (out === "(无效)") {
        vscode.window.showErrorMessage("时间戳对应无效日期。");
        return;
      }
      const ok = await editor.edit((eb) => eb.replace(sel, out));
      if (!ok) {
        vscode.window.showErrorMessage("无法替换选区。");
      }
    }
  );

  const encodeDisposable = vscode.commands.registerCommand(TIMESTAMP_ENCODE_COMMAND, async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage("没有活动的编辑器。");
      return;
    }
    const sel = editor.selection;
    if (sel.isEmpty) {
      vscode.window.showWarningMessage("请先选中要转换的时间文本。");
      return;
    }
    const raw = editor.document.getText(sel);
    const sec = parseTimeStringToUnixSeconds(raw);
    if (sec === null) {
      vscode.window.showErrorMessage(
        `无法解析为时间：「${raw.trim().slice(0, 80)}${raw.trim().length > 80 ? "…" : ""}」`
      );
      return;
    }
    const out = String(sec);
    const ok = await editor.edit((eb) => eb.replace(sel, out));
    if (!ok) {
      vscode.window.showErrorMessage("无法替换选区。");
    }
  });

  const encodeMsDisposable = vscode.commands.registerCommand(TIMESTAMP_ENCODE_MS_COMMAND, async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage("没有活动的编辑器。");
      return;
    }
    const sel = editor.selection;
    if (sel.isEmpty) {
      vscode.window.showWarningMessage("请先选中要转换的时间文本。");
      return;
    }
    const raw = editor.document.getText(sel);
    const ms = parseTimeStringToUnixMilliseconds(raw);
    if (ms === null) {
      vscode.window.showErrorMessage(
        `无法解析为时间：「${raw.trim().slice(0, 80)}${raw.trim().length > 80 ? "…" : ""}」`
      );
      return;
    }
    const out = String(ms);
    const ok = await editor.edit((eb) => eb.replace(sel, out));
    if (!ok) {
      vscode.window.showErrorMessage("无法替换选区。");
    }
  });

  context.subscriptions.push(hoverDisposable, toStringDisposable, encodeDisposable, encodeMsDisposable);
}
