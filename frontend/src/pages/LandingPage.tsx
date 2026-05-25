import { useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import gsap from 'gsap'

interface Packet {
  x: number
  y: number
  tx: number
  ty: number
  progress: number
  speed: number
  blocked: boolean
  isSpecial: boolean
  size: number
  trail: Array<{ x: number; y: number }>
  exploded: boolean
  wobble: number
}

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
  size: number
}

interface FloatingText {
  x: number
  y: number
  text: string
  life: number
  color: string
}

interface Hit {
  x: number
  y: number
  life: number
  color: string
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function LandingPage() {
  const navigate = useNavigate()
  const section2Ref = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bgCanvasRef = useRef<HTMLCanvasElement>(null)

  // Animation state (all refs, not state)
  const t = useRef(0)
  const packets = useRef<Packet[]>([])
  const sparks = useRef<Spark[]>([])
  const hits = useRef<Hit[]>([])
  const floaties = useRef<FloatingText[]>([])
  const damage = useRef(0)
  const shieldHp = useRef(100)
  const atkPower = useRef(85)
  const screenShake = useRef(0)
  const packetTimer = useRef(0)
  const beamTimer = useRef(0)
  const beamLife = useRef(0)
  const ambientParticles = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number }>>([])

  // HUD refs
  const atkBarRef = useRef<HTMLDivElement>(null)
  const atkLabelRef = useRef<HTMLDivElement>(null)
  const defBarRef = useRef<HTMLDivElement>(null)
  const defLabelRef = useRef<HTMLDivElement>(null)
  const phaseLabelRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  // GSAP entrance for bottom text
  useEffect(() => {
    const tl = gsap.timeline({ delay: 1.5 })
    tl.to(headlineRef.current, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' })
    tl.to(ctaRef.current, { opacity: 1, duration: 0.6, ease: 'power2.out' }, '-=0.3')
    return () => {
      tl.kill()
    }
  }, [])

  // Background animation
  useEffect(() => {
    const canvas = bgCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')!
    let rafId: number
    let bgT = 0

    const resizeCanvas = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio
      canvas.height = window.innerHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const W = window.innerWidth
    const H = window.innerHeight

    // Floating particles
    const particles = Array.from({ length: 30 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
      life: Math.random(),
      maxLife: Math.random() * 0.5 + 0.3,
    }))

    const bgLoop = () => {
      bgT++
      ctx.clearRect(0, 0, W, H)

      // Animated gradient background
      const grad = ctx.createLinearGradient(0, 0, W, H)
      const t = bgT * 0.0001
      grad.addColorStop(0, `rgba(7,8,15,${1 - Math.sin(t) * 0.05})`)
      grad.addColorStop(0.5, `rgba(12,15,26,${1 - Math.cos(t * 0.7) * 0.08})`)
      grad.addColorStop(1, `rgba(7,8,15,${1 - Math.sin(t * 1.3) * 0.05})`)
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      // Glowing orbs
      const orbs = [
        { x: W * 0.1, y: H * 0.2, color: 'rgba(229,72,77,0.08)' },
        { x: W * 0.8, y: H * 0.3, color: 'rgba(61,219,217,0.06)' },
        { x: W * 0.5, y: H * 0.7, color: 'rgba(61,142,245,0.07)' },
      ]

      orbs.forEach((orb, i) => {
        const offset = Math.sin(bgT * 0.003 + i) * 100
        const glow = ctx.createRadialGradient(
          orb.x + offset,
          orb.y + Math.cos(bgT * 0.002 + i) * 80,
          0,
          orb.x + offset,
          orb.y + Math.cos(bgT * 0.002 + i) * 80,
          400
        )
        glow.addColorStop(0, orb.color)
        glow.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = glow
        ctx.fillRect(0, 0, W, H)
      })

      // Floating particles
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy

        // Bounce
        if (p.x < 0 || p.x > W) p.vx *= -1
        if (p.y < 0 || p.y > H) p.vy *= -1

        // Keep in bounds
        p.x = Math.max(0, Math.min(W, p.x))
        p.y = Math.max(0, Math.min(H, p.y))

        // Pulsing opacity
        const pulse = Math.sin(bgT * 0.02 + p.life) * 0.5 + 0.5
        ctx.fillStyle = `rgba(61,219,217,${pulse * 0.3})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      })

      // Subtle grid lines (moving)
      ctx.strokeStyle = 'rgba(61,219,217,0.015)'
      ctx.lineWidth = 0.5

      // Vertical lines
      for (let x = -100 + (bgT % 100); x < W + 100; x += 100) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x + Math.sin(bgT * 0.001) * 50, H)
        ctx.stroke()
      }

      // Horizontal lines
      for (let y = -100 + (bgT % 100); y < H + 100; y += 100) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(W, y + Math.cos(bgT * 0.0008) * 50)
        ctx.stroke()
      }

      rafId = requestAnimationFrame(bgLoop)
    }

    rafId = requestAnimationFrame(bgLoop)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  // Canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')!
    let rafId: number

    // Set up canvas with DPI scaling
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const W = canvas.offsetWidth
    const H = canvas.offsetHeight
    const GROUND_Y = H * 0.72

    // Initialize ambient particles
    for (let i = 0; i < 20; i++) {
      ambientParticles.current.push({
        x: Math.random() * W,
        y: H + Math.random() * 50,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -Math.random() * 0.6 - 0.3,
        life: Math.random(),
      })
    }

    const spawnPacket = () => {
      const isSpecial = Math.random() > 0.8
      packets.current.push({
        x: W * 0.19 + 24,
        y: GROUND_Y - 28,
        tx: W * 0.5 - 18,
        ty: GROUND_Y - 55,
        progress: 0,
        speed: (isSpecial ? 0.022 : 0.014) + Math.random() * 0.007,
        blocked: Math.random() > 0.32,
        isSpecial,
        size: isSpecial ? 5 : 3 + Math.random() * 2,
        trail: [],
        exploded: false,
        wobble: Math.random() * Math.PI * 2,
      })
    }

    const updatePackets = () => {
      packets.current = packets.current.filter(p => {
        p.progress += p.speed
        const startX = p.x
        const startY = p.y

        const blockAt = p.blocked ? 0.7 : 1.2

        if (p.progress <= blockAt) {
          p.x = lerp(startX, p.tx, p.progress / blockAt)
          p.y =
            lerp(startY, p.ty, p.progress / blockAt) +
            Math.sin(p.progress * 8 + p.wobble) * 3

          p.trail.push({ x: p.x, y: p.y })
          if (p.trail.length > 15) p.trail.shift()
        } else if (!p.exploded) {
          p.exploded = true

          if (p.blocked) {
            shieldHp.current = Math.max(0, shieldHp.current - (p.isSpecial ? 8 : Math.random() * 4 + 2))
            hits.current.push({ x: p.tx, y: p.ty, life: 1, color: 'rgba(61,219,217,0.8)' })
            for (let i = 0; i < (p.isSpecial ? 14 : 8); i++) {
              const a = (i / (p.isSpecial ? 14 : 8)) * Math.PI * 2
              sparks.current.push({
                x: p.tx,
                y: p.ty,
                vx: Math.cos(a) * (3 + Math.random() * 2),
                vy: Math.sin(a) * (3 + Math.random() * 2),
                life: 1,
                color: 'rgba(61,219,217,0.9)',
                size: 2,
              })
            }
            if (p.isSpecial) screenShake.current = 1.5
          } else {
            damage.current = Math.min(1, damage.current + (p.isSpecial ? 0.08 : 0.04))
            screenShake.current = p.isSpecial ? 2 : 1
            for (let i = 0; i < 10; i++) {
              const a = (i / 10) * Math.PI * 2
              sparks.current.push({
                x: p.x,
                y: p.y,
                vx: Math.cos(a) * (2.5 + Math.random() * 2),
                vy: Math.sin(a) * (2.5 + Math.random() * 2),
                life: 1,
                color: 'rgba(229,72,77,0.85)',
                size: 2,
              })
            }
            floaties.current.push({
              x: p.x,
              y: p.y,
              text: p.isSpecial ? '-12HP' : '-5HP',
              life: 1,
              color: p.isSpecial ? '#E5484D' : '#E0A663',
            })
          }
        }

        return p.progress < 1.5
      })
    }

    const drawPackets = (ctx: CanvasRenderingContext2D) => {
      packets.current.forEach(p => {
        // Trail
        p.trail.forEach((point, i) => {
          const alpha = (i / p.trail.length) * 0.4
          ctx.fillStyle = `rgba(229,72,77,${alpha})`
          ctx.beginPath()
          ctx.arc(point.x, point.y, p.size * 0.5, 0, Math.PI * 2)
          ctx.fill()
        })

        // Head
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3)
        grad.addColorStop(0, 'rgba(255,255,255,0.8)')
        grad.addColorStop(0.5, 'rgba(229,72,77,0.6)')
        grad.addColorStop(1, 'rgba(229,72,77,0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#E5484D'
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    const drawAttacker = (cx: number, cy: number) => {
      const bob = Math.sin(t.current * 0.04) * 2
      const lean = 4 + Math.sin(t.current * 0.03) * 2

      ctx.save()
      ctx.translate(cx + lean, cy + bob)

      // Aura rings
      for (let i = 0; i < 3; i++) {
        const r = 28 + i * 12 + Math.sin(t.current * 0.06 + i) * 4
        const alpha = (0.08 - i * 0.02) * Math.abs(Math.sin(t.current * 0.05 + i * 0.5))
        ctx.strokeStyle = `rgba(229,72,77,${alpha})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(0, -20, r, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Shadow
      ctx.fillStyle = 'rgba(229,72,77,0.08)'
      ctx.beginPath()
      ctx.ellipse(0, 8, 24, 5, 0, 0, Math.PI * 2)
      ctx.fill()

      // Legs
      ctx.strokeStyle = '#9B2C2C'
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(-6, -4)
      ctx.lineTo(-14, 8)
      ctx.lineTo(-8, 8)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(4, -4)
      ctx.lineTo(14, 8)
      ctx.lineTo(20, 6)
      ctx.stroke()

      // Torso
      ctx.strokeStyle = '#E5484D'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(0, -4)
      ctx.lineTo(-3, -28)
      ctx.stroke()

      // Power arm
      const armPulse = Math.sin(t.current * 0.1) * 3
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(-3, -22)
      ctx.lineTo(24 + armPulse, -18)
      ctx.stroke()

      // Back arm
      ctx.beginPath()
      ctx.moveTo(-3, -22)
      ctx.lineTo(-18, -15)
      ctx.stroke()

      // Head
      ctx.fillStyle = '#E5484D'
      ctx.beginPath()
      ctx.moveTo(-4, -28)
      ctx.lineTo(2, -42)
      ctx.lineTo(10, -38)
      ctx.lineTo(8, -28)
      ctx.closePath()
      ctx.fill()

      // Eye
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(6, -36, 2.5, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#E5484D'
      ctx.beginPath()
      ctx.arc(6, -36, 1.2, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = 'rgba(229,72,77,0.4)'
      ctx.beginPath()
      ctx.arc(6, -36, 5, 0, Math.PI * 2)
      ctx.fill()

      // Hair spikes
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.32
        const r = 15 + Math.sin(t.current * 0.09 + i * 0.7) * 4
        ctx.strokeStyle = `rgba(229,72,77,${0.5 + Math.sin(t.current * 0.07 + i) * 0.3})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(0, -36)
        ctx.lineTo(Math.cos(a) * (10 + r * 0.5), -36 + Math.sin(a) * (10 + r * 0.5))
        ctx.stroke()
      }

      // Charge orb
      const chargeR = 5 + Math.sin(t.current * 0.14) * 2
      const grad = ctx.createRadialGradient(24 + armPulse, -18, 0, 24 + armPulse, -18, chargeR * 2)
      grad.addColorStop(0, 'rgba(255,255,255,0.9)')
      grad.addColorStop(0.6, 'rgba(229,72,77,0.7)')
      grad.addColorStop(1, 'rgba(229,72,77,0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(24 + armPulse, -18, chargeR * 2, 0, Math.PI * 2)
      ctx.fill()

      for (let i = 0; i < 4; i++) {
        const oa = (t.current * 0.12 + i * (Math.PI / 2)) % (Math.PI * 2)
        const or = chargeR * 1.8
        ctx.fillStyle = 'rgba(229,72,77,0.9)'
        ctx.beginPath()
        ctx.arc(24 + armPulse + Math.cos(oa) * or, -18 + Math.sin(oa) * or, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()
    }

    const drawServer = () => {
      const sx = W * 0.5
      const sy = GROUND_Y - H * 0.12
      const panels = [
        { y: -80, h: 24 },
        { y: -52, h: 24 },
        { y: -24, h: 24 },
        { y: 4, h: 16 },
      ]

      panels.forEach((panel, i) => {
        const cracked = damage.current > 0.3 && i < 2
        const cracked2 = damage.current > 0.6 && i < 3

        let fillColor = 'rgba(61,219,217,0.12)'
        let strokeColor = 'rgba(61,219,217,0.5)'

        if (cracked2) {
          fillColor = 'rgba(229,72,77,0.12)'
          strokeColor = '#E5484D'
        } else if (cracked) {
          fillColor = 'rgba(224,166,99,0.12)'
          strokeColor = '#E0A663'
        }

        ctx.fillStyle = fillColor
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = 1.5

        ctx.beginPath()
        ctx.roundRect(sx - 24, sy + panel.y, 48, panel.h, 2)
        ctx.fill()
        ctx.stroke()

        // Status dot
        const dotColor = cracked2 ? '#E5484D' : cracked ? '#E0A663' : '#3DDBD9'
        ctx.fillStyle = dotColor
        ctx.beginPath()
        ctx.arc(sx - 20, sy + panel.y + panel.h / 2, 1.5, 0, Math.PI * 2)
        ctx.fill()

        // Blinking activity
        const blink = Math.abs(Math.sin(t.current * 0.08 + i)) > 0.3 ? 1 : 0.4
        ctx.fillStyle = `rgba(61,219,217,${blink * 0.6})`
        ctx.beginPath()
        ctx.arc(sx + 18, sy + panel.y + panel.h / 2, 1.5, 0, Math.PI * 2)
        ctx.fill()

        if (cracked2 && Math.random() > 0.85) {
          sparks.current.push({
            x: sx - 12 + Math.random() * 24,
            y: sy + panel.y + Math.random() * panel.h,
            vx: (Math.random() - 0.5) * 3,
            vy: Math.random() * 2 - 1,
            life: 1,
            color: 'rgba(229,72,77,0.8)',
            size: 1.5,
          })
        }
      })

      // Crack lines
      if (damage.current > 0.25) {
        ctx.strokeStyle = 'rgba(229,72,77,0.4)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(sx - 20, sy - 80)
        ctx.lineTo(sx - 8, sy + 4)
        ctx.stroke()
      }

      if (damage.current > 0.55) {
        ctx.strokeStyle = 'rgba(229,72,77,0.4)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(sx + 18, sy - 60)
        ctx.lineTo(sx + 8, sy - 20)
        ctx.stroke()
      }

      if (damage.current > 0.8) {
        ctx.strokeStyle = 'rgba(229,72,77,0.4)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(sx - 18, sy - 30)
        ctx.lineTo(sx + 12, sy + 10)
        ctx.stroke()
      }
    }

    const drawDefender = (alertLevel: number) => {
      const dx = W * 0.78
      const dy = GROUND_Y
      const bob = Math.sin(t.current * 0.055 + 1) * 2

      ctx.save()
      ctx.translate(dx, dy + bob)

      // Aura
      if (alertLevel > 0.2) {
        for (let i = 0; i < 3; i++) {
          const r = 28 + i * 12
          const alpha = (0.08 - i * 0.02) * alertLevel
          ctx.strokeStyle = `rgba(61,142,245,${alpha})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(0, -20, r, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      // Shadow
      ctx.fillStyle = 'rgba(61,142,245,0.08)'
      ctx.beginPath()
      ctx.ellipse(0, 8, 24, 5, 0, 0, Math.PI * 2)
      ctx.fill()

      // Legs
      ctx.strokeStyle = '#1E4A8C'
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(-6, -4)
      ctx.lineTo(-12, 8)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(6, -4)
      ctx.lineTo(12, 8)
      ctx.stroke()

      // Torso
      ctx.strokeStyle = '#3D8EF5'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(0, -4)
      ctx.lineTo(0, -28)
      ctx.stroke()

      // Shield arm extended
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(0, -22)
      ctx.lineTo(-28, -20)
      ctx.stroke()

      // Right arm raised
      ctx.beginPath()
      ctx.moveTo(0, -22)
      ctx.lineTo(16, -32)
      ctx.stroke()

      // Head
      ctx.fillStyle = '#3D8EF5'
      ctx.beginPath()
      ctx.moveTo(-4, -28)
      ctx.lineTo(-10, -42)
      ctx.lineTo(-2, -48)
      ctx.lineTo(6, -42)
      ctx.lineTo(8, -28)
      ctx.closePath()
      ctx.fill()

      // Visor
      ctx.fillStyle = 'rgba(61,219,217,0.4)'
      ctx.beginPath()
      ctx.arc(2, -38, 6, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#3DDBD9'
      ctx.beginPath()
      ctx.arc(2, -38, 3, 0, Math.PI * 2)
      ctx.fill()

      // Shield hexagon
      const shieldX = -28
      const shieldY = -20
      const shieldR = 16
      const glow = ctx.createRadialGradient(shieldX, shieldY, 0, shieldX, shieldY, shieldR * 1.5)
      glow.addColorStop(0, `rgba(61,219,217,${alertLevel * 0.25})`)
      glow.addColorStop(1, 'rgba(61,219,217,0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(shieldX, shieldY, shieldR * 1.5, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = `rgba(61,219,217,${0.5 + alertLevel * 0.4})`
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2
        i === 0
          ? ctx.moveTo(shieldX + Math.cos(a) * shieldR, shieldY + Math.sin(a) * shieldR)
          : ctx.lineTo(shieldX + Math.cos(a) * shieldR, shieldY + Math.sin(a) * shieldR)
      }
      ctx.closePath()
      ctx.stroke()

      // Inner hex
      ctx.strokeStyle = `rgba(61,219,217,${0.3 + alertLevel * 0.2})`
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2
        i === 0
          ? ctx.moveTo(shieldX + Math.cos(a) * 8, shieldY + Math.sin(a) * 8)
          : ctx.lineTo(shieldX + Math.cos(a) * 8, shieldY + Math.sin(a) * 8)
      }
      ctx.closePath()
      ctx.stroke()

      // Rotating rune
      const runeAngle = (t.current * 0.03) % (Math.PI * 2)
      ctx.strokeStyle = `rgba(61,219,217,${0.4 + alertLevel * 0.3})`
      ctx.lineWidth = 1
      for (let i = 0; i < 3; i++) {
        const a = runeAngle + (i * Math.PI) / 3
        ctx.beginPath()
        ctx.moveTo(shieldX, shieldY)
        ctx.lineTo(shieldX + Math.cos(a) * 10, shieldY + Math.sin(a) * 10)
        ctx.stroke()
      }

      ctx.restore()
    }

    const drawBeam = () => {
      if (beamLife.current <= 0) return

      const beamStart = { x: W * 0.19 + 24, y: GROUND_Y - 28 }
      const beamEnd = { x: W * 0.5 - 18, y: GROUND_Y - 55 }

      const grad = ctx.createLinearGradient(beamStart.x, beamStart.y, beamEnd.x, beamEnd.y)
      grad.addColorStop(0, 'rgba(229,72,77,0)')
      grad.addColorStop(0.5, `rgba(229,72,77,${beamLife.current})`)
      grad.addColorStop(1, 'rgba(229,72,77,0)')

      ctx.strokeStyle = grad
      ctx.lineWidth = beamLife.current * 8
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(beamStart.x, beamStart.y)
      ctx.lineTo(beamEnd.x, beamEnd.y)
      ctx.stroke()

      ctx.strokeStyle = `rgba(255,255,255,${beamLife.current * 0.4})`
      ctx.lineWidth = beamLife.current * 2
      ctx.beginPath()
      ctx.moveTo(beamStart.x, beamStart.y)
      ctx.lineTo(beamEnd.x, beamEnd.y)
      ctx.stroke()

      damage.current = Math.min(1, damage.current + 0.015)
      screenShake.current = Math.max(screenShake.current, 1.5)
    }

    const drawSparks = () => {
      sparks.current = sparks.current.filter(s => {
        s.x += s.vx
        s.y += s.vy
        s.vy += 0.18
        s.life -= 0.04

        ctx.fillStyle = s.color
        ctx.globalAlpha = s.life
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fill()

        return s.life > 0
      })
      ctx.globalAlpha = 1
    }

    const drawFloaties = () => {
      floaties.current = floaties.current.filter(f => {
        f.y -= 0.8
        f.life -= 0.02

        ctx.fillStyle = f.color
        ctx.globalAlpha = f.life
        ctx.font = 'bold 13px var(--mono)'
        ctx.textAlign = 'center'
        ctx.fillText(f.text, f.x, f.y)

        return f.life > 0
      })
      ctx.globalAlpha = 1
    }

    const drawWarningText = () => {
      if (damage.current > 0.5 && Math.random() > 0.985) {
        const warnings = ['SYS BREACH', 'DATA AT RISK', 'EXFIL DETECTED', 'CRITICAL']
        floaties.current.push({
          x: Math.random() * W,
          y: Math.random() * H * 0.6,
          text: warnings[Math.floor(Math.random() * warnings.length)],
          life: 1.5,
          color: 'rgba(229,72,77,0.3)',
        })
      }
    }

    const drawAmbientParticles = () => {
      ambientParticles.current = ambientParticles.current.filter(p => {
        p.x += p.vx
        p.y += p.vy

        if (p.y < 0) {
          p.y = H
          p.x = Math.random() * W
        }

        ctx.fillStyle = `rgba(${p.life > 0.5 ? '61,219,217' : '229,72,77'},0.4)`
        ctx.globalAlpha = p.life
        ctx.beginPath()
        ctx.arc(p.x, p.y, 1, 0, Math.PI * 2)
        ctx.fill()

        return true
      })
      ctx.globalAlpha = 1
    }

    const drawHits = () => {
      hits.current = hits.current.filter(h => {
        const grad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 40 * (1 - h.life))
        grad.addColorStop(0, h.color)
        grad.addColorStop(1, 'rgba(61,219,217,0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(h.x, h.y, 40 * (1 - h.life), 0, Math.PI * 2)
        ctx.fill()

        h.life -= 0.05
        return h.life > 0
      })
    }

    const drawGrid = () => {
      ctx.strokeStyle = 'rgba(255,255,255,0.025)'
      ctx.lineWidth = 0.5
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, H)
        ctx.stroke()
      }
      for (let y = 0; y < H; y += 40) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
        ctx.stroke()
      }
    }

    const drawGround = () => {
      // Glowing ground line
      ctx.strokeStyle = 'rgba(61,219,217,0.2)'
      ctx.setLineDash([4, 8])
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, GROUND_Y)
      ctx.lineTo(W, GROUND_Y)
      ctx.stroke()
      ctx.setLineDash([])

      // Ground glows
      const glows = [
        { x: W * 0.19, color: '#E5484D' },
        { x: W * 0.5, color: '#3DDBD9' },
        { x: W * 0.78, color: '#3D8EF5' },
      ]

      glows.forEach(glow => {
        const grad = ctx.createRadialGradient(glow.x, GROUND_Y, 0, glow.x, GROUND_Y, 60)
        grad.addColorStop(0, glow.color)
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(glow.x, GROUND_Y, 60, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    const drawScanlines = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.02)'
      for (let y = 0; y < H; y += 4) {
        ctx.fillRect(0, y, W, 2)
      }

      const scanY = (t.current * 2) % H
      ctx.fillStyle = 'rgba(61,219,217,0.02)'
      ctx.fillRect(0, scanY, W, 3)
    }

    const applyShake = () => {
      if (screenShake.current > 0.3) {
        ctx.translate(
          (Math.random() - 0.5) * screenShake.current * 2,
          (Math.random() - 0.5) * screenShake.current * 2
        )
        screenShake.current *= 0.85
      }
    }

    const updateHUD = () => {
      const atkPercent = Math.min(100, Math.round(atkPower.current + damage.current * 15))
      const defPercent = Math.max(0, Math.round(shieldHp.current))

      if (atkBarRef.current) atkBarRef.current.style.width = atkPercent + '%'
      if (atkLabelRef.current) atkLabelRef.current.textContent = `POWER ${atkPercent}%`

      if (defBarRef.current) {
        defBarRef.current.style.width = defPercent + '%'
        defBarRef.current.style.background = defPercent < 30 ? '#E5484D' : '#3D8EF5'
      }
      if (defLabelRef.current) defLabelRef.current.textContent = `SHIELD ${defPercent}%`

      if (phaseLabelRef.current) {
        if (damage.current > 0.7) phaseLabelRef.current.textContent = '⚠ CRITICAL BREACH'
        else if (damage.current > 0.4) phaseLabelRef.current.textContent = '⚠ SYSTEMS FAILING'
        else if (shieldHp.current < 40) phaseLabelRef.current.textContent = '⚠ SHIELD WEAKENING'
        else phaseLabelRef.current.textContent = 'SIEGE IN PROGRESS'
      }
    }

    const loop = () => {
      t.current++
      packetTimer.current++
      beamTimer.current++

      // Clear canvas
      ctx.fillStyle = '#07080F'
      ctx.fillRect(0, 0, W, H)

      ctx.save()
      applyShake()

      drawGrid()
      drawAmbientParticles()
      drawGround()

      drawBeam()

      if (packetTimer.current > 50) {
        spawnPacket()
        packetTimer.current = 0
      }

      if (beamTimer.current > 180) {
        beamLife.current = 0.8
        beamTimer.current = 0
      }

      beamLife.current = Math.max(0, beamLife.current - 0.015)

      updatePackets()
      drawPackets(ctx)

      const alertLevel = Math.min(
        1,
        hits.current.length * 0.5 + packets.current.filter(p => p.progress > 0.3 && p.progress < 0.8).length * 0.25
      )

      drawAttacker(W * 0.19, GROUND_Y)
      drawServer()
      drawDefender(alertLevel)

      drawHits()
      drawSparks()
      drawFloaties()
      drawWarningText()
      drawScanlines()

      ctx.restore()

      updateHUD()

      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  const handleScroll = () => {
    section2Ref.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div style={{ overflow: 'hidden', position: 'relative' }}>
      {/* Animated background */}
      <canvas
        ref={bgCanvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      <style>{`
        :root {
          --bg: #07080F;
          --surface: #0C0F1A;
          --attack: #3DDBD9;
          --red: #E5484D;
          --blue: #3D8EF5;
          --amber: #E0A663;
          --ink1: #E5E7EA;
          --ink2: #686C75;
          --mono: 'JetBrains Mono', monospace;
          --sans: 'Inter Tight', sans-serif;
        }
      `}</style>

      {/* Section 1: Battle */}
      <section
        style={{
          height: '100vh',
          background: 'rgba(7,8,15,0.95)',
          position: 'relative',
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
          }}
        />

        {/* HUD Overlay */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 32px',
            fontSize: 12,
            fontFamily: 'var(--mono)',
            zIndex: 10,
          }}
        >
          {/* Attacker stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ color: 'rgba(229,72,77,0.7)', letterSpacing: '0.1em' }}>⬡ ATTACKER</div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, width: 120, overflow: 'hidden' }}>
              <div
                ref={atkBarRef}
                style={{
                  height: '100%',
                  background: '#E5484D',
                  borderRadius: 2,
                  width: '85%',
                  transition: 'width 0.3s',
                }}
              />
            </div>
            <div ref={atkLabelRef} style={{ fontSize: 8, color: 'rgba(229,72,77,0.4)' }}>
              POWER 85%
            </div>
          </div>

          {/* Phase */}
          <div
            ref={phaseLabelRef}
            style={{
              fontSize: 10,
              letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.2)',
              textTransform: 'uppercase',
            }}
          >
            SIEGE IN PROGRESS
          </div>

          {/* Defender stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
            <div style={{ color: 'rgba(61,142,245,0.7)', letterSpacing: '0.1em' }}>DEFENDER ⬡</div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, width: 120, overflow: 'hidden' }}>
              <div
                ref={defBarRef}
                style={{
                  height: '100%',
                  background: '#3D8EF5',
                  borderRadius: 2,
                  width: '100%',
                  transition: 'width 0.3s, background 0.5s',
                }}
              />
            </div>
            <div ref={defLabelRef} style={{ fontSize: 8, color: 'rgba(61,142,245,0.4)' }}>
              SHIELD 100%
            </div>
          </div>
        </div>

        {/* Bottom text */}
        <div
          ref={headlineRef}
          style={{
            position: 'absolute',
            bottom: 80,
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: 0,
            zIndex: 10,
          }}
        >
          <p
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 'clamp(16px, 2vw, 22px)',
              fontWeight: 400,
              color: 'rgba(255,255,255,0.45)',
              letterSpacing: '-0.02em',
              margin: 0,
              maxWidth: 600,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Your infrastructure is already compromised.
          </p>
        </div>

        <div
          ref={ctaRef}
          style={{
            position: 'absolute',
            bottom: 20,
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: 0,
            zIndex: 10,
          }}
        >
          <button
            onClick={handleScroll}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.5)',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              letterSpacing: '0.1em',
              padding: '10px 28px',
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
            }}
          >
            SEE HOW ↓
          </button>
        </div>

        {/* Incident tag */}
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: 'var(--mono)',
            fontSize: 9,
            letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.15)',
            whiteSpace: 'nowrap',
            zIndex: 10,
          }}
        >
          ● LIVE · INC-2026-0419 · LATERAL MOVEMENT DETECTED
        </div>
      </section>

      {/* Section 2: About & Auth */}
      <section
        ref={section2Ref}
        style={{
          minHeight: '100vh',
          background: 'rgba(7,8,15,0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          viewport={{ once: true }}
          style={{ textAlign: 'center', maxWidth: 720 }}
        >
          {/* What is TraceVeil */}
          <div style={{ marginBottom: 64 }}>
            <h1
              style={{
                fontFamily: 'var(--sans)',
                fontSize: 'clamp(32px, 5vw, 48px)',
                fontWeight: 600,
                color: '#E5E7EA',
                margin: 0,
                marginBottom: 16,
                letterSpacing: '-0.02em',
              }}
            >
              Cybersecurity Attack Simulator
            </h1>
            <p
              style={{
                fontFamily: 'var(--sans)',
                fontSize: 'clamp(16px, 2vw, 18px)',
                color: 'rgba(255,255,255,0.5)',
                margin: 0,
                marginBottom: 32,
                lineHeight: 1.6,
              }}
            >
              Watch real attacks unfold in real-time. Learn how threats propagate. Understand your detection gaps.
            </p>

            {/* Key points */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 24,
                marginBottom: 48,
              }}
            >
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#3DDBD9', marginBottom: 8, letterSpacing: '0.1em' }}>
                  LEARN
                </div>
                <p
                  style={{
                    fontFamily: 'var(--sans)',
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.4)',
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  See how attacks progress step by step
                </p>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#3DDBD9', marginBottom: 8, letterSpacing: '0.1em' }}>
                  SIMULATE
                </div>
                <p
                  style={{
                    fontFamily: 'var(--sans)',
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.4)',
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  Run pre-built attack scenarios
                </p>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#3DDBD9', marginBottom: 8, letterSpacing: '0.1em' }}>
                  ANALYZE
                </div>
                <p
                  style={{
                    fontFamily: 'var(--sans)',
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.4)',
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  Find what your detection missed
                </p>
              </div>
            </div>
          </div>

          {/* Auth Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 300, margin: '0 auto' }}>
            <button
              onClick={() => navigate('/register')}
              style={{
                background: '#3DDBD9',
                color: '#000',
                border: 'none',
                borderRadius: 8,
                padding: '14px 32px',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'var(--sans)',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                letterSpacing: '0.02em',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Get Started Free
            </button>
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.6)',
                borderRadius: 8,
                padding: '14px 32px',
                fontSize: 14,
                fontWeight: 500,
                fontFamily: 'var(--sans)',
                cursor: 'pointer',
                transition: 'border-color 0.2s, color 0.2s',
                letterSpacing: '0.02em',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.9)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.6)'
              }}
            >
              Sign In
            </button>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
