/** Lays environment layers over each other from left to right and drops keys without a value. */
export function definedEnv(
  ...layers: readonly Readonly<Record<string, string | undefined>>[]
): Record<string, string> {
  const env: Record<string, string> = {};
  for (const layer of layers) {
    for (const [key, value] of Object.entries(layer)) {
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
  }
  return env;
}
