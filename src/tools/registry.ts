import * as vscode from "vscode";
import { registerTimestampTool } from "./timestamp";

/**
 * 集中注册所有工具。新增工具时：在 ./<tool>/ 下实现 registerXxxTool，再在此处调用。
 */
export function registerAllTools(context: vscode.ExtensionContext): void {
  registerTimestampTool(context);
}
