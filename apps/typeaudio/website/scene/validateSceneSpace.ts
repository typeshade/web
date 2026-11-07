import { prepareRoom, prepareRoomSource } from "typeaudio/spatial/room";
import type { CueSpace, SceneSpace } from "./types.ts";

function number(
  value: unknown,
  min: number,
  max: number,
  name: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new Error(`${name} must be between ${min} and ${max}.`);
  return value;
}

export function validateSceneSpace(value: unknown): SceneSpace {
  if (!value || typeof value !== "object")
    throw new Error("Invalid scene space.");
  const s = value as SceneSpace,
    prepared = prepareRoom(s.room, 48000);
  prepareRoomSource(prepared, s.listener, { position: s.listener?.position });
  return {
    room: {
      min: { ...prepared.min },
      max: { ...prepared.max },
      walls: structuredClone(prepared.walls),
      earlyGain: prepared.earlyGain,
      lateGain: prepared.lateGain,
      decaySeconds: prepared.decaySeconds,
    },
    listener: structuredClone(s.listener),
    gainDb: number(s.gainDb, -60, 24, "Master trim"),
    highpassHz: number(s.highpassHz, 0, 500, "Highpass frequency"),
  };
}

export function validateCueSpace(value: unknown, space?: SceneSpace): CueSpace {
  if (!space || !value || typeof value !== "object")
    throw new Error("Source positions require a scene space.");
  const c = value as CueSpace;
  if (!Array.isArray(c.points) || !c.points.length || c.points.length > 16)
    throw new Error("A source trajectory needs 1–16 points.");
  const room = prepareRoom(space.room, 48000);
  const points = c.points.map((point, i) => {
    if (!point || typeof point !== "object")
      throw new Error("Invalid position point.");
    const time = number(point.time, 0, 60, "Trajectory time");
    if ((i === 0 && time !== 0) || (i > 0 && time <= c.points[i - 1].time))
      throw new Error(
        "Trajectory points must start at zero and increase in time.",
      );
    prepareRoomSource(room, space.listener, { position: point });
    return { time, x: point.x, y: point.y, z: point.z };
  });
  return {
    points,
    spread: number(c.spread, 0, 1, "Source spread"),
    send: number(c.send, 0, 1, "Room send"),
  };
}
