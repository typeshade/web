export const WIDTH = 166;
export const curve = (x: number, y: number, a: number, b: number) =>
  `M${x} ${y} C${x + 65} ${y},${a - 65} ${b},${a} ${b}`;
