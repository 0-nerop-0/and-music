export interface WallpaperPalette {
  panel: string
  edge: string
}

const DEFAULT_PALETTE: WallpaperPalette = {
  panel: 'rgba(20, 18, 28, 0.88)',
  edge: 'rgb(28, 25, 38)',
}

/** Keep panels dark enough for the app's white text, while borrowing the image hue. */
export function wallpaperPalette(pixels: Uint8ClampedArray): WallpaperPalette {
  let red = 0
  let green = 0
  let blue = 0
  let weight = 0

  for (let i = 0; i + 3 < pixels.length; i += 4) {
    const alpha = pixels[i + 3] / 255
    red += pixels[i] * alpha
    green += pixels[i + 1] * alpha
    blue += pixels[i + 2] * alpha
    weight += alpha
  }

  if (weight === 0) return DEFAULT_PALETTE

  const average = [red / weight, green / weight, blue / weight]
  const panel = average.map((value) => Math.round(20 + value * 0.2))
  const edge = average.map((value) => Math.round(28 + value * 0.28))

  return {
    panel: `rgba(${panel[0]}, ${panel[1]}, ${panel[2]}, 0.88)`,
    edge: `rgb(${edge[0]}, ${edge[1]}, ${edge[2]})`,
  }
}

export function sampleWallpaper(image: HTMLImageElement): WallpaperPalette {
  const canvas = document.createElement('canvas')
  canvas.width = 24
  canvas.height = 24
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return DEFAULT_PALETTE

  try {
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return wallpaperPalette(context.getImageData(0, 0, canvas.width, canvas.height).data)
  } catch {
    // A legacy external URL may not permit canvas reads.
    return DEFAULT_PALETTE
  }
}
