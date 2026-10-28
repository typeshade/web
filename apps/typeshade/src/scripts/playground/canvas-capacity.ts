/** Every browser caps how large a canvas may be, and they disagree: desktops allow tens of
 *  megapixels, while an iPhone stops around 4096 by 4096. Past the cap the element still
 *  reports the width and height that were set and then draws nothing, so asking it its size
 *  proves nothing. This writes one pixel into the far corner and reads it back, which is the
 *  only answer the browser cannot be wrong about. It runs on the canvas the page already
 *  has, and never on a second one, since a spare 8K canvas is another 236 MB. */
const holdsItsPixels = (
  node: HTMLCanvasElement,
  surface: CanvasRenderingContext2D | null,
): boolean => {
  if (!surface) return false;
  const x = node.width - 1;
  const y = node.height - 1;
  if (x < 0 || y < 0) return false;
  try {
    surface.fillStyle = '#ffffff';
    surface.fillRect(x, y, 1, 1);
    const held = surface.getImageData(x, y, 1, 1).data[3] === 255;
    surface.clearRect(x, y, 1, 1);
    return held;
  } catch {
    return false;
  }
};
export { holdsItsPixels };
