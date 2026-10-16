import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Vector3 } from "three";
import type { Vec3 } from "./types";

// Markers and labels are plain DOM over the canvas, positioned by projecting 3D anchors.
// drei <Html> creates a React root per element; under React 19 a fast first render left
// the first root empty (venue marker 1 and the MART overview label disappeared).

export type Anchor = { id: string; position: Vec3 };
export type ScreenPoint = { x: number; y: number; visible: boolean };
export type ScreenPoints = Record<string, ScreenPoint>;

export function Projector({
  anchors,
  onChange,
}: {
  anchors: Anchor[];
  onChange: (points: ScreenPoints) => void;
}) {
  const { camera, size } = useThree();
  const last = useRef<ScreenPoints>({});
  const v = useMemo(() => new Vector3(), []);
  // Runs on every rendered frame; with frameloop="demand" that is only after camera changes.
  useFrame(() => {
    const next: ScreenPoints = {};
    let changed = Object.keys(last.current).length !== anchors.length;
    for (const anchor of anchors) {
      v.set(...anchor.position).project(camera);
      const point = {
        x: ((v.x + 1) / 2) * size.width,
        y: ((1 - v.y) / 2) * size.height,
        visible: v.z > -1 && v.z < 1,
      };
      const prev = last.current[anchor.id];
      if (
        !prev ||
        prev.visible !== point.visible ||
        Math.abs(prev.x - point.x) > 0.5 ||
        Math.abs(prev.y - point.y) > 0.5
      )
        changed = true;
      next[anchor.id] = point;
    }
    if (changed) {
      last.current = next;
      onChange(next);
    }
  });
  return null;
}
