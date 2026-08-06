/** Local date as YYYY-MM-DD (for form defaults). */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Local datetime as YYYY-MM-DDTHH:mm (minute precision). */
export function nowLocalDateTime(): string {
  const d = new Date();
  return `${todayISO()}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Display weigh datetime (minute precision). */
export function formatWeighDateTime(value: string): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    const [date, time] = value.split("T");
    return `${date} ${time.slice(0, 5)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("zh-HK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function splitLocalDateTime(value: string): { date: string; time: string } {
  if (value && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    const [date, time] = value.split("T");
    return { date, time: time.slice(0, 5) };
  }
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { date: value, time: "00:00" };
  }
  const now = nowLocalDateTime();
  const [date, time] = now.split("T");
  return { date, time };
}

export function joinLocalDateTime(date: string, time: string): string {
  const d = date || todayISO();
  const t = time || "00:00";
  return `${d}T${t.slice(0, 5)}`;
}
