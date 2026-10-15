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

// Облегчённые силуэты трёх площадок (обзор)
export const venueBlocks = (v: Venue[]): Block[] =>
  v.map((x, i) => ({
    id: x.slug,
    label: x.name,
    x: (i - (v.length - 1) / 2) * 7,
    z: 0,
    w: 4,
    d: 4,
    h: 2 + (i % 3),
  }));

// Точки площадки: координаты hotspot из API, иначе условная сетка
