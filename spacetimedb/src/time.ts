/** Normalize SpacetimeDB timestamps to bigint for i64 columns. */
export function timestampMs(ctx: { timestamp: { toMillis(): number | bigint } }): bigint {
  return BigInt(ctx.timestamp.toMillis());
}

/** Normalize u32 grid coordinates from table rows. */
export function gridCoord(value: number | bigint): number {
  return typeof value === 'bigint' ? Number(value) : value;
}
