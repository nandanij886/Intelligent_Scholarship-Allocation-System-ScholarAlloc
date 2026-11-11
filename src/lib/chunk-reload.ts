// A route chunk can 404 when the app is rebuilt while an older copy of the page is
// still open: the browser asks for a module name that no longer exists, the dynamic
// import rejects, and the screen blanks. That state is recoverable — loading the
// document once more pulls the current chunk names.

const CHUNK_ERROR_RE =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Loading chunk \S+ failed/i;

const RELOAD_KEY = "scholaralloc:chunk-reload-at";
const COOLDOWN_MS = 10_000;

export function isChunkLoadError(error: unknown): boolean {
  if (error instanceof Error) return CHUNK_ERROR_RE.test(`${error.name} ${error.message}`);
  if (typeof error === "string") return CHUNK_ERROR_RE.test(error);
  return false;
}

// True at most once per COOLDOWN_MS, so a chunk that is genuinely gone can never
// put the page into a reload loop.
export function shouldReloadForChunkError(error: unknown, now = Date.now()): boolean {
  if (!isChunkLoadError(error)) return false;
  const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
  if (now - last < COOLDOWN_MS) return false;
  sessionStorage.setItem(RELOAD_KEY, String(now));
  return true;
}
