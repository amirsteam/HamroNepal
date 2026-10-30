/**
 * Place-name matching (no AI): finds which province/district/municipality
 * a news item mentions, using each location category's `aliases`.
 *
 * Nepali attaches postpositions directly to nouns ("काभ्रेमा", "काभ्रेको"),
 * so a match may be followed by one of a short list of suffixes, but not by
 * arbitrary letters ("गोरखापत्र" is a newspaper, not Gorkha).
 */

export interface LocationEntry {
  id: string;
  slug: string;
  name: string;
  level: "province" | "district" | "municipality" | null;
  parentId: string | null;
  aliases: string[];
}

export interface LocationMatch {
  id: string;
  slug: string;
  name: string;
  level: LocationEntry["level"];
  /** Position of the first mention (lower = earlier, e.g. a dateline). */
  position: number;
  count: number;
}

const SUFFIXES = [
  "मा", "को", "का", "की", "ले", "लाई", "बाट", "देखि", "सम्म", "स्थित", "वासी", "तिर",
  "भित्र", "मै", "कै", "माथि", "नजिक", "जिल्ला", "जिल्लाको", "जिल्लामा", "नगरपालिका",
  "नगरपालिकाको", "नगरपालिकामा", "गाउँपालिका", "बजार", "बजारमा",
];
const SUFFIX_RE = SUFFIXES.sort((a, b) => b.length - a.length).join("|");
const DEVANAGARI = /[ऀ-ॿ]/;

function escape(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface CompiledAlias {
  entry: LocationEntry;
  re: RegExp;
}

export class Gazetteer {
  private aliases: CompiledAlias[] = [];
  private byId = new Map<string, LocationEntry>();

  constructor(entries: LocationEntry[]) {
    for (const entry of entries) {
      this.byId.set(entry.id, entry);
      const names = new Set([entry.name, ...entry.aliases].map((a) => a.normalize("NFC").trim()).filter(Boolean));
      for (const alias of names) {
        const body = escape(alias);
        // Devanagari: no letter before; after, end / non-letter / allowed suffix.
        // Latin: plain word boundaries, case-insensitive.
        const re = DEVANAGARI.test(alias)
          ? new RegExp(`(?<![\\u0900-\\u097F])${body}(?:${SUFFIX_RE})?(?![\\u0900-\\u097F])`, "g")
          : new RegExp(`\\b${body}\\b`, "gi");
        this.aliases.push({ entry, re });
      }
    }
    // Longer aliases first, so "काभ्रेपलाञ्चोक" wins over "काभ्रे".
    this.aliases.sort((a, b) => b.re.source.length - a.re.source.length);
  }

  get size() {
    return this.byId.size;
  }

  get(id: string) {
    return this.byId.get(id);
  }

  /** All locations mentioned in the text, most specific & earliest first. */
  match(text: string): LocationMatch[] {
    const normalized = text.normalize("NFC");
    const found = new Map<string, LocationMatch>();
    for (const { entry, re } of this.aliases) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(normalized))) {
        const existing = found.get(entry.id);
        if (existing) {
          existing.count++;
          existing.position = Math.min(existing.position, m.index);
        } else {
          found.set(entry.id, {
            id: entry.id,
            slug: entry.slug,
            name: entry.name,
            level: entry.level,
            position: m.index,
            count: 1,
          });
        }
      }
    }
    const rank = { municipality: 0, district: 1, province: 2 } as const;
    return [...found.values()].sort(
      (a, b) =>
        (rank[a.level ?? "province"] ?? 3) - (rank[b.level ?? "province"] ?? 3) ||
        a.position - b.position ||
        b.count - a.count
    );
  }

  /** The location plus its parents (municipality → district → province). */
  withAncestors(id: string): string[] {
    const ids: string[] = [];
    let current = this.byId.get(id);
    for (let depth = 0; current && depth < 4; depth++) {
      ids.push(current.id);
      current = current.parentId ? this.byId.get(current.parentId) : undefined;
    }
    return ids;
  }
}
