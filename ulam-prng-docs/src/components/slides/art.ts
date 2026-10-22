import type { RNG } from 'ulam-prng'
import type { Values } from '@/content/distributions'
import { rampAt, type Colours } from '@/components/viz/useColours'
import { square, type Draw, type Size } from './kit'

/**
 * A picture made with one distribution, drawn from the slide's own slider
 * values, so the art moves with the chart beside it.
 */
export type Art = {
  label: string
  /** The seed the slide starts on */
  seed: string
  draw: (ctx: CanvasRenderingContext2D, size: Size, c: Colours, rng: RNG, v: Values) => ReturnType<Draw>
}

const TAU = Math.PI * 2

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TAU)
  ctx.fill()
}

function label(ctx: CanvasRenderingContext2D, c: Colours, text: string, x: number, y: number, align: CanvasTextAlign = 'left') {
  ctx.globalAlpha = 1
  ctx.fillStyle = c.muted
  ctx.font = '11px "JetBrains Mono Variable", monospace'
  ctx.textAlign = align
  ctx.fillText(text, x, y)
}

export const arts: Record<string, Art> = {
  gaussian: {
    label: 'Spray paint: x and y both gaussian',
    seed: 'spray',
    draw: (ctx, size, c, rng, v) => {
      const { s, x, y } = square(size, 12)
      const unit = s / 10
      const cx = x + s / 2
      const cy = y + s / 2
      for (let i = 0; i < 6000; i++) {
        const dx = rng.gaussian({ mean: v.mean, sd: v.sd })
        const dy = rng.gaussian({ sd: v.sd })
        const t = Math.min(1, Math.hypot(dx - v.mean, dy) / (2.5 * v.sd))
        ctx.fillStyle = rampAt(c.ramp, t)
        ctx.globalAlpha = 0.65 - 0.4 * t
        dot(ctx, cx + dx * unit, cy + dy * unit, 1.2 + 1.6 * (1 - t))
      }
      ctx.globalAlpha = 0.6
      ctx.strokeStyle = c.fg
      ctx.beginPath()
      ctx.moveTo(cx + v.mean * unit - 10, cy)
      ctx.lineTo(cx + v.mean * unit + 10, cy)
      ctx.moveTo(cx + v.mean * unit, cy - 10)
      ctx.lineTo(cx + v.mean * unit, cy + 10)
      ctx.stroke()
      ctx.globalAlpha = 1
    },
  },

  'log-normal': {
    label: 'Bubbles: radii log-normal',
    seed: 'bubbles',
    draw: (ctx, size, c, rng, v) => {
      const unit = Math.min(size.width, size.height) / 45
      const bubbles = Array.from({ length: 240 }, () => ({
        at: rng.randomPoint(),
        r: Math.min(Math.min(size.width, size.height) / 3, rng.logNormal({ mu: v.mu, sigma: v.sigma }) * unit),
        t: rng.number(),
      })).sort((a, b) => b.r - a.r)
      for (const b of bubbles) {
        const colour = rampAt(c.ramp, b.t)
        ctx.fillStyle = colour
        ctx.strokeStyle = colour
        ctx.globalAlpha = 0.22
        dot(ctx, b.at[0] * size.width, b.at[1] * size.height, b.r)
        ctx.globalAlpha = 0.85
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    },
  },

  exponential: {
    label: 'Barcode: gaps between events exponential',
    seed: 'barcode',
    draw: (ctx, size, c, rng, v) => {
      const rows = 9
      const pad = 16
      const rowH = (size.height - pad * 2) / rows
      const unit = size.width / 30
      for (let r = 0; r < rows; r++) {
        let x = pad + rng.exponential({ rate: v.rate }) * unit
        let count = 0
        while (x < size.width - pad && count++ < 3000) {
          const gap = rng.exponential({ rate: v.rate }) * unit
          ctx.fillStyle = rampAt(c.ramp, Math.min(1, (gap * v.rate) / (2.5 * unit)))
          ctx.globalAlpha = 0.9
          ctx.fillRect(x, pad + r * rowH + 3, 2.2, rowH - 6)
          x += gap
        }
      }
      ctx.globalAlpha = 1
    },
  },

  laplace: {
    label: 'Hatching: angles laplace, mostly aligned',
    seed: 'hatch',
    draw: (ctx, size, c, rng, v) => {
      const cols = 26
      const cell = (size.width - 20) / cols
      const rows = Math.floor((size.height - 20) / cell)
      const x0 = (size.width - cell * cols) / 2
      const y0 = (size.height - cell * rows) / 2
      ctx.lineCap = 'round'
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const dev = rng.laplace({ mean: v.mean, scale: v.scale }) * 0.16
          const angle = Math.PI / 4 + dev
          const cx = x0 + (i + 0.5) * cell
          const cy = y0 + (j + 0.5) * cell
          const len = cell * 0.46
          ctx.strokeStyle = rampAt(c.ramp, Math.min(1, Math.abs(dev - v.mean * 0.16) / 0.8))
          ctx.lineWidth = Math.max(1.5, cell * 0.12)
          ctx.globalAlpha = 0.9
          ctx.beginPath()
          ctx.moveTo(cx - Math.cos(angle) * len, cy - Math.sin(angle) * len)
          ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len)
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
    },
  },

  cauchy: {
    label: 'Fireworks: both coordinates Cauchy',
    seed: 'fireworks',
    draw: (ctx, size, c, rng, v) => {
      const unit = Math.min(size.width, size.height) / 26
      const cx = size.width / 2
      const cy = size.height / 2
      for (let i = 0; i < 900; i++) {
        const dx = rng.cauchy({ median: v.median, scale: v.scale })
        const dy = rng.cauchy({ scale: v.scale })
        const t = Math.min(1, Math.hypot(dx, dy) / 12)
        const colour = rampAt(c.ramp, t)
        ctx.strokeStyle = colour
        ctx.globalAlpha = 0.16
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + dx * unit, cy + dy * unit)
        ctx.stroke()
        ctx.fillStyle = colour
        ctx.globalAlpha = 0.9
        dot(ctx, cx + dx * unit, cy + dy * unit, 1.8)
      }
      ctx.globalAlpha = 1
    },
  },

  pareto: {
    label: 'Skyline: building heights Pareto',
    seed: 'skyline',
    draw: (ctx, size, c, rng, v) => {
      const ground = size.height - 18
      const unit = size.height / 14
      let x = 12
      while (x < size.width - 12) {
        const w = Math.min(size.width - 12 - x, 10 + rng.number() * 26)
        const raw = rng.pareto({ shape: v.shape, scale: v.scale }) * unit
        const h = Math.min(ground - 14, raw)
        ctx.fillStyle = rampAt(c.ramp, Math.min(1, h / (ground * 0.75)))
        ctx.globalAlpha = 0.88
        ctx.fillRect(x, ground - h, w - 2, h)
        // Lit windows
        ctx.fillStyle = c.card
        ctx.globalAlpha = 0.55
        for (let wy = ground - h + 6; wy < ground - 6; wy += 9) {
          for (let wx = x + 3; wx < x + w - 6; wx += 6) if (rng.bernoulli(0.6)) ctx.fillRect(wx, wy, 2, 3)
        }
        if (raw > h) {
          ctx.globalAlpha = 1
          ctx.fillStyle = c.fg
          ctx.fillRect(x, ground - h - 4, w - 2, 2)
        }
        x += w
      }
      ctx.globalAlpha = 0.5
      ctx.fillStyle = c.fg
      ctx.fillRect(0, ground, size.width, 1)
      ctx.globalAlpha = 1
    },
  },

  weibull: {
    label: 'Meadow: blade lengths Weibull',
    seed: 'meadow',
    draw: (ctx, size, c, rng, v) => {
      const ground = size.height - 12
      const unit = size.height / 5.5
      ctx.lineCap = 'round'
      for (let i = 0; i < 460; i++) {
        const bx = rng.number() * size.width
        const len = Math.min(ground - 10, rng.weibull({ shape: v.shape, scale: v.scale }) * unit)
        const sway = rng.gaussian({ sd: 0.25 }) * len
        ctx.strokeStyle = rampAt(c.ramp, Math.min(1, len / (ground * 0.8)))
        ctx.globalAlpha = 0.75
        ctx.lineWidth = 1 + rng.number() * 2
        ctx.beginPath()
        ctx.moveTo(bx, ground)
        ctx.quadraticCurveTo(bx, ground - len * 0.6, bx + sway, ground - len)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    },
  },

  triangular: {
    label: 'Sediment: grains dropped at triangular x',
    seed: 'sediment',
    draw: (ctx, size, c, rng, v) => {
      const span = v.max - v.min || 1
      const lo = v.min - span * 0.12
      const hi = v.max + span * 0.12
      const cols = 110
      const n = 3200
      const heights = new Array<number>(cols).fill(0)
      const grains: [number, number, number][] = []
      for (let i = 0; i < n; i++) {
        const x = rng.triangular({ min: v.min, max: v.max, mode: v.mode })
        const col = Math.max(0, Math.min(cols - 1, Math.floor(((x - lo) / (hi - lo)) * cols)))
        grains.push([col, heights[col], i])
        heights[col] += 1
      }
      const colW = (size.width - 24) / cols
      const grainH = Math.min(colW, (size.height - 40) / Math.max(...heights))
      const ground = size.height - 24
      for (const [col, h, i] of grains) {
        const layer = Math.floor((i / n) * 8)
        ctx.fillStyle = rampAt(c.ramp, layer % 2 ? 0.15 + layer / 10 : 0.9 - layer / 12)
        ctx.globalAlpha = 0.9
        ctx.fillRect(12 + col * colW, ground - (h + 1) * grainH, colW - 0.6, grainH - 0.4)
      }
      ctx.globalAlpha = 1
      for (const [t, name] of [
        [v.min, 'min'],
        [v.mode, 'mode'],
        [v.max, 'max'],
      ] as const) {
        label(ctx, c, name, 12 + ((t - lo) / (hi - lo)) * cols * colW, size.height - 8, 'center')
      }
    },
  },

  gamma: {
    label: 'Rhythm: gaps along a spiral gamma, normalised to their mean',
    seed: 'rhythm',
    draw: (ctx, size, c, rng, v) => {
      const cx = size.width / 2
      const cy = size.height / 2
      const maxR = Math.min(size.width, size.height) / 2 - 12
      const spacing = 15
      const meanGap = 9
      const scale = meanGap / (v.shape * v.scale)
      let theta = 0
      for (let i = 0; i < 4000; i++) {
        const r = 8 + (spacing * theta) / TAU
        if (r > maxR) break
        const gap = rng.gamma({ shape: v.shape, scale: v.scale }) * scale
        theta += gap / r
        const t = Math.min(1, gap / (meanGap * 2.5))
        ctx.fillStyle = rampAt(c.ramp, t)
        ctx.globalAlpha = 0.9
        dot(ctx, cx + r * Math.cos(theta), cy + r * Math.sin(theta), 1.5 + Math.min(4, gap / 6))
      }
      ctx.globalAlpha = 1
    },
  },

  beta: {
    label: 'Tiles: each split at a beta proportion',
    seed: 'tiles',
    draw: (ctx, size, c, rng, v) => {
      const { s, x, y } = square(size, 14)
      const n = 10
      const cell = s / n
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const p = rng.beta({ alpha: v.alpha, beta: v.beta })
          const vertical = rng.bernoulli()
          const x0 = x + i * cell + 2
          const y0 = y + j * cell + 2
          const w = cell - 4
          ctx.globalAlpha = 0.9
          ctx.fillStyle = c.brand
          if (vertical) ctx.fillRect(x0, y0, w * p, w)
          else ctx.fillRect(x0, y0, w, w * p)
          ctx.fillStyle = c.brand2
          ctx.globalAlpha = 0.55
          if (vertical) ctx.fillRect(x0 + w * p, y0, w * (1 - p), w)
          else ctx.fillRect(x0, y0 + w * p, w, w * (1 - p))
        }
      }
      ctx.globalAlpha = 1
    },
  },

  'chi-squared': {
    label: 'Night sky: brightness chi-squared, relative to its mean',
    seed: 'stars',
    draw: (ctx, size, c, rng, v) => {
      for (let i = 0; i < 650; i++) {
        const [px, py] = rng.randomPoint()
        const b = Math.sqrt(rng.chiSquared(v.df) / v.df)
        const r = 0.6 + 2.2 * b
        const colour = rampAt(c.ramp, Math.min(1, b / 2.2))
        if (b > 1.6) {
          const glow = ctx.createRadialGradient(px * size.width, py * size.height, 0, px * size.width, py * size.height, r * 5)
          glow.addColorStop(0, colour)
          glow.addColorStop(1, 'transparent')
          ctx.fillStyle = glow
          ctx.globalAlpha = 0.35
          dot(ctx, px * size.width, py * size.height, r * 5)
        }
        ctx.fillStyle = colour
        ctx.globalAlpha = Math.min(1, 0.35 + b / 2)
        dot(ctx, px * size.width, py * size.height, r)
      }
      ctx.globalAlpha = 1
    },
  },

  'student-t': {
    label: 'Glitch lines: wobble Student’s t',
    seed: 'glitch',
    draw: (ctx, size, c, rng, v) => {
      const lines = 20
      const rowH = (size.height - 30) / lines
      const pts = 150
      ctx.lineJoin = 'round'
      for (let l = 0; l < lines; l++) {
        const base = 15 + (l + 0.5) * rowH
        ctx.strokeStyle = rampAt(c.ramp, l / (lines - 1))
        ctx.globalAlpha = 0.9
        ctx.lineWidth = 1.6
        ctx.beginPath()
        for (let i = 0; i <= pts; i++) {
          const dy = Math.max(-rowH * 2.5, Math.min(rowH * 2.5, rng.studentT(v.df) * rowH * 0.12))
          const px = 14 + (i / pts) * (size.width - 28)
          if (i) ctx.lineTo(px, base + dy)
          else ctx.moveTo(px, base + dy)
        }
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    },
  },

  'truncated-gaussian': {
    label: 'Clamping piles up on the edges; truncating does not',
    seed: 'confined',
    draw: (ctx, size, c, rng, v) => {
      const span = v.max - v.min || 1
      const lo = v.min - span * 0.3
      const hi = v.max + span * 0.3
      const pad = 20
      const xs = (t: number) => pad + ((t - lo) / (hi - lo)) * (size.width - pad * 2)
      const bandH = (size.height - 90) / 2
      const rows = [
        { name: 'Math.min(max, Math.max(min, gaussian()))', sample: () => Math.min(v.max, Math.max(v.min, rng.gaussian({ mean: v.mean, sd: v.sd }))), top: 30 },
        { name: 'truncatedGaussian({ mean, sd, min, max })', sample: () => rng.truncatedGaussian({ mean: v.mean, sd: v.sd, min: v.min, max: v.max }), top: 60 + bandH },
      ]
      for (const row of rows) {
        ctx.fillStyle = c.muted
        ctx.globalAlpha = 0.08
        ctx.fillRect(xs(v.min), row.top, xs(v.max) - xs(v.min), bandH)
        for (let i = 0; i < 1600; i++) {
          const x = row.sample()
          const t = (x - v.min) / (v.max - v.min || 1)
          ctx.fillStyle = rampAt(c.ramp, t)
          ctx.globalAlpha = 0.6
          dot(ctx, xs(x), row.top + 4 + rng.number() * (bandH - 8), 1.6)
        }
        ctx.globalAlpha = 0.7
        ctx.strokeStyle = c.fg
        ctx.beginPath()
        ctx.moveTo(xs(v.min), row.top - 4)
        ctx.lineTo(xs(v.min), row.top + bandH + 4)
        ctx.moveTo(xs(v.max), row.top - 4)
        ctx.lineTo(xs(v.max), row.top + bandH + 4)
        ctx.stroke()
        label(ctx, c, row.name, pad, row.top - 10)
      }
    },
  },

  'von-mises': {
    label: 'Wind: headings von Mises about the mean',
    seed: 'wind',
    draw: (ctx, size, c, rng, v) => {
      const cols = 20
      const cell = (size.width - 20) / cols
      const rows = Math.floor((size.height - 20) / cell)
      const x0 = (size.width - cell * cols) / 2
      const y0 = (size.height - cell * rows) / 2
      ctx.lineCap = 'round'
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const a = rng.vonMises({ mean: v.mean, kappa: v.kappa })
          const [jx, jy] = rng.inUnitDisc({ radius: cell * 0.2 })
          const cx = x0 + (i + 0.5) * cell + jx
          const cy = y0 + (j + 0.5) * cell + jy
          const len = cell * 0.42
          let dev = Math.abs(a - v.mean) % TAU
          if (dev > Math.PI) dev = TAU - dev
          ctx.strokeStyle = rampAt(c.ramp, dev / Math.PI)
          ctx.fillStyle = ctx.strokeStyle
          ctx.lineWidth = Math.max(1.5, cell * 0.09)
          ctx.globalAlpha = 0.9
          ctx.beginPath()
          ctx.moveTo(cx - Math.cos(a) * len, cy - Math.sin(a) * len)
          ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len)
          ctx.stroke()
          dot(ctx, cx + Math.cos(a) * len, cy + Math.sin(a) * len, Math.max(1.8, cell * 0.1))
        }
      }
      ctx.globalAlpha = 1
    },
  },

  bernoulli: {
    label: '10 PRINT: each tile ╱ with probability p',
    seed: 'maze',
    draw: (ctx, size, c, rng, v) => {
      const { s, x, y } = square(size, 14)
      const n = 22
      const cell = s / n
      ctx.lineCap = 'round'
      ctx.lineWidth = Math.max(2, cell * 0.16)
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const forward = rng.bernoulli(v.p)
          ctx.strokeStyle = rampAt(c.ramp, (i + j) / (2 * n - 2))
          ctx.globalAlpha = 0.9
          ctx.beginPath()
          const x0 = x + i * cell
          const y0 = y + j * cell
          if (forward) {
            ctx.moveTo(x0, y0 + cell)
            ctx.lineTo(x0 + cell, y0)
          } else {
            ctx.moveTo(x0, y0)
            ctx.lineTo(x0 + cell, y0 + cell)
          }
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
    },
  },

  binomial: {
    label: 'Galton board: each peg a bernoulli(p), each bin a binomial',
    seed: 'galton',
    draw: (ctx, size, c, rng, v) => {
      const rows = v.n
      const total = 420
      const top = 22
      const binTop = size.height * 0.5
      const dx = Math.min((size.width - 30) / (rows + 1), 28)
      const dy = (binTop - top - 10) / rows
      const cx = size.width / 2
      const ballR = Math.max(1.6, Math.min(4, dx * 0.28))
      const bins = new Array<number>(rows + 1).fill(0)
      type Ball = { path: boolean[]; t: number }
      const flying: Ball[] = []
      let spawned = 0
      const xAt = (row: number, rights: number) => cx + (rights - row / 2) * dx
      const paint = () => {
        ctx.clearRect(0, 0, size.width, size.height)
        ctx.fillStyle = c.muted
        ctx.globalAlpha = 0.45
        for (let r = 0; r < rows; r++) for (let k = 0; k <= r; k++) dot(ctx, xAt(r, k), top + r * dy, Math.max(1, dx * 0.08))
        const maxBin = Math.max(8, ...bins)
        const binH = (size.height - binTop - 16) / maxBin
        for (let k = 0; k <= rows; k++) {
          ctx.fillStyle = rampAt(c.ramp, k / Math.max(1, rows))
          ctx.globalAlpha = 0.85
          const bx = xAt(rows, k)
          ctx.fillRect(bx - dx * 0.4, size.height - 16 - bins[k] * binH, dx * 0.8, bins[k] * binH)
        }
        ctx.fillStyle = c.fg
        ctx.globalAlpha = 0.9
        for (const b of flying) {
          const row = Math.floor(b.t)
          const frac = b.t - row
          let rights = 0
          for (let i = 0; i < row; i++) if (b.path[i]) rights++
          const x1 = xAt(row, rights)
          const x2 = xAt(row + 1, rights + (b.path[row] ? 1 : 0))
          dot(ctx, x1 + (x2 - x1) * frac, top + (row + frac) * dy - ballR, ballR)
        }
        ctx.globalAlpha = 1
      }
      return () => {
        if (spawned < total) {
          for (let k = 0; k < 2 && spawned < total; k++, spawned++) {
            flying.push({ path: Array.from({ length: rows }, () => rng.bernoulli(v.p)), t: 0 })
          }
        }
        for (let i = flying.length - 1; i >= 0; i--) {
          const b = flying[i]
          b.t += 0.35
          if (b.t >= rows) {
            bins[b.path.filter(Boolean).length]++
            flying.splice(i, 1)
          }
        }
        paint()
        return spawned < total || flying.length > 0
      }
    },
  },

  geometric: {
    label: 'Beads: failures before the first success',
    seed: 'beads',
    draw: (ctx, size, c, rng, v) => {
      const rows = 16
      const rowH = (size.height - 24) / rows
      const r = Math.min(rowH * 0.32, 9)
      const step = r * 2.6
      const fit = Math.floor((size.width - 40) / step)
      for (let j = 0; j < rows; j++) {
        const k = rng.geometric(v.p)
        const y = 12 + (j + 0.5) * rowH
        ctx.strokeStyle = c.muted
        ctx.globalAlpha = 0.4
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(16, y)
        ctx.lineTo(16 + Math.min(k, fit) * step + r, y)
        ctx.stroke()
        for (let i = 0; i < Math.min(k, fit); i++) {
          ctx.strokeStyle = c.brand2
          ctx.globalAlpha = 0.9
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.arc(20 + i * step + r, y, r, 0, TAU)
          ctx.stroke()
        }
        if (k < fit) {
          ctx.fillStyle = c.brand
          ctx.globalAlpha = 1
          dot(ctx, 20 + k * step + r, y, r)
        } else label(ctx, c, `… ${k}`, 24 + fit * step, y + 4)
      }
      ctx.globalAlpha = 1
    },
  },

  poisson: {
    label: 'Cells of the sky: a Poisson count of stars in each',
    seed: 'cells',
    draw: (ctx, size, c, rng, v) => {
      const cols = 7
      const cell = (size.width - 20) / cols
      const rows = Math.max(1, Math.floor((size.height - 20) / cell))
      const x0 = (size.width - cell * cols) / 2
      const y0 = (size.height - cell * rows) / 2
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const k = rng.poisson(v.lambda)
          const cx = x0 + i * cell
          const cy = y0 + j * cell
          ctx.strokeStyle = c.muted
          ctx.globalAlpha = 0.25
          ctx.strokeRect(cx + 2, cy + 2, cell - 4, cell - 4)
          for (let d = 0; d < k; d++) {
            ctx.fillStyle = rampAt(c.ramp, Math.min(1, k / (v.lambda * 2 + 1)))
            ctx.globalAlpha = 0.85
            dot(ctx, cx + 8 + rng.number() * (cell - 16), cy + 8 + rng.number() * (cell - 16), Math.max(1.5, cell * 0.035))
          }
          label(ctx, c, String(k), cx + 7, cy + 15)
        }
      }
      ctx.globalAlpha = 1
    },
  },

  categorical: {
    label: 'Quilt: each patch’s colour and shape categorical',
    seed: 'quilt',
    draw: (ctx, size, c, rng, v) => {
      const { s, x, y } = square(size, 14)
      const n = 14
      const cell = s / n
      const weights = [v.w0, v.w1, v.w2, v.w3]
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const k = rng.categorical(weights)
          const cx = x + (i + 0.5) * cell
          const cy = y + (j + 0.5) * cell
          const r = cell * 0.38
          ctx.fillStyle = c.chart[k]
          ctx.globalAlpha = 0.9
          ctx.beginPath()
          if (k === 0) ctx.arc(cx, cy, r, 0, TAU)
          else if (k === 1) ctx.rect(cx - r, cy - r, r * 2, r * 2)
          else if (k === 2) {
            ctx.moveTo(cx, cy - r)
            ctx.lineTo(cx + r, cy + r * 0.8)
            ctx.lineTo(cx - r, cy + r * 0.8)
          } else {
            ctx.moveTo(cx, cy - r)
            ctx.lineTo(cx + r, cy)
            ctx.lineTo(cx, cy + r)
            ctx.lineTo(cx - r, cy)
          }
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1
    },
  },

  zipf: {
    label: 'Bubble cloud: 2,000 Zipf ranks, area by count',
    seed: 'ranks',
    draw: (ctx, size, c, rng, v) => {
      const counts = new Array<number>(v.n + 1).fill(0)
      for (let i = 0; i < 2000; i++) {
        const k = rng.zipf({ n: v.n, exponent: v.exponent })
        counts[k] += 1
      }
      const area = size.width * size.height * 0.3
      const placed: { x: number; y: number; r: number; k: number }[] = []
      for (let k = 1; k <= v.n; k++) {
        if (!counts[k]) continue
        const r = Math.sqrt(((counts[k] / 2000) * area) / Math.PI)
        // Walk out along a spiral until the circle fits
        for (let t = 0; t < 4000; t += 0.25) {
          const px = size.width / 2 + Math.cos(t) * t * 1.6
          const py = size.height / 2 + Math.sin(t) * t * 1.6
          if (placed.every((p) => Math.hypot(p.x - px, p.y - py) >= p.r + r + 2)) {
            placed.push({ x: px, y: py, r, k })
            break
          }
        }
      }
      // Shrink the whole cloud to fit, about the centre
      let fit = 1
      for (const p of placed) {
        fit = Math.min(fit, (size.width / 2 - 8) / (Math.abs(p.x - size.width / 2) + p.r), (size.height / 2 - 8) / (Math.abs(p.y - size.height / 2) + p.r))
      }
      for (const p of placed) {
        p.x = size.width / 2 + (p.x - size.width / 2) * fit
        p.y = size.height / 2 + (p.y - size.height / 2) * fit
        p.r *= fit
      }
      for (const p of placed) {
        ctx.fillStyle = rampAt(c.ramp, (p.k - 1) / Math.max(1, v.n - 1))
        ctx.globalAlpha = 0.85
        dot(ctx, p.x, p.y, p.r)
        if (p.r > 11) {
          ctx.globalAlpha = 1
          ctx.fillStyle = c.card
          ctx.font = `${Math.min(28, p.r * 0.7)}px "JetBrains Mono Variable", monospace`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(p.k), p.x, p.y)
          ctx.textBaseline = 'alphabetic'
        }
      }
      ctx.globalAlpha = 1
    },
  },

  dirichlet: {
    label: 'Flags: each band split three ways by dirichlet',
    seed: 'flags',
    draw: (ctx, size, c, rng, v) => {
      const rows = 16
      const rowH = (size.height - 24) / rows
      const w = size.width - 28
      for (let j = 0; j < rows; j++) {
        const shares = rng.dirichlet([v.a0, v.a1, v.a2])
        let x = 14
        shares.forEach((share, k) => {
          ctx.fillStyle = c.chart[k === 2 ? 2 : k]
          ctx.globalAlpha = 0.88
          ctx.beginPath()
          ctx.roundRect(x + 1, 12 + j * rowH + 2, Math.max(0, share * w - 2), rowH - 4, 3)
          ctx.fill()
          x += share * w
        })
      }
      ctx.globalAlpha = 1
    },
  },
}
