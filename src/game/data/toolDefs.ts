/**
 * toolDefs.ts — Phase 9
 *
 * Metadata for each god tool: key, icon, label.
 * Implemented in Phase 9.
 */

// Preview stub — used by UIScene Phase 1 tool dock
export interface ToolDef {
  key: string;
  icon: string;
  label: string;
}

export const TOOL_DEFS: ToolDef[] = [
  { key: 'inspect',   icon: 'ⓘ',  label: 'Inspect'   },
  { key: 'human',     icon: '＋',  label: 'Human'     },
  { key: 'orc',       icon: '＋',  label: 'Orc'       },
  { key: 'lightning', icon: 'ϟ',   label: 'Lightning' },
  { key: 'fire',      icon: '🔥',  label: 'Fire'      },
  { key: 'rain',      icon: '☔',  label: 'Rain'      },
  { key: 'meteor',    icon: '●',   label: 'Meteor'    },
  { key: 'heal',      icon: '✚',   label: 'Heal'      },
];
