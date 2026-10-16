import type { Venue } from "./types";

export type Block = {
  id: string;
  label: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
};

// Облегчённые силуэты площадок для обзора: пропорции из габаритов manifest,
// без загрузки GLB. Самая широкая площадка занимает 5 единиц сцены.
export const venueBlocks = (v: Venue[]): Block[] => {
  const size = (x: Venue) =>
    x.asset
      ? x.asset.bounds_max.map((max, i) => max - x.asset!.bounds_min[i])
      : null;
  const widest = Math.max(1, ...v.map((x) => size(x)?.[0] ?? 0));
  return v.map((x, i) => {
    const s = size(x);
    const k = 5 / widest;
    return {
      id: x.slug,
      label: x.name,
      x: (i - (v.length - 1) / 2) * 7,
      z: 0,
      w: s ? Math.max(2.4, s[0] * k) : 4,
      d: s ? Math.max(1.6, s[2] * k) : 4,
      h: s ? Math.max(0.9, s[1] * k * 1.6) : 2 + (i % 3),
    };
  });
};
