/** Theme brand color utilities — drives CSS variables on :root */

export const THEME_STORAGE_KEY = "bx-theme-color";
export const DEFAULT_THEME_COLOR = "#6366f1";

export const THEME_PRESETS = [
  { id: "indigo", hex: "#6366f1", label: "紫色" },
  { id: "blue", hex: "#0058f8", label: "蓝色" },
  { id: "green", hex: "#41b85e", label: "绿色" },
  { id: "amber", hex: "#f87034", label: "琥珀色" },
  { id: "pink", hex: "#fc3354", label: "粉色" },
] as const;

function clamp(n: number, min = 0, max = 255) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw
      .split("")
      .map((c) => c + c)
      .join("")
      .toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw.toLowerCase()}`;
  }
  return null;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((n) => clamp(n).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Darken toward black by ratio 0–1 */
function darken(hex: string, ratio: number) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - ratio), g * (1 - ratio), b * (1 - ratio));
}

/** Mix with white by ratio 0–1 (1 = almost white) */
function softBg(hex: string, ratio = 0.9) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * ratio,
    g + (255 - g) * ratio,
    b + (255 - b) * ratio,
  );
}

function softBorder(hex: string) {
  return softBg(hex, 0.75);
}

export function buildThemeVars(hex: string): Record<string, string> {
  const color = normalizeHex(hex) ?? DEFAULT_THEME_COLOR;
  const { r, g, b } = hexToRgb(color);
  const hover = darken(color, 0.12);
  const soft = softBg(color, 0.9);
  const selected = softBg(color, 0.88);

  return {
    "--primary": color,
    "--primary-hover": hover,
    "--brand": color,
    "--brand-soft": soft,
    "--accent": color,
    "--info": hover,
    "--sidebar-active": soft,
    "--focus-border": color,
    "--focus-ring": `0 0 0 3px rgba(${r}, ${g}, ${b}, 0.18)`,
    "--option-selected-bg": selected,
    "--tag-info-bg": soft,
    "--tag-info-ink": hover,
    "--tag-info-border": softBorder(color),
  };
}

export function applyThemeColor(hex: string, root: HTMLElement = document.documentElement) {
  const color = normalizeHex(hex) ?? DEFAULT_THEME_COLOR;
  const vars = buildThemeVars(color);
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  return color;
}

/** Inline boot script to avoid flash of default brand before React hydrates */
export const THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var d=${JSON.stringify(DEFAULT_THEME_COLOR)};var c=localStorage.getItem(k)||d;if(!/^#[0-9a-fA-F]{6}$/.test(c))c=d;function p(h){h=h.slice(1);return{r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16)}}function mix(h,t){var o=p(h),f=function(n){return Math.round(n+(255-n)*t).toString(16).padStart(2,"0")};return"#"+f(o.r)+f(o.g)+f(o.b)}function dark(h,t){var o=p(h),f=function(n){return Math.round(n*(1-t)).toString(16).padStart(2,"0")};return"#"+f(o.r)+f(o.g)+f(o.b)}var o=p(c),h=dark(c,.12),s=mix(c,.9),e=document.documentElement;e.style.setProperty("--primary",c);e.style.setProperty("--primary-hover",h);e.style.setProperty("--brand",c);e.style.setProperty("--brand-soft",s);e.style.setProperty("--accent",c);e.style.setProperty("--info",h);e.style.setProperty("--sidebar-active",s);e.style.setProperty("--focus-border",c);e.style.setProperty("--focus-ring","0 0 0 3px rgba("+o.r+", "+o.g+", "+o.b+", 0.18)");e.style.setProperty("--option-selected-bg",mix(c,.88));e.style.setProperty("--tag-info-bg",s);e.style.setProperty("--tag-info-ink",h);e.style.setProperty("--tag-info-border",mix(c,.75))}catch(e){}})();`;
