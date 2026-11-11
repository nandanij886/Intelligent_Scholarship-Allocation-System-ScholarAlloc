import { afterEach, describe, expect, it } from "vitest";

import { isChunkLoadError, shouldReloadForChunkError } from "@/lib/chunk-reload";

// The exact failure the preview reported when a rebuilt app left an old page open.
const CHUNK_FAILURE = new TypeError(
  "Failed to fetch dynamically imported module: https://x.lovableproject.com/@oj-start/compare-CkU2SDOx.js",
);

describe("stale route chunk recovery", () => {
  afterEach(() => sessionStorage.clear());

  it("recognises a route chunk that no longer resolves", () => {
    expect(isChunkLoadError(CHUNK_FAILURE)).toBe(true);
  });

  it("leaves unrelated errors alone", () => {
    expect(isChunkLoadError(new Error("Cannot read properties of undefined"))).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });

  it("reloads once, then waits out the cooldown so a real 404 cannot loop", () => {
    const t0 = 1_000_000;
    expect(shouldReloadForChunkError(CHUNK_FAILURE, t0)).toBe(true);
    expect(shouldReloadForChunkError(CHUNK_FAILURE, t0 + 1_000)).toBe(false);
    expect(shouldReloadForChunkError(CHUNK_FAILURE, t0 + 11_000)).toBe(true);
  });
});
