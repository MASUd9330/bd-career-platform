import { SourceAdapter } from "./base";
import { bangladeshBankAdapter } from "./bangladesh-bank";

/**
 * Add every new adapter here. The `adapterKey` must match the
 * `sources.adapter_key` column in the database so the crawler knows
 * which adapter to run for each configured source row.
 */
export const adapterRegistry: Record<string, SourceAdapter> = {
  "bangladesh-bank": bangladeshBankAdapter,
  // "bpsc": bpscAdapter,
  // "du": duAdapter,
  // "railway": railwayAdapter,
};

export function getAdapter(key: string): SourceAdapter {
  const adapter = adapterRegistry[key];
  if (!adapter) {
    throw new Error(`No collector adapter registered for key: ${key}`);
  }
  return adapter;
}
