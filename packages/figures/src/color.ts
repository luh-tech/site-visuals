/**
 * Colour arithmetic, ported from schema-registry tools/figure_palette.py so a line or a lightness step computed
 * here is the one the registry's tests check: OKLab/OKLCH <-> sRGB (Bjorn Ottosson), WCAG 2.2 relative luminance
 * and contrast, and a fill's line -- the same hue darkened (or lightened on a dark surface) to a contrast ratio.
 */

type RGB = [number, number, number];

const lin = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c: number): number => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function hexRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as RGB;
}

export function rgbHex(rgb: RGB): string {
  return (
    "#" +
    rgb
      .map((c) => Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

function rgbOklab([r0, g0, b0]: RGB): RGB {
  const [r, g, b] = [lin(r0), lin(g0), lin(b0)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabRgb([L, a, b]: RGB): RGB {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    gam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    gam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    gam(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

export function hexOklch(hex: string): [number, number, number] {
  const [L, a, b] = rgbOklab(hexRgb(hex));
  const C = Math.hypot(a, b);
  const H = C > 1e-4 ? ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 : 0;
  return [L, C, H];
}

/** The colour at lightness L, hue H and the most chroma up to C that sRGB holds. */
export function oklchHex(L: number, C: number, H: number): string {
  const rad = (H * Math.PI) / 180;
  for (let c = C; c >= 0; c -= 0.005) {
    const rgb = oklabRgb([L, c * Math.cos(rad), c * Math.sin(rad)]);
    if (rgb.every((v) => v >= -1e-6 && v <= 1 + 1e-6)) return rgbHex(rgb);
  }
  return rgbHex(oklabRgb([L, 0, 0]));
}

export function luminance(hex: string): number {
  const [r, g, b] = hexRgb(hex).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The fill's hue moved in OKLCH lightness until it reaches `ratio` on `surface` (darker on a light surface). */
export function lineFor(fill: string, surface: string, ratio = 3.0): string {
  if (contrast(fill, surface) >= ratio) return fill.toUpperCase();
  const [L, C, H] = hexOklch(fill);
  const darker = luminance(surface) > 0.18;
  for (let step = 1; step <= 100; step++) {
    const cand = oklchHex(darker ? L - step * 0.01 : L + step * 0.01, C, H);
    if (contrast(cand, surface) >= ratio) return cand;
  }
  throw new Error(`no line for ${fill} on ${surface}`);
}

/** The fill moved by `delta` in OKLCH lightness, hue and chroma kept (as far as sRGB allows). */
export function shiftLightness(hex: string, delta: number): string {
  const [L, C, H] = hexOklch(hex);
  return oklchHex(Math.max(0, Math.min(1, L + delta)), C, H);
}
