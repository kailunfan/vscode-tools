import * as vscode from "vscode";
import { formatLocalDateTime, parseTimestamp } from "./model";

/** 与 package.json contributes.commands 保持一致 */
export const TIMESTAMP_DECODE_COMMAND = "vscode-tools.decodeTimestamp";

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

function resolveTimestampRange(
  document: vscode.TextDocument,
  editor: vscode.TextEditor
): vscode.Range | undefined {
  const sel = editor.selection;
  if (!sel.isEmpty) {
    const raw = document.getText(sel);
    return parseTimestamp(raw) === null ? undefined : sel;
  }
  return getTimestampRangeAtPosition(document, sel.active);
}

function buildTimestampHoverMarkdown(local: string): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  md.appendCodeblock(local, "plaintext");
  return md;
}

export function registerTimestampTool(context: vscode.ExtensionContext): void {
  const hoverDisposable = vscode.languages.registerHoverProvider("*", {
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

  const commandDisposable = vscode.commands.registerCommand(TIMESTAMP_DECODE_COMMAND, () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage("没有活动的编辑器。");
      return;
    }
    const range = resolveTimestampRange(editor.document, editor);
    if (!range) {
      vscode.window.showWarningMessage("光标处或选区内未识别到秒级/毫秒级时间戳。");
      return;
    }
    const text = editor.document.getText(range);
    const ms = parseTimestamp(text);
    if (ms === null) {
      vscode.window.showErrorMessage(
        `无法解析为秒级或毫秒级时间戳：「${text.trim().slice(0, 80)}${text.trim().length > 80 ? "…" : ""}」`
      );
      return;
    }
    const local = formatLocalDateTime(ms);
    vscode.window.showInformationMessage(local, "复制").then((choice: string | undefined) => {
      if (choice === "复制") {
        vscode.env.clipboard.writeText(local);
      }
    });
  });

  context.subscriptions.push(hoverDisposable, commandDisposable);
}
