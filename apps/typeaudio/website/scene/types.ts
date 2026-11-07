import type { ListenerPose } from "typeaudio/spatial";
import type { RoomDefinition } from "typeaudio/spatial/room";

export interface PositionPoint {
  time: number;
  x: number;
  y: number;
  z: number;
}
export interface CueSpace {
  points: PositionPoint[];
  spread: number;
  send: number;
}
export interface SceneSpace {
  room: RoomDefinition;
  listener: ListenerPose;
  gainDb: number;
  highpassHz: number;
}
export interface ProjectOrigin {
  id: string;
  revision: string;
  author: string;
  notes: string;
}
export interface StereoScene {
  left: Float32Array;
  right: Float32Array;
  peak: number;
}
