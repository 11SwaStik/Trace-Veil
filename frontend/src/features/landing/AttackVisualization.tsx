import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { motion } from 'framer-motion'
import {
  CyberPulseSystem,
  ExfiltrationEffect,
} from '../../lib/animations/EnvironmentalEffects'

interface AttackVisualizationProps {
  isLoaded: boolean
}

export default function AttackVisualization({ isLoaded }: AttackVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pulseSystemRef = useRef<CyberPulseSystem | null>(null)

  useEffect(() => {
    if (!svgRef.current || !isLoaded) return

    const svg = svgRef.current

    // ATTACKER SILHOUETTE (left side)
    // Create a simple human figure outline
    const attackerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    attackerGroup.id = 'attacker-group'
    attackerGroup.setAttribute('transform', 'translate(150, 400)')

    // Head
    const head = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    head.setAttribute('cx', '0')
    head.setAttribute('cy', '-80')
    head.setAttribute('r', '25')
    head.setAttribute('fill', 'none')
    head.setAttribute('stroke', '#3ddbd9')
    head.setAttribute('stroke-width', '2')
    attackerGroup.appendChild(head)

    // Body
    const body = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    body.setAttribute('x', '-20')
    body.setAttribute('y', '-45')
    body.setAttribute('width', '40')
    body.setAttribute('height', '50')
    body.setAttribute('fill', 'none')
    body.setAttribute('stroke', '#3ddbd9')
    body.setAttribute('stroke-width', '2')
    body.setAttribute('rx', '5')
    attackerGroup.appendChild(body)

    // Left arm (raised, aiming)
    const leftArm = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    leftArm.setAttribute('x1', '-20')
    leftArm.setAttribute('y1', '-30')
    leftArm.setAttribute('x2', '-60')
    leftArm.setAttribute('y2', '-70')
    leftArm.setAttribute('stroke', '#3ddbd9')
    leftArm.setAttribute('stroke-width', '2')
    leftArm.setAttribute('stroke-linecap', 'round')
    attackerGroup.appendChild(leftArm)

    // Right arm (down)
    const rightArm = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    rightArm.setAttribute('x1', '20')
    rightArm.setAttribute('y1', '-30')
    rightArm.setAttribute('x2', '50')
    rightArm.setAttribute('y2', '0')
    rightArm.setAttribute('stroke', '#3ddbd9')
    rightArm.setAttribute('stroke-width', '2')
    rightArm.setAttribute('stroke-linecap', 'round')
    attackerGroup.appendChild(rightArm)

    // Legs
    const leftLeg = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    leftLeg.setAttribute('x1', '-10')
    leftLeg.setAttribute('y1', '5')
    leftLeg.setAttribute('x2', '-10')
    leftLeg.setAttribute('y2', '45')
    leftLeg.setAttribute('stroke', '#3ddbd9')
    leftLeg.setAttribute('stroke-width', '2')
    attackerGroup.appendChild(leftLeg)

    const rightLeg = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    rightLeg.setAttribute('x1', '10')
    rightLeg.setAttribute('y1', '5')
    rightLeg.setAttribute('x2', '10')
    rightLeg.setAttribute('y2', '45')
    rightLeg.setAttribute('stroke', '#3ddbd9')
    rightLeg.setAttribute('stroke-width', '2')
    attackerGroup.appendChild(rightLeg)

    // Scanning reticle
    const reticle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    reticle.setAttribute('cx', '100')
    reticle.setAttribute('cy', '-100')
    reticle.setAttribute('r', '30')
    reticle.setAttribute('fill', 'none')
    reticle.setAttribute('stroke', '#3ddbd9')
    reticle.setAttribute('stroke-width', '1.5')
    reticle.setAttribute('opacity', '0.6')
    attackerGroup.appendChild(reticle)

    svg.appendChild(attackerGroup)

    // SERVER FORTRESS (center)
    // Create a tower-like structure of stacked servers
    const fortressGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    fortressGroup.id = 'fortress-group'
    fortressGroup.setAttribute('transform', 'translate(700, 250)')

    const serverWidth = 80
    const serverHeight = 40
    const spacing = 8

    // Draw 5 stacked servers
    const servers = []
    for (let i = 0; i < 5; i++) {
      const serverGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      serverGroup.id = `server-${i}`
      serverGroup.setAttribute('transform', `translate(0, ${i * (serverHeight + spacing)})`)

      const serverBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      serverBox.setAttribute('x', `-${serverWidth / 2}`)
      serverBox.setAttribute('y', '0')
      serverBox.setAttribute('width', String(serverWidth))
      serverBox.setAttribute('height', String(serverHeight))
      serverBox.setAttribute('fill', 'rgba(61, 219, 217, 0.08)')
      serverBox.setAttribute('stroke', '#3ddbd9')
      serverBox.setAttribute('stroke-width', '1.5')
      serverBox.setAttribute('rx', '3')
      serverGroup.appendChild(serverBox)

      // Server details (lights/ports)
      for (let j = 0; j < 3; j++) {
        const light = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        light.setAttribute('cx', String(-25 + j * 25))
        light.setAttribute('cy', String(serverHeight / 2))
        light.setAttribute('r', '3')
        light.setAttribute('fill', '#3ddbd9')
        light.setAttribute('opacity', '0.4')
        serverGroup.appendChild(light)
      }

      fortressGroup.appendChild(serverGroup)
      servers.push(serverGroup)
    }

    svg.appendChild(fortressGroup)

    // DATA EXFILTRATION STREAMS (right side)
    // Create flowing data beams from fortress to external location
    const exfilGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    exfilGroup.id = 'exfil-group'

    // Multiple data streams flowing right
    const streams = [
      { y: 300, delay: 0 },
      { y: 400, delay: 0.3 },
      { y: 500, delay: 0.6 }
    ]

    streams.forEach((stream, idx) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.id = `exfil-stream-${idx}`
      path.setAttribute('d', `M 800 ${stream.y} Q 950 ${stream.y - 50} 1100 ${stream.y}`)
      path.setAttribute('fill', 'none')
      path.setAttribute('stroke', '#b57bd3')
      path.setAttribute('stroke-width', '2')
      path.setAttribute('opacity', '0.6')
      exfilGroup.appendChild(path)
    })

    // Exfil destination (data collector)
    const destination = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    destination.setAttribute('cx', '1150')
    destination.setAttribute('cy', '400')
    destination.setAttribute('r', '20')
    destination.setAttribute('fill', 'none')
    destination.setAttribute('stroke', '#b57bd3')
    destination.setAttribute('stroke-width', '2')
    exfilGroup.appendChild(destination)

    svg.appendChild(exfilGroup)

    // ======== ANIMATIONS ========

    // Attacker scanning animation - cinematic entrance
    const attackerTl = gsap.timeline()
    attackerTl.from('#attacker-group',
      { opacity: 0, scale: 0.8, duration: 0.8, ease: 'back.out' },
      0
    )
    attackerTl.to('#attacker-group',
      { opacity: 1, scale: 1, duration: 0.4, ease: 'elastic.out' },
      0.4
    )

    // Scanning reticle with enhanced pulse
    const reticleTl = gsap.timeline({ repeat: -1 })

    // Expand pulse
    reticleTl.to(reticle, {
      attr: { r: 60 },
      opacity: 0,
      duration: 1.5,
      ease: 'power1.out'
    }, 0)

    // Secondary pulse layer
    reticleTl.to(reticle, {
      attr: { r: 30 },
      opacity: 0.8,
      duration: 0.5,
      ease: 'power2.out'
    }, 0)

    // Glow effect
    reticleTl.to(reticle, {
      filter: 'drop-shadow(0 0 15px rgba(61, 219, 217, 0.8))',
      duration: 1.5,
      ease: 'sine.inOut'
    }, 0)

    // Fortress appearance with cinematic choreography
    const fortressTl = gsap.timeline({ delay: 0.3 })

    // Fade in main structure
    fortressTl.from('#fortress-group', {
      opacity: 0,
      scale: 0.85,
      duration: 0.8,
      ease: 'back.out'
    }, 0)

    // Stagger servers appearing
    servers.forEach((server, i) => {
      fortressTl.from(server, {
        opacity: 0,
        y: 20,
        duration: 0.4,
        ease: 'power2.out'
      }, 0.3 + i * 0.15)
    })

    // Add server breathing effect during idle
    servers.forEach((server, i) => {
      const breathTl = gsap.timeline({ repeat: -1 })

      // Breathe in
      breathTl.to(server, {
        scale: 1.05,
        opacity: 1,
        duration: 1.5,
        ease: 'sine.inOut'
      }, i * 0.3)

      // Breathe out
      breathTl.to(server, {
        scale: 1,
        opacity: 0.8,
        duration: 1.5,
        ease: 'sine.inOut'
      })
    })

    // Servers glow on attack with enhanced cascade
    const attackTimeline = gsap.timeline({ repeat: -1, repeatDelay: 4 })

    // Initial pulse before attack
    attackTimeline.call(() => {
      if (pulseSystemRef.current) {
        pulseSystemRef.current.emitPulse(0.8, '#ff3d5a')
      }
    }, undefined, 0.5)

    // Cascade compromise across servers
    servers.forEach((server, idx) => {
      const serverBox = server.querySelector('rect')

      // Compromise effect
      attackTimeline.to(serverBox, {
        fill: 'rgba(255, 61, 90, 0.2)',
        stroke: '#ff3d5a',
        filter: 'drop-shadow(0 0 20px rgba(255, 61, 90, 0.8))',
        duration: 0.4
      }, idx * 0.2)

      // Glitch effect on compromise
      attackTimeline.to(serverBox, {
        x: (Math.random() - 0.5) * 8,
        y: (Math.random() - 0.5) * 8,
        duration: 0.1,
        repeat: 2,
        yoyo: true
      }, idx * 0.2)
    })

    // Reset servers with smooth transition
    attackTimeline.to(servers.map(s => s.querySelector('rect')), {
      fill: 'rgba(61, 219, 217, 0.08)',
      stroke: '#3ddbd9',
      filter: 'drop-shadow(0 0 5px rgba(61, 219, 217, 0.4))',
      duration: 0.3
    }, '+=0.5')

    // Initialize environmental effects
    if (containerRef.current) {
      pulseSystemRef.current = new CyberPulseSystem(containerRef.current, {
        x: 700,
        y: 250,
      })
    }

    // Exfiltration data flow animation
    const exfilPaths: SVGPathElement[] = []
    streams.forEach((_, idx) => {
      const pathElement = document.getElementById(`exfil-stream-${idx}`)
      if (pathElement && pathElement instanceof SVGPathElement) {
        exfilPaths.push(pathElement)
      }
    })

    if (exfilPaths.length > 0) {
      const exfilEffect = new ExfiltrationEffect(exfilPaths)
      exfilEffect.animateFlow(2, -1)
    }

    // Destination pulse with enhanced choreography
    const destTl = gsap.timeline({ repeat: -1, repeatDelay: 3.5, delay: 1.5 })

    // Pulse outward
    destTl.to(destination, {
      attr: { r: 35 },
      opacity: 0.8,
      filter: 'drop-shadow(0 0 25px rgba(181, 123, 211, 0.8))',
      duration: 0.75,
      ease: 'sine.inOut'
    }, 0)

    // Secondary glow layer
    destTl.to(destination, {
      opacity: 0.8,
      filter: 'drop-shadow(0 0 15px rgba(181, 123, 211, 0.5))',
      duration: 0.75,
      ease: 'sine.inOut'
    }, 0)

    // Contract back
    destTl.to(destination, {
      attr: { r: 20 },
      opacity: 0.4,
      filter: 'drop-shadow(0 0 5px rgba(181, 123, 211, 0.3))',
      duration: 0.75,
      ease: 'sine.inOut'
    })

  }, [isLoaded])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <motion.svg
        ref={svgRef}
        width="1300"
        height="800"
        viewBox="0 0 1300 800"
        style={{
          maxWidth: '95vw',
          maxHeight: '55vh',
          filter: 'drop-shadow(0 0 20px rgba(61, 219, 217, 0.15))'
        }}
      >
        {/* Background grid (subtle) */}
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(61, 219, 217, 0.05)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="1300" height="800" fill="url(#grid)" />
      </motion.svg>
    </div>
  )
}
