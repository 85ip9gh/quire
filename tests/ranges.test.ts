import { describe, expect, it } from "vitest";
import { PageRangeError, chunk, describeGroup, parseRanges } from "../src/lib/ranges";

describe("parseRanges", () => {
  it("turns one-based ranges into zero-based groups", () => {
    expect(parseRanges("1-3, 5", 10)).toEqual([[0, 1, 2], [4]]);
  });

  it("reads open ends and the words end and last", () => {
    expect(parseRanges("8-", 10)).toEqual([[7, 8, 9]]);
    expect(parseRanges("-2", 10)).toEqual([[0, 1]]);
    expect(parseRanges("9-end", 10)).toEqual([[8, 9]]);
    expect(parseRanges("last", 10)).toEqual([[9]]);
  });

  it("keeps descending ranges in the order written", () => {
    expect(parseRanges("4-2", 5)).toEqual([[3, 2, 1]]);
  });

  it("tolerates spacing and empty parts", () => {
    expect(parseRanges(" 1 - 2 ,, 4 ", 4)).toEqual([[0, 1], [3]]);
  });

  it("rejects pages outside the document", () => {
    expect(() => parseRanges("0", 3)).toThrow(PageRangeError);
    expect(() => parseRanges("2-4", 3)).toThrow(/out of range\. This file has 3 pages/);
  });

  it("rejects text that is not a range", () => {
    expect(() => parseRanges("", 3)).toThrow(PageRangeError);
    expect(() => parseRanges("-", 3)).toThrow(/is not a page or range/);
    expect(() => parseRanges("1-2-3", 3)).toThrow(PageRangeError);
    expect(() => parseRanges("a", 3)).toThrow(PageRangeError);
  });
});

describe("chunk", () => {
  it("splits into fixed-size groups with a short final group", () => {
    expect(chunk(5, 2)).toEqual([[0, 1], [2, 3], [4]]);
  });

  it("rejects sizes below one", () => {
    expect(() => chunk(5, 0)).toThrow(PageRangeError);
    expect(() => chunk(5, 1.5)).toThrow(PageRangeError);
  });
});

describe("describeGroup", () => {
  it("names a group by its first and last page", () => {
    expect(describeGroup([0])).toBe("p1");
    expect(describeGroup([2, 3, 4])).toBe("p3-5");
  });
});
