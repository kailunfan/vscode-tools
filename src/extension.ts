import * as vscode from "vscode";
import { registerAllTools } from "./tools/registry";

export function activate(context: vscode.ExtensionContext): void {
  registerAllTools(context);
}

export function deactivate(): void {}
