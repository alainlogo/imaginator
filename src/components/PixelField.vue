<script>
import * as THREE from 'three'
import { gsap } from 'gsap'
import { prefersReducedMotion } from '../utils/motion'

// Un champ de pixels (sous-pixels R, V, B) qui illustre l'outil actif :
// compresser = les pixels se regroupent en blocs, convertir = les couleurs
// tournent, arrière-plan = le fond s'effondre et seul le centre reste.
const COLS = 170
const ROWS = 110
const SPACING = 0.24

const MODES = {
  compress: { uCompress: 1, uConvert: 0, uCut: 0 },
  convert: { uCompress: 0, uConvert: 1, uCut: 0 },
  background: { uCompress: 0, uConvert: 0, uCut: 1 },
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uCompress;
  uniform float uConvert;
  uniform float uCut;
  uniform float uBurst;
  uniform float uPixelRatio;
  attribute float aChannel;
  attribute float aRand;
  varying vec3 vColor;
  varying float vAlpha;

  vec3 channelColor(float c) {
    vec3 r = vec3(1.0, 0.31, 0.48);
    vec3 g = vec3(0.27, 0.94, 0.71);
    vec3 b = vec3(0.36, 0.49, 1.0);
    c = mod(c, 3.0);
    vec3 col = mix(r, g, clamp(c, 0.0, 1.0));
    col = mix(col, b, clamp(c - 1.0, 0.0, 1.0));
    return mix(col, r, clamp(c - 2.0, 0.0, 1.0));
  }

  void main() {
    vec3 p = position;

    // Compression : les points se replient sur une grille grossière
    float cell = 1.2;
    vec2 snapped = (floor(p.xy / cell) + 0.5) * cell + (vec2(aRand, fract(aRand * 7.31)) - 0.5) * 0.35;
    p.xy = mix(p.xy, snapped, uCompress);

    // Houle de fond
    p.z += sin(p.x * 0.32 + uTime * 0.55) * 0.35 + cos(p.y * 0.27 + uTime * 0.4) * 0.35;

    // Onde autour du curseur
    float d = distance(p.xy, uMouse);
    p.z += exp(-d * d * 0.12) * 1.1 * sin(d * 1.4 - uTime * 3.0);

    // Onde de choc quand des fichiers sont déposés
    p.z += uBurst * sin(d * 0.7 - (1.0 - uBurst) * 14.0) * 1.6 * exp(-d * 0.08);

    // Détourage : tout ce qui sort de l'ellipse centrale tombe
    float mask = smoothstep(4.2, 5.4, length(p.xy * vec2(0.75, 1.0)));
    p.z -= uCut * mask * (1.5 + aRand * 7.0);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (1.6 + aRand * 1.6 + uCompress * 1.4) * uPixelRatio * (16.0 / -mv.z);

    float hue = aChannel + uConvert * (uTime * 0.35 + p.x * 0.08);
    vColor = channelColor(hue);
    float fog = smoothstep(46.0, 8.0, -mv.z);
    vAlpha = fog * (1.0 - uCut * mask * 0.85) * (0.55 + aRand * 0.45);
  }
`

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Pixels carrés, bords légèrement adoucis
    vec2 q = abs(gl_PointCoord - 0.5);
    float edge = 1.0 - smoothstep(0.38, 0.5, max(q.x, q.y));
    gl_FragColor = vec4(vColor, vAlpha * edge);
  }
`

export default {
  name: 'PixelField',
  props: {
    mode: { type: String, default: 'compress' },
  },
  watch: {
    mode(value) {
      this.applyMode(value, prefersReducedMotion() ? 0 : 1.8)
    },
  },
  mounted() {
    try {
      this.setup()
    } catch {
      // Pas de WebGL : le fond CSS suffit
      this.renderer = null
    }
  },
  beforeUnmount() {
    gsap.ticker.remove(this.tick)
    window.removeEventListener('resize', this.onResize)
    window.removeEventListener('pointermove', this.onPointer)
    window.removeEventListener('imaginator:burst', this.onBurst)
    if (this.renderer) {
      this.points.geometry.dispose()
      this.points.material.dispose()
      this.renderer.dispose()
    }
  },
  methods: {
    setup() {
      const canvas = this.$refs.canvas
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
      camera.position.set(0, 0, 15)

      const count = COLS * ROWS
      const positions = new Float32Array(count * 3)
      const channels = new Float32Array(count)
      const rands = new Float32Array(count)
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const i = y * COLS + x
          positions[i * 3] = (x - COLS / 2) * SPACING
          positions[i * 3 + 1] = (y - ROWS / 2) * SPACING
          channels[i] = x % 3
          rands[i] = Math.random()
        }
      }
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute('aChannel', new THREE.BufferAttribute(channels, 1))
      geometry.setAttribute('aRand', new THREE.BufferAttribute(rands, 1))

      const uniforms = {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(999, 999) },
        uCompress: { value: 0 },
        uConvert: { value: 0 },
        uCut: { value: 0 },
        uBurst: { value: 0 },
        uPixelRatio: { value: renderer.getPixelRatio() },
      }
      const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })

      const points = new THREE.Points(geometry, material)
      points.rotation.x = -1.02
      points.position.y = -1.5
      scene.add(points)

      Object.assign(this, { renderer, scene, camera, points, uniforms })
      this.raycaster = new THREE.Raycaster()
      this.ndc = new THREE.Vector2()
      this.hit = new THREE.Vector3()
      this.plane = new THREE.Plane()
      this.tilt = { x: 0, y: 0 }
      this.reduced = prefersReducedMotion()

      this.onResize()
      this.applyMode(this.mode, 0)

      window.addEventListener('resize', this.onResize)
      window.addEventListener('pointermove', this.onPointer)
      window.addEventListener('imaginator:burst', this.onBurst)
      gsap.ticker.add(this.tick)
    },
    applyMode(name, duration) {
      if (!this.uniforms) return
      const target = MODES[name] || MODES.compress
      Object.entries(target).forEach(([key, value]) => {
        gsap.to(this.uniforms[key], { value, duration, ease: 'expo.inOut', overwrite: true })
      })
    },
    onResize() {
      const { innerWidth: w, innerHeight: h } = window
      this.renderer.setSize(w, h, false)
      this.camera.aspect = w / h
      // Sur écran étroit on recule un peu pour garder le motif lisible
      this.camera.position.z = w < 700 ? 19 : 15
      this.camera.updateProjectionMatrix()
    },
    onPointer(event) {
      this.ndc.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1)
      gsap.to(this.tilt, { x: this.ndc.x, y: this.ndc.y, duration: 1.4, ease: 'power3.out', overwrite: true })
      if (this.reduced) return

      // Point du plan survolé, en coordonnées locales du champ
      this.raycaster.setFromCamera(this.ndc, this.camera)
      const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(this.points.quaternion)
      this.plane.setFromNormalAndCoplanarPoint(normal, this.points.position)
      if (this.raycaster.ray.intersectPlane(this.plane, this.hit)) {
        this.points.worldToLocal(this.hit)
        this.uniforms.uMouse.value.set(this.hit.x, this.hit.y)
      }
    },
    onBurst() {
      if (!this.uniforms || this.reduced) return
      gsap.fromTo(this.uniforms.uBurst, { value: 1 }, { value: 0, duration: 2.2, ease: 'power2.out', overwrite: true })
    },
    tick(time) {
      if (!this.reduced) this.uniforms.uTime.value = time
      this.camera.position.x = this.tilt.x * 0.8
      this.camera.position.y = this.tilt.y * 0.5
      this.camera.lookAt(0, -1, 0)
      this.renderer.render(this.scene, this.camera)
    },
  },
}
</script>

<template>
  <div class="pixel-field" aria-hidden="true">
    <canvas ref="canvas"></canvas>
  </div>
</template>

<style scoped>
.pixel-field {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(120% 70% at 50% 110%, rgba(91, 124, 255, 0.22), transparent 60%),
    var(--bg);
}

canvas {
  /* Le haut reste calme pour que le titre et le texte se lisent */
  -webkit-mask-image: linear-gradient(to bottom, transparent 28%, #000 78%);
  mask-image: linear-gradient(to bottom, transparent 28%, #000 78%);
  display: block;
  width: 100%;
  height: 100%;
}
</style>
