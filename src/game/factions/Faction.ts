/**
 * Faction — Phase 18
 *
 * Unveränderliche Identitäts- und Farbdaten einer Fraktion.
 * Kein Phaser, kein Rendering.
 */

export type FactionKey = 'human' | 'orc' | 'elf' | 'dwarf';

export interface Faction {
  readonly key:          FactionKey;
  readonly name:         string;
  readonly short:        string;
  /** Primärfarbe als Hex-Zahl (Phaser-kompatibel). */
  readonly color:        number;
  /** Dunklere Variante für Schatten / Ränder. */
  readonly dark:         number;
  /** Farbe für Gebäude-Dächer / Highlights. */
  readonly villageColor: number;
}

export const FACTIONS: Readonly<Record<FactionKey, Faction>> = {
  human: {
    key:          'human',
    name:         'Menschen',
    short:        'HUM',
    color:        0x5ec8ff,
    dark:         0x126ca8,
    villageColor: 0x2e9de0,
  },
  orc: {
    key:          'orc',
    name:         'Orks',
    short:        'ORC',
    color:        0xff5d63,
    dark:         0xa22b31,
    villageColor: 0xd34245,
  },
  elf: {
    key:          'elf',
    name:         'Elfen',
    short:        'ELF',
    color:        0x6dff8a,
    dark:         0x1a8a36,
    villageColor: 0x3dcc60,
  },
  dwarf: {
    key:          'dwarf',
    name:         'Zwerge',
    short:        'DWF',
    color:        0xd4a04a,
    dark:         0x7a5018,
    villageColor: 0xb07c28,
  },
};

export const FACTION_KEYS: FactionKey[] = ['human', 'orc', 'elf', 'dwarf'];
