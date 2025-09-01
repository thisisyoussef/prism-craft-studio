import * as React from "react"

export type InViewOptions = {
  /** Intersection ratio to consider the element visible */
  threshold?: number | number[]
  /** Root margin to start the reveal slightly before entering */
  rootMargin?: string
  /** If true, the element will only reveal once and then stop observing */
  once?: boolean
}

/**
 * Observe when an element enters the viewport.
 * Returns a ref to attach and a boolean indicating visibility.
 */
export function useInView<T extends Element = Element>(options: InViewOptions = {}) {
  const { threshold = 0.15, rootMargin = "0px 0px -40px 0px", once = true } = options
  const targetRef = React.useRef<T | null>(null)
  const [isInView, setIsInView] = React.useState(false)

  React.useEffect(() => {
    const node = targetRef.current
    if (!node || typeof IntersectionObserver === "undefined") return

    let hasRevealed = false
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const visible = entry.isIntersecting || entry.intersectionRatio > 0
          if (visible) {
            setIsInView(true)
            hasRevealed = true
            if (once) observer.unobserve(entry.target)
          } else if (!once && !hasRevealed) {
            setIsInView(false)
          }
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold, rootMargin, once])

  return { ref: targetRef, isInView }
}

