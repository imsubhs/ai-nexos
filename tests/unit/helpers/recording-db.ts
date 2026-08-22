/**
 * A recording stand-in for the Drizzle client.
 *
 * Used by the cross-tenant regression tests. It does not execute SQL — it
 * records the *predicates* the code under test builds, which is the property
 * those tests are about: a lookup that binds the session's `organizationId`
 * cannot match another tenant's row, and one that does not bind it can.
 *
 * Executing the query would be a better test, and that is what
 * `tests/integration/` is for. This exists because the integration suite runs
 * against the live Supabase project and is not part of `npm test`.
 */

/** Walks a Drizzle SQL/condition object and collects its string parameters. */
export function extractParams(node: unknown, depth = 0): string[] {
  const found: string[] = [];
  if (!node || depth > 10) return found;
  if (Array.isArray(node)) {
    for (const item of node) found.push(...extractParams(item, depth + 1));
    return found;
  }
  if (typeof node === "object") {
    const record = node as Record<string, unknown>;
    if ("value" in record && typeof record.value === "string") {
      found.push(record.value);
    }
    for (const key of Object.keys(record)) {
      found.push(...extractParams(record[key], depth + 1));
    }
  }
  return found;
}

export type Recorder = {
  /** Parameters bound by each predicate, in the order they were built. */
  readonly predicates: string[][];
  /** Rows passed to `.values()`. */
  readonly inserted: Record<string, unknown>[];
  /** Every parameter bound anywhere during the call. */
  all(): string[];
  reset(): void;
};

export function createRecorder(): Recorder {
  const predicates: string[][] = [];
  const inserted: Record<string, unknown>[] = [];
  return {
    predicates,
    inserted,
    all: () => predicates.flat(),
    reset: () => {
      predicates.length = 0;
      inserted.length = 0;
    },
  };
}

type QueueEntry = unknown;

/**
 * Builds the fake client.
 *
 * `queue` supplies the result of each terminal in call order; anything not
 * supplied resolves to `[]` (or `undefined` for `findFirst`). Tests therefore
 * only describe the rows that matter to the branch they are exercising.
 */
export function createRecordingDb(
  recorder: Recorder,
  options: {
    queue?: QueueEntry[];
    findFirst?: QueueEntry[];
  } = {},
) {
  const queue = [...(options.queue ?? [])];
  const findFirstQueue = [...(options.findFirst ?? [])];

  const nextResult = () => (queue.length > 0 ? queue.shift() : []);
  const nextFindFirst = () =>
    findFirstQueue.length > 0 ? findFirstQueue.shift() : undefined;

  function record(condition: unknown) {
    recorder.predicates.push(extractParams(condition));
  }

  function makeChain(): Record<string, unknown> {
    const chain: Record<string, unknown> = {};
    const self = () => chain;

    chain.select = self;
    chain.from = self;
    chain.innerJoin = self;
    chain.leftJoin = self;
    chain.update = self;
    chain.insert = self;
    chain.delete = self;
    chain.set = self;
    chain.orderBy = self;
    chain.limit = self;
    chain.offset = self;
    chain.returning = self;

    chain.values = (value: Record<string, unknown>) => {
      recorder.inserted.push(value);
      return chain;
    };
    chain.where = (condition: unknown) => {
      record(condition);
      return chain;
    };
    chain.then = (resolve: (value: unknown) => unknown) =>
      resolve(nextResult());

    return chain;
  }

  /**
   * `db.query.<table>.findFirst/findMany`. The `where` may be a condition
   * object or a `(table, operators) => condition` callback; only the former can
   * be inspected, and the callback form is invoked so the branch still runs.
   */
  const queryProxy = new Proxy(
    {},
    {
      get() {
        return {
          findFirst: async (args?: { where?: unknown }) => {
            if (args?.where && typeof args.where !== "function") {
              record(args.where);
            }
            return nextFindFirst();
          },
          findMany: async (args?: { where?: unknown }) => {
            if (args?.where && typeof args.where !== "function") {
              record(args.where);
            }
            const result = nextResult();
            return Array.isArray(result) ? result : [];
          },
        };
      },
    },
  );

  const base: Record<string, unknown> = {
    query: queryProxy,
    transaction: async (callback: (tx: unknown) => unknown) =>
      callback(dbProxy),
  };

  const dbProxy = new Proxy(base, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      const chain = makeChain();
      return chain[prop];
    },
  });

  return dbProxy;
}
