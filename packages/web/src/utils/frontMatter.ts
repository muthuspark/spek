export interface FrontMatterField {
  key: string;
  value: string;
}

export interface SplitFrontMatter {
  fields: FrontMatterField[];
  body: string;
}

// A leading `---` block. Left in the markdown, its closing `---` turns the line above it into a
// setext h2, so `author: …` rendered as a section heading.
const FRONT_MATTER_RE = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

/**
 * Split YAML front matter off a markdown document.
 *
 * Only flat `key: value` lines become fields — that is all the metadata row shows. Nested or
 * multi-line YAML is skipped rather than parsed, so no YAML dependency is needed.
 */
export function splitFrontMatter(content: string): SplitFrontMatter {
  const match = content.match(FRONT_MATTER_RE);
  if (!match) return { fields: [], body: content };

  const fields: FrontMatterField[] = [];
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.+?)\s*$/);
    if (!field) continue;
    const value = field[2].replace(/^(["'])(.*)\1$/, "$2");
    if (value) fields.push({ key: field[1], value });
  }
  return { fields, body: content.slice(match[0].length) };
}
