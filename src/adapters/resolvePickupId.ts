type PickupLookupRow = {
  readonly id: number;
  readonly roomId: number;
  readonly x: number;
  readonly y: number;
  readonly active: boolean;
};

/** Resolve an active pickup on a board cell for collect_pickup. */
export function resolvePickupIdAt(
  pickups: readonly PickupLookupRow[],
  roomId: number,
  x: number,
  y: number,
): number | null {
  return (
    pickups.find(
      pickup => pickup.roomId === roomId && pickup.active && pickup.x === x && pickup.y === y,
    )?.id ?? null
  );
}
