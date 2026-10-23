export class PageRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PageRangeError";
  }
}

const PART = /^(\d+)?\s*(-)?\s*(\d+)?$/;

export function parseRanges(input: string, pageCount: number): number[][] {
  const parts = input
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    throw new PageRangeError("Enter at least one page or range, like 1-3, 5.");
  }

  return parts.map((part) => {
    const match = PART.exec(part.toLowerCase().replace(/end|last/g, String(pageCount)));
    if (!match || (!match[1] && !match[3])) {
      throw new PageRangeError(`"${part}" is not a page or range.`);
    }

    const [, startText, dash, endText] = match;
    const start = startText ? Number(startText) : 1;
    const end = dash ? (endText ? Number(endText) : pageCount) : start;

    for (const page of [start, end]) {
      if (page < 1 || page > pageCount) {
        throw new PageRangeError(
          `Page ${page} in "${part}" is out of range. This file has ${pageCount} page${pageCount === 1 ? "" : "s"}.`,
        );
      }
    }

    const step = start <= end ? 1 : -1;
    const pages: number[] = [];
    for (let page = start; page !== end + step; page += step) {
      pages.push(page - 1);
    }
    return pages;
  });
}

export function chunk(pageCount: number, size: number): number[][] {
  if (!Number.isInteger(size) || size < 1) {
    throw new PageRangeError("Pages per file must be a whole number of at least 1.");
  }
  const groups: number[][] = [];
  for (let start = 0; start < pageCount; start += size) {
    const group: number[] = [];
    for (let page = start; page < Math.min(start + size, pageCount); page++) {
      group.push(page);
    }
    groups.push(group);
  }
  return groups;
}

export function describeGroup(group: number[]): string {
  if (group.length === 0) return "";
  const first = group[0] + 1;
  const last = group[group.length - 1] + 1;
  return group.length === 1 ? `p${first}` : `p${first}-${last}`;
}
