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

/** `YYYY-MM-DD HH:mm:ss` 或 `T` 分隔；可选 `.fff` 毫秒；按本地时区解释。 */
const LOCAL_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?$/;

/** 仅日期，按本地当天 00:00:00。 */
const LOCAL_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function normalizeFractionalMs(frac: string): number {
  const padded = (frac + "000").slice(0, 3);
  const n = Number(padded);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 将常见时间字符串解析为 **Unix 毫秒**。
 * 优先：`YYYY-MM-DD HH:mm:ss` / `YYYY-MM-DDTHH:mm:ss`（本地）；`YYYY-MM-DD`（本地零点）。
 * 其它：`Date.parse` 可识别的字符串（如带 `Z` 的 ISO）。
 */
export function parseTimeStringToUnixMilliseconds(raw: string): number | null {
  const s = raw.trim();
  if (!s) {
    return null;
  }

  let m = LOCAL_DATE_TIME.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const h = Number(m[4]);
    const mi = Number(m[5]);
    const sec = Number(m[6]);
    const msPart = m[7] !== undefined ? normalizeFractionalMs(m[7]) : 0;
    const date = new Date(y, mo - 1, d, h, mi, sec, msPart);
    if (
      date.getFullYear() !== y ||
      date.getMonth() !== mo - 1 ||
      date.getDate() !== d ||
      date.getHours() !== h ||
      date.getMinutes() !== mi ||
      date.getSeconds() !== sec ||
      date.getMilliseconds() !== msPart
    ) {
      return null;
    }
    return date.getTime();
  }

  m = LOCAL_DATE_ONLY.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const date = new Date(y, mo - 1, d, 0, 0, 0, 0);
    if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) {
      return null;
    }
    return date.getTime();
  }

  const t = Date.parse(s);
  if (Number.isNaN(t)) {
    return null;
  }
  return t;
}

/** Unix 秒（向下取整），规则同 {@link parseTimeStringToUnixMilliseconds}。 */
export function parseTimeStringToUnixSeconds(raw: string): number | null {
  const ms = parseTimeStringToUnixMilliseconds(raw);
  if (ms === null) {
    return null;
  }
  return Math.floor(ms / 1000);
}
