export class AntiSpam {
  #entries = new Map();

  constructor({ limit = 7, windowMs = 10_000, maxEntries = 2_000 } = {}) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.maxEntries = maxEntries;
  }

  check(key, now = Date.now()) {
    const recent = (this.#entries.get(key) ?? []).filter((timestamp) => now - timestamp < this.windowMs);
    recent.push(now);
    this.#entries.delete(key);
    this.#entries.set(key, recent);

    if (this.#entries.size > this.maxEntries) {
      this.#entries.delete(this.#entries.keys().next().value);
    }

    return { allowed: recent.length <= this.limit, count: recent.length };
  }

  clear() {
    this.#entries.clear();
  }
}