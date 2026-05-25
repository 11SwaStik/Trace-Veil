import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'

interface ThreeDVisualizationProps {
  isLoaded: boolean
}

export default function ThreeDVisualization({ isLoaded }: ThreeDVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || !isLoaded) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x060810)
    scene.fog = new THREE.Fog(0x060810, 100, 150)

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 8, 25)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    containerRef.current.appendChild(renderer.domElement)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    const pointLight = new THREE.PointLight(0x00e5cc, 1, 100)
    pointLight.position.set(10, 15, 15)
    pointLight.castShadow = true
    pointLight.shadow.mapSize.width = 2048
    pointLight.shadow.mapSize.height = 2048
    scene.add(pointLight)

    const redLight = new THREE.PointLight(0xff3d5a, 0.5, 80)
    redLight.position.set(-15, 10, 10)
    scene.add(redLight)

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(100, 100)
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0c10,
      metalness: 0.3,
      roughness: 0.7
    })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -8
    ground.receiveShadow = true
    scene.add(ground)

    // Attacker node (left side)
    const attackerGeometry = new THREE.OctahedronGeometry(2, 2)
    const attackerMaterial = new THREE.MeshPhongMaterial({
      color: 0xa855f7,
      emissive: 0xa855f7,
      emissiveIntensity: 0.6,
      shininess: 100
    })
    const attacker = new THREE.Mesh(attackerGeometry, attackerMaterial)
    attacker.position.set(-20, 2, 0)
    attacker.castShadow = true
    attacker.receiveShadow = true
    scene.add(attacker)

    // Attacker glow
    const glowGeometry = new THREE.OctahedronGeometry(2.5, 2)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.2
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    glow.position.copy(attacker.position)
    glow.scale.set(1, 1, 1)
    scene.add(glow)

    // Server boxes (right side, 4 boxes in 2x2 grid)
    const servers: THREE.Mesh[] = []
    const serverPositions = [
      { x: 8, z: -6 },
      { x: 8, z: 6 },
      { x: 20, z: -6 },
      { x: 20, z: 6 }
    ]

    serverPositions.forEach((pos, idx) => {
      const serverGeometry = new THREE.BoxGeometry(3, 4, 3)
      const serverMaterial = new THREE.MeshPhongMaterial({
        color: 0x00e5cc,
        emissive: 0x003d4d,
        emissiveIntensity: 0.3,
        shininess: 80
      })
      const server = new THREE.Mesh(serverGeometry, serverMaterial)
      server.position.set(pos.x, 2, pos.z)
      server.castShadow = true
      server.receiveShadow = true
      server.userData = { originalColor: 0x00e5cc, index: idx }
      scene.add(server)
      servers.push(server)
    })

    // Attack beams (lines connecting attacker to servers)
    const beams: THREE.Line[] = []
    servers.forEach((server) => {
      const geometry = new THREE.BufferGeometry()
      const positions = new Float32Array([
        attacker.position.x, attacker.position.y, attacker.position.z,
        server.position.x, server.position.y, server.position.z
      ])
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

      const material = new THREE.LineBasicMaterial({
        color: 0xff3d5a,
        linewidth: 2,
        transparent: true,
        opacity: 0
      })
      const beam = new THREE.Line(geometry, material)
      scene.add(beam)
      beams.push(beam)
    })

    // Animation loop
    let animationFrameId: number
    const clock = new THREE.Clock()

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      const elapsedTime = clock.getElapsedTime()

      // Rotate attacker
      attacker.rotation.x += 0.005
      attacker.rotation.y += 0.008
      glow.rotation.x += 0.003
      glow.rotation.y += 0.006

      // Pulse attacker glow
      glow.scale.set(
        1 + Math.sin(elapsedTime * 2) * 0.1,
        1 + Math.sin(elapsedTime * 2) * 0.1,
        1 + Math.sin(elapsedTime * 2) * 0.1
      )

      // Servers rotation (subtle)
      servers.forEach((server, idx) => {
        server.rotation.y += 0.002
        server.position.y = 2 + Math.sin(elapsedTime + idx) * 0.3
      })

      // Beams animation - pulsing opacity
      beams.forEach((beam, idx) => {
        const beamOpacity = Math.sin(elapsedTime * 1.5 + idx * 0.5) * 0.5 + 0.5
        ;(beam.material as THREE.LineBasicMaterial).opacity = beamOpacity * 0.6
      })

      // Camera slight rotation for cinematic feel
      camera.position.x = Math.sin(elapsedTime * 0.1) * 5
      camera.position.z = 25 + Math.cos(elapsedTime * 0.08) * 3
      camera.lookAt(0, 2, 0)

      renderer.render(scene, camera)
    }

    // Start animation sequence
    const startAttackSequence = () => {
      const timeline = gsap.timeline()

      // Fade in beams sequentially
      timeline.to(beams.map(b => b.material), {
        opacity: 0.6,
        duration: 0.5,
        stagger: 0.15
      }, 0)

      // Server compromise cascade
      timeline.to(servers.map(s => (s.material as THREE.MeshPhongMaterial)), {
        emissive: 0xff3d5a,
        emissiveIntensity: 0.8,
        duration: 0.6,
        stagger: 0.2
      }, 0.3)

      // Reset colors
      timeline.to(servers.map(s => (s.material as THREE.MeshPhongMaterial)), {
        emissive: 0x003d4d,
        emissiveIntensity: 0.3,
        duration: 0.4,
        stagger: 0.15,
        delay: 2
      })

      // Repeat attack sequence
      timeline.call(() => {
        startAttackSequence()
      }, undefined, '+=3')
    }

    if (isLoaded) {
      setTimeout(() => {
        startAttackSequence()
        animate()
      }, 500)
    } else {
      animate()
    }

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current?.removeChild(renderer.domElement)
      }
      groundGeometry.dispose()
      attackerGeometry.dispose()
      glowGeometry.dispose()
      attackerMaterial.dispose()
      groundMaterial.dispose()
      glowMaterial.dispose()
      servers.forEach(s => {
        s.geometry.dispose()
        ;(s.material as THREE.Material).dispose()
      })
      beams.forEach(b => {
        b.geometry.dispose()
        ;(b.material as THREE.Material).dispose()
      })
      renderer.dispose()
    }
  }, [isLoaded])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative'
      }}
    />
  )
}
