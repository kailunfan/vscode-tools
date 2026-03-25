/**
 * 时间戳工具：纯解析与格式化（不依赖 vscode，便于单测或复用）。
 *
 * 解析规则：
 * - 秒级：整数部分 1～11 位，可带小数（按秒的小数解析）；内部转为毫秒。
 * - 毫秒级：整数部分 12～13 位，必须为整数；不接受小数。
 * - 其他位数（如纳秒 14+ 位）一律不解析。
 */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** 本地时间，固定格式：YYYY-MM-DD HH:mm:ss */
function formatYmdHmsLocal(d: Date): string {
  const y = d.getFullYear();
  const mo = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours();
  const m = d.getMinutes();
  const s = d.getSeconds();
  return `${y}-${pad2(mo)}-${pad2(day)} ${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

export function parseTimestamp(raw: string): number | null {
  const s = raw.trim().replace(/[,_\s]/g, "");
  if (!s || !/^-?\d+(\.\d+)?$/.test(s)) {
    return null;
  }
  const unsigned = s.startsWith("-") ? s.slice(1) : s;
  const [intStr, fracPart] = unsigned.split(".");
  const intLen = intStr.length;
  if (intLen === 0) {
    return null;
  }
  const hasFrac = fracPart !== undefined && fracPart.length > 0;
  if (intLen >= 14) {
    return null;
  }
  if (hasFrac && intLen >= 12) {
    return null;
  }

  const n = Number(s);
  if (!Number.isFinite(n)) {
    return null;
  }

  if (intLen <= 11) {
    return n * 1000;
  }
  if (intLen === 12 || intLen === 13) {
    if (hasFrac || !Number.isInteger(n)) {
      return null;
    }
    return n;
  }
  return null;
}

export function formatLocalDateTime(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) {
    return "(无效)";
  }
  return formatYmdHmsLocal(d);
}
