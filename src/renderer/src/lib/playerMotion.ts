export type CoverRect = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>

export function coverStartTransform(source: CoverRect | null, destination: CoverRect): string {
  if (!source || !source.width || !source.height || !destination.width || !destination.height) {
    return 'translate3d(0px, 24px, 0) scale(0.92, 0.92)'
  }

  const sourceCenterX = source.left + source.width / 2
  const sourceCenterY = source.top + source.height / 2
  const destinationCenterX = destination.left + destination.width / 2
  const destinationCenterY = destination.top + destination.height / 2
  const px = (value: number) => `${Math.round(value * 100) / 100}px`
  const scale = (value: number) => Math.round(value * 10000) / 10000

  return `translate3d(${px(sourceCenterX - destinationCenterX)}, ${px(sourceCenterY - destinationCenterY)}, 0) scale(${scale(source.width / destination.width)}, ${scale(source.height / destination.height)})`
}
