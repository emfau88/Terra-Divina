/**
 * toolIcons.ts — Visual Phase V1
 *
 * Central inline-SVG icon registry for all tool dock icons.
 *
 * Rules (from VISUAL_DIRECTION.md §3 Layer A):
 *   - viewBox="0 0 64 64" on every icon
 *   - stroke-linecap="round" stroke-linejoin="round" throughout
 *   - currentColor for strokes so CSS controls color via the button's color
 *   - fill="none" default; fills use explicit color or currentColor
 *   - readable at 28×28px rendered size (20px minimum)
 *   - max 3 distinct visual elements per icon
 *   - no external resources, no emoji
 */

export type ToolIconKey =
  | 'lightning'
  | 'fire'
  | 'rain'
  | 'meteor'
  | 'heal'
  | 'inspect'
  | 'human'
  | 'orc'
  | 'elf'
  | 'dwarf'
  | 'wolf'
  | 'demon'
  | 'terrain-grass'
  | 'terrain-water'
  | 'terrain-forest'
  | 'terrain-mountain'
  | 'terrain-sand'
  | 'pause'
  | 'speed'
  | 'fullscreen'
  // category tab icons
  | 'cat-destruction'
  | 'cat-nature'
  | 'cat-civilizations'
  | 'cat-creatures'
  | 'cat-terrain'
  | 'cat-more';

const S = `stroke-linecap="round" stroke-linejoin="round"`;
const sw4 = `stroke-width="4"`;
const sw5 = `stroke-width="5"`;
const sw3 = `stroke-width="3"`;

function svg(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" ${S}>${body}</svg>`;
}

export const TOOL_ICONS: Record<ToolIconKey, string> = {

  // ─── DESTRUCTION ─────────────────────────────────────────────────────────

  /** Zigzag bolt with small burst at tip */
  lightning: svg(`
    <polyline points="38,6 22,34 32,34 26,58" stroke="currentColor" ${sw5} fill="none"/>
    <circle cx="26" cy="57" r="4" fill="currentColor" opacity="0.5"/>
  `),

  /** Teardrop flame shape with bright inner flame */
  fire: svg(`
    <path d="M32 56 C18 56 12 44 12 36 C12 26 20 18 26 10 C26 10 24 20 32 24 C32 24 28 16 36 10
             C44 4 52 14 52 28 C52 42 46 56 32 56 Z"
          fill="currentColor" opacity="0.85"/>
    <path d="M32 50 C26 50 22 42 22 36 C22 30 28 26 32 22 C32 22 30 30 36 34
             C36 34 38 28 40 26 C44 32 42 50 32 50 Z"
          fill="currentColor" opacity="0.45"/>
  `),

  /** Three diagonal rain streaks with drop tips */
  rain: svg(`
    <line x1="20" y1="10" x2="10" y2="38" stroke="currentColor" ${sw4}/>
    <line x1="34" y1="10" x2="24" y2="44" stroke="currentColor" ${sw4}/>
    <line x1="48" y1="10" x2="38" y2="44" stroke="currentColor" ${sw4}/>
    <circle cx="10" cy="42" r="4" fill="currentColor" opacity="0.6"/>
    <circle cx="24" cy="48" r="4" fill="currentColor" opacity="0.6"/>
    <circle cx="38" cy="48" r="4" fill="currentColor" opacity="0.6"/>
  `),

  /** Rock circle with widening tail + 3 debris dots */
  meteor: svg(`
    <circle cx="40" cy="26" r="12" fill="currentColor"/>
    <path d="M30 36 L10 54" stroke="currentColor" ${sw4} opacity="0.5"/>
    <path d="M28 32 L6 50" stroke="currentColor" ${sw3} opacity="0.3"/>
    <circle cx="18" cy="46" r="3" fill="currentColor" opacity="0.55"/>
    <circle cx="11" cy="40" r="2.5" fill="currentColor" opacity="0.4"/>
    <circle cx="24" cy="52" r="2" fill="currentColor" opacity="0.35"/>
  `),

  /** Bold rounded-arm cross with a thin outer ring */
  heal: svg(`
    <rect x="24" y="8"  width="16" height="48" rx="6" fill="currentColor"/>
    <rect x="8"  y="24" width="48" height="16" rx="6" fill="currentColor"/>
    <circle cx="32" cy="32" r="28" stroke="currentColor" ${sw3} opacity="0.3"/>
  `),

  // ─── MORE / INFO ──────────────────────────────────────────────────────────

  /** Magnifying glass — circle + angled handle */
  inspect: svg(`
    <circle cx="26" cy="26" r="16" stroke="currentColor" ${sw4}/>
    <line x1="37" y1="37" x2="54" y2="54" stroke="currentColor" ${sw5}/>
  `),

  // ─── CIVILIZATIONS ───────────────────────────────────────────────────────

  /** Generic stick figure — circle head, body, two arms, two legs */
  human: svg(`
    <circle cx="32" cy="14" r="9" stroke="currentColor" ${sw4}/>
    <line x1="32" y1="23" x2="32" y2="44" stroke="currentColor" ${sw4}/>
    <line x1="32" y1="30" x2="16" y2="38" stroke="currentColor" ${sw4}/>
    <line x1="32" y1="30" x2="48" y2="38" stroke="currentColor" ${sw4}/>
    <line x1="32" y1="44" x2="20" y2="58" stroke="currentColor" ${sw4}/>
    <line x1="32" y1="44" x2="44" y2="58" stroke="currentColor" ${sw4}/>
  `),

  /** Stick figure + two short tusk curves below the head */
  orc: svg(`
    <circle cx="32" cy="14" r="10" stroke="currentColor" ${sw4}/>
    <path d="M26 22 C22 28 22 34 24 36" stroke="currentColor" ${sw3} fill="none" opacity="0.8"/>
    <path d="M38 22 C42 28 42 34 40 36" stroke="currentColor" ${sw3} fill="none" opacity="0.8"/>
    <line x1="32" y1="24" x2="32" y2="44" stroke="currentColor" ${sw4}/>
    <line x1="32" y1="30" x2="16" y2="40" stroke="currentColor" ${sw4}/>
    <line x1="32" y1="30" x2="48" y2="40" stroke="currentColor" ${sw4}/>
    <line x1="32" y1="44" x2="20" y2="58" stroke="currentColor" ${sw4}/>
    <line x1="32" y1="44" x2="44" y2="58" stroke="currentColor" ${sw4}/>
  `),

  /** Slender stick figure + two sharp ear points */
  elf: svg(`
    <circle cx="32" cy="14" r="8" stroke="currentColor" ${sw4}/>
    <line x1="25" y1="8"  x2="20" y2="2"  stroke="currentColor" ${sw3}/>
    <line x1="39" y1="8"  x2="44" y2="2"  stroke="currentColor" ${sw3}/>
    <line x1="32" y1="22" x2="32" y2="44" stroke="currentColor" ${sw4}/>
    <line x1="32" y1="30" x2="14" y2="40" stroke="currentColor" ${sw4}/>
    <line x1="32" y1="30" x2="50" y2="40" stroke="currentColor" ${sw4}/>
    <line x1="32" y1="44" x2="20" y2="58" stroke="currentColor" ${sw4}/>
    <line x1="32" y1="44" x2="44" y2="58" stroke="currentColor" ${sw4}/>
  `),

  /** Wider shorter figure + horizontal beard line */
  dwarf: svg(`
    <circle cx="32" cy="14" r="10" stroke="currentColor" ${sw4}/>
    <line x1="20" y1="22" x2="44" y2="22" stroke="currentColor" ${sw3} opacity="0.7"/>
    <line x1="32" y1="24" x2="32" y2="42" stroke="currentColor" ${sw5}/>
    <line x1="32" y1="29" x2="12" y2="38" stroke="currentColor" ${sw5}/>
    <line x1="32" y1="29" x2="52" y2="38" stroke="currentColor" ${sw5}/>
    <line x1="32" y1="42" x2="22" y2="56" stroke="currentColor" ${sw5}/>
    <line x1="32" y1="42" x2="42" y2="56" stroke="currentColor" ${sw5}/>
  `),

  // ─── CREATURES ────────────────────────────────────────────────────────────

  /** Side-profile animal: circle head + ears + oval body + short legs */
  wolf: svg(`
    <ellipse cx="22" cy="36" rx="16" ry="12" fill="currentColor" opacity="0.9"/>
    <circle  cx="44" cy="28" r="12" fill="currentColor"/>
    <polygon points="38,18 42,6 46,18" fill="currentColor"/>
    <polygon points="46,18 50,6 54,18" fill="currentColor"/>
    <circle  cx="48" cy="28" r="2.5" fill="#0d1722"/>
    <line x1="16" y1="46" x2="12" y2="56" stroke="currentColor" ${sw3}/>
    <line x1="22" y1="48" x2="20" y2="56" stroke="currentColor" ${sw3}/>
    <line x1="28" y1="46" x2="26" y2="56" stroke="currentColor" ${sw3}/>
  `),

  /** Diamond body with upward horns and glowing eyes */
  demon: svg(`
    <polygon points="32,10 50,32 32,54 14,32" fill="currentColor" opacity="0.9"/>
    <line x1="24" y1="14" x2="18" y2="4"  stroke="currentColor" ${sw4}/>
    <line x1="40" y1="14" x2="46" y2="4"  stroke="currentColor" ${sw4}/>
    <circle cx="26" cy="30" r="3.5" fill="#0d1722"/>
    <circle cx="38" cy="30" r="3.5" fill="#0d1722"/>
    <circle cx="26" cy="30" r="1.5" fill="currentColor" opacity="0.6"/>
    <circle cx="38" cy="30" r="1.5" fill="currentColor" opacity="0.6"/>
  `),

  // ─── TERRAIN ──────────────────────────────────────────────────────────────

  /** Three fan-shaped grass blades from a base line */
  'terrain-grass': svg(`
    <line x1="32" y1="54" x2="32" y2="28" stroke="currentColor" ${sw4}/>
    <line x1="32" y1="38" x2="18" y2="22" stroke="currentColor" ${sw4}/>
    <line x1="32" y1="36" x2="46" y2="22" stroke="currentColor" ${sw4}/>
    <line x1="12" y1="54" x2="52" y2="54" stroke="currentColor" ${sw4}/>
  `),

  /** Two horizontal wavy lines */
  'terrain-water': svg(`
    <path d="M8 26 C14 20 20 32 26 26 C32 20 38 32 44 26 C50 20 56 28 58 26"
          stroke="currentColor" ${sw4} fill="none"/>
    <path d="M8 40 C14 34 20 46 26 40 C32 34 38 46 44 40 C50 34 56 42 58 40"
          stroke="currentColor" ${sw4} fill="none" opacity="0.6"/>
  `),

  /** Simple pine tree: trunk line + two stacked triangles */
  'terrain-forest': svg(`
    <line x1="32" y1="56" x2="32" y2="36" stroke="currentColor" ${sw4}/>
    <polygon points="32,8 52,36 12,36" fill="currentColor" opacity="0.9"/>
    <polygon points="32,20 48,40 16,40" fill="currentColor"/>
  `),

  /** Two overlapping mountain triangles, snow cap line at peak */
  'terrain-mountain': svg(`
    <polygon points="32,6 56,54 8,54" fill="currentColor" opacity="0.75"/>
    <polygon points="48,22 62,54 34,54" fill="currentColor" opacity="0.55"/>
    <line x1="24" y1="22" x2="40" y2="22" stroke="currentColor" ${sw3} opacity="0.7"/>
  `),

  /** Sand dune half-circle + three speck dots */
  'terrain-sand': svg(`
    <path d="M8 48 Q32 16 56 48 Z" fill="currentColor" opacity="0.8"/>
    <circle cx="24" cy="30" r="3" fill="currentColor" opacity="0.5"/>
    <circle cx="36" cy="24" r="2.5" fill="currentColor" opacity="0.4"/>
    <circle cx="46" cy="32" r="2" fill="currentColor" opacity="0.35"/>
  `),

  // ─── CONTROLS ────────────────────────────────────────────────────────────

  /** Two vertical bars — standard pause symbol */
  pause: svg(`
    <rect x="14" y="12" width="14" height="40" rx="4" fill="currentColor"/>
    <rect x="36" y="12" width="14" height="40" rx="4" fill="currentColor"/>
  `),

  /** Right-pointing chevron pair — fast forward */
  speed: svg(`
    <polyline points="10,14 32,32 10,50" stroke="currentColor" ${sw5} fill="none"/>
    <polyline points="32,14 54,32 32,50" stroke="currentColor" ${sw5} fill="none"/>
  `),

  /** Four corner L-shapes pointing outward */
  fullscreen: svg(`
    <polyline points="8,22  8,8  22,8"  stroke="currentColor" ${sw4} fill="none"/>
    <polyline points="42,8  56,8  56,22" stroke="currentColor" ${sw4} fill="none"/>
    <polyline points="56,42 56,56 42,56" stroke="currentColor" ${sw4} fill="none"/>
    <polyline points="22,56 8,56  8,42"  stroke="currentColor" ${sw4} fill="none"/>
  `),

  // ─── CATEGORY TAB ICONS ───────────────────────────────────────────────────

  /** Explosion burst — for Zerstörung tab */
  'cat-destruction': svg(`
    <circle cx="32" cy="32" r="10" fill="currentColor"/>
    <line x1="32" y1="6"  x2="32" y2="16" stroke="currentColor" ${sw4}/>
    <line x1="32" y1="48" x2="32" y2="58" stroke="currentColor" ${sw4}/>
    <line x1="6"  y1="32" x2="16" y2="32" stroke="currentColor" ${sw4}/>
    <line x1="48" y1="32" x2="58" y2="32" stroke="currentColor" ${sw4}/>
    <line x1="14" y1="14" x2="21" y2="21" stroke="currentColor" ${sw4}/>
    <line x1="43" y1="43" x2="50" y2="50" stroke="currentColor" ${sw4}/>
    <line x1="50" y1="14" x2="43" y2="21" stroke="currentColor" ${sw4}/>
    <line x1="21" y1="43" x2="14" y2="50" stroke="currentColor" ${sw4}/>
  `),

  /** Leaf — for Natur tab */
  'cat-nature': svg(`
    <path d="M32 56 C32 56 8 40 10 20 C10 8 24 6 32 14 C40 6 54 8 54 20 C56 40 32 56 32 56 Z"
          fill="currentColor" opacity="0.85"/>
    <line x1="32" y1="56" x2="32" y2="20" stroke="currentColor" ${sw3} opacity="0.4"/>
  `),

  /** Three small houses — for Völker tab */
  'cat-civilizations': svg(`
    <polygon points="14,38 14,26 24,18 34,26 34,38" fill="currentColor" opacity="0.9"/>
    <rect x="18" y="32" width="6" height="6" fill="#0d1722" opacity="0.5"/>
    <polygon points="30,38 30,28 40,20 50,28 50,38" fill="currentColor" opacity="0.7"/>
    <rect x="34" y="32" width="6" height="6" fill="#0d1722" opacity="0.4"/>
    <line x1="6" y1="38" x2="58" y2="38" stroke="currentColor" ${sw3} opacity="0.4"/>
  `),

  /** Paw print — for Kreaturen tab */
  'cat-creatures': svg(`
    <ellipse cx="32" cy="40" rx="12" ry="9" fill="currentColor"/>
    <circle cx="20" cy="28" r="5" fill="currentColor" opacity="0.8"/>
    <circle cx="32" cy="24" r="5" fill="currentColor" opacity="0.8"/>
    <circle cx="44" cy="28" r="5" fill="currentColor" opacity="0.8"/>
    <circle cx="14" cy="38" r="4" fill="currentColor" opacity="0.7"/>
    <circle cx="50" cy="38" r="4" fill="currentColor" opacity="0.7"/>
  `),

  /** Layered terrain profile — for Terrain tab */
  'cat-terrain': svg(`
    <polygon points="8,52 22,28 36,40 50,18 56,52" fill="currentColor" opacity="0.7"/>
    <line x1="6" y1="52" x2="58" y2="52" stroke="currentColor" ${sw4} opacity="0.5"/>
  `),

  /** Three dots (ellipsis) — for Mehr tab */
  'cat-more': svg(`
    <circle cx="16" cy="32" r="6" fill="currentColor"/>
    <circle cx="32" cy="32" r="6" fill="currentColor"/>
    <circle cx="48" cy="32" r="6" fill="currentColor"/>
  `),
};

/** Returns SVG string for a tool key, empty string if not found. */
export function getToolIcon(key: string): string {
  return (TOOL_ICONS as Record<string, string>)[key] ?? '';
}
