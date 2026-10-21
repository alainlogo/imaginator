import { gsap } from 'gsap'

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const PAGE_PARTS = '.char, .page-header p, .page > section, .page > ul'

// Termine l'animation puis appelle onDone. Si elle ne va pas au bout
// (onglet en arrière-plan, rAF bloqué…), on la termine de force :
// le contenu ne doit jamais rester invisible.
function finish(anim, ms, onDone) {
  const timer = setTimeout(() => anim.progress(1), ms)
  anim.eventCallback('onComplete', () => {
    clearTimeout(timer)
    onDone()
  })
}

// Entrée d'une page : le titre se recompose lettre par lettre, puis le reste suit
export function pageEnter(el, done) {
  resetPage(el)
  if (prefersReducedMotion()) return done()
  const tl = gsap.timeline()
  tl.from(el.querySelectorAll('.char'), {
    yPercent: 115,
    rotateX: -90,
    opacity: 0,
    filter: 'blur(8px)',
    duration: 0.9,
    ease: 'expo.out',
    stagger: 0.018,
  })
  tl.from(
    el.querySelectorAll('.page-header p, .page > section, .page > ul'),
    { y: 28, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08 },
    '-=0.6',
  )
  finish(tl, 3000, () => {
    resetPage(el)
    done()
  })
}

export function pageLeave(el, done) {
  // done() ne doit pas être appelé de façon synchrone : en mode out-in,
  // Vue n'a pas fini de démonter la page et plante (parentNode null)
  if (prefersReducedMotion()) return setTimeout(done)
  const tween = gsap.to(el, { opacity: 0, y: -24, filter: 'blur(6px)', duration: 0.35, ease: 'power2.in' })
  finish(tween, 800, done)
}

// Retire tout style laissé par une animation (y compris interrompue)
export function resetPage(el) {
  const targets = [el, ...el.querySelectorAll(PAGE_PARTS)]
  gsap.killTweensOf(targets)
  gsap.set(targets, { clearProps: 'all' })
}

// v-pop : une image ajoutée à la liste apparaît en cascade avec ses voisines
let batch = 0
export const vPop = {
  mounted(el) {
    if (prefersReducedMotion()) return
    const delay = batch++ * 0.05
    queueMicrotask(() => (batch = 0))
    gsap.from(el, { opacity: 0, y: 18, scale: 0.96, duration: 0.6, delay, ease: 'back.out(1.6)', clearProps: 'all' })
  },
}
