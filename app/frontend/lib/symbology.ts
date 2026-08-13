import type { Entity } from '@/lib/types'
import { GROUND, KINDS, TRACK_COLORS } from '@/lib/palette'

const BOX = 28
const SCALE = 2

type Kind = Entity['kind']

// Every shape is drawn pointing north in a BOX×BOX box so the map can rotate it
// to the contact's heading.
const paths: Record<Kind, (ctx: CanvasRenderingContext2D, c: number) => void> = {
  ship: (ctx, c) => {
    ctx.moveTo(c, c - 9.5)
    ctx.quadraticCurveTo(c + 4.5, c - 2, c + 4, c + 5)
    ctx.lineTo(c + 3.2, c + 8.5)
    ctx.lineTo(c - 3.2, c + 8.5)
    ctx.lineTo(c - 4, c + 5)
    ctx.quadraticCurveTo(c - 4.5, c - 2, c, c - 9.5)
  },
  aircraft: (ctx, c) => {
    ctx.moveTo(c, c - 9.5)
    ctx.lineTo(c + 7.5, c + 7.5)
    ctx.lineTo(c, c + 3.5)
    ctx.lineTo(c - 7.5, c + 7.5)
    ctx.closePath()
  },
  vehicle: (ctx, c) => {
    ctx.moveTo(c, c - 8)
    ctx.lineTo(c + 5.5, c - 3)
    ctx.lineTo(c + 5.5, c + 7)
    ctx.lineTo(c - 5.5, c + 7)
    ctx.lineTo(c - 5.5, c - 3)
    ctx.closePath()
  },
  marker: (ctx, c) => {
    ctx.arc(c, c, 5.5, 0, Math.PI * 2)
  },
}

const drawReticleTicks = (ctx: CanvasRenderingContext2D, c: number) => {
  for (let i = 0; i < 4; i += 1) {
    const angle = (i * Math.PI) / 2
    ctx.moveTo(c + Math.cos(angle) * 7.5, c + Math.sin(angle) * 7.5)
    ctx.lineTo(c + Math.cos(angle) * 10.5, c + Math.sin(angle) * 10.5)
  }
}

const symbolImage = (kind: Kind, active: boolean): ImageData => {
  const canvas = document.createElement('canvas')
  canvas.width = BOX * SCALE
  canvas.height = BOX * SCALE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.scale(SCALE, SCALE)

  const c = BOX / 2
  const color = TRACK_COLORS[kind]
  const hollow = !active || kind === 'marker'

  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  ctx.beginPath()
  paths[kind](ctx, c)
  if (kind === 'marker') drawReticleTicks(ctx, c)

  // A dark casing keeps the symbol readable over bright basemap features.
  ctx.strokeStyle = GROUND
  ctx.lineWidth = hollow ? 3.4 : 3
  ctx.globalAlpha = 0.85
  ctx.stroke()
  ctx.globalAlpha = 1

  if (hollow) {
    ctx.fillStyle = color
    ctx.globalAlpha = 0.16
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.stroke()
  } else {
    ctx.fillStyle = color
    ctx.fill()
  }

  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

export const symbolId = (kind: Kind, status: Entity['status']): string =>
  `sym-${kind}-${status}`

export const registerSymbols = (
  add: (id: string, image: ImageData, options: { pixelRatio: number }) => void,
) => {
  KINDS.forEach((kind) => {
    add(symbolId(kind, 'active'), symbolImage(kind, true), { pixelRatio: SCALE })
    add(symbolId(kind, 'inactive'), symbolImage(kind, false), { pixelRatio: SCALE })
  })
}
