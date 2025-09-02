import * as React from "react"
import { cn } from "@/lib/utils"
import { useInView, type InViewOptions } from "@/hooks/use-in-view"

type VariantName =
  | "fade"
  | "fade-up"
  | "fade-down"
  | "fade-left"
  | "fade-right"
  | "zoom-in"
  | "zoom-out"

export type ScrollRevealProps = {
  asChild?: boolean
  children: React.ReactNode
  /** Visual animation variant */
  variant?: VariantName
  /** Delay in ms before animating after entering */
  delayMs?: number
  /** Duration in ms for the transition */
  durationMs?: number
  /** Distance in px for directional variants */
  distancePx?: number
  /** Intersection options */
  inViewOptions?: InViewOptions
  /** Optional additional classes */
  className?: string
}

const baseHidden = "opacity-0 will-change-transform"

function getHiddenTransform(variant: VariantName, distancePx: number) {
  switch (variant) {
    case "fade-up":
      return `translate3d(0, ${distancePx}px, 0)`
    case "fade-down":
      return `translate3d(0, -${distancePx}px, 0)`
    case "fade-left":
      return `translate3d(${distancePx}px, 0, 0)`
    case "fade-right":
      return `translate3d(-${distancePx}px, 0, 0)`
    case "zoom-in":
      return "scale(0.95)"
    case "zoom-out":
      return "scale(1.05)"
    default:
      return "none"
  }
}

export function ScrollReveal({
  asChild,
  children,
  variant = "fade-up",
  delayMs = 0,
  durationMs = 500,
  distancePx = 16,
  inViewOptions,
  className,
}: ScrollRevealProps) {
  const { ref, isInView } = useInView(inViewOptions)
  const Comp: any = asChild ? React.Fragment : "div"

  const hiddenTransform = getHiddenTransform(variant, distancePx)
  const style: React.CSSProperties = isInView
    ? {
        transform: "none",
        opacity: 1,
        transition: `transform ${durationMs}ms cubic-bezier(0.22,1,0.36,1) ${delayMs}ms, opacity ${durationMs}ms ease-out ${delayMs}ms`,
      }
    : {
        transform: hiddenTransform,
        opacity: 0,
      }

  if (asChild) {
    return React.cloneElement(children as any, {
      ref,
      className: cn(baseHidden, (children as any)?.props?.className, className),
      style: { ...(children as any)?.props?.style, ...style },
    })
  }

  return (
    <Comp ref={ref} className={cn(baseHidden, className)} style={style}>
      {children}
    </Comp>
  )
}

export type StaggerProps = {
  children: React.ReactNode
  /** Base delay between children in ms */
  intervalMs?: number
  /** Scroll options applied to the group container */
  inViewOptions?: InViewOptions
  /** Variant applied to children */
  variant?: VariantName
  /** Duration for each child */
  durationMs?: number
  /** Distance in px for child directional offset */
  distancePx?: number
  className?: string
}

export function ScrollStagger({
  children,
  intervalMs = 60,
  inViewOptions,
  variant = "fade-up",
  durationMs = 450,
  distancePx = 14,
  className,
}: StaggerProps) {
  const { ref, isInView } = useInView(inViewOptions)
  const childArray = React.Children.toArray(children)

  return (
    <div ref={ref as any} className={cn(className)}>
      {childArray.map((child, idx) => (
        <ScrollReveal
          key={idx}
          asChild
          variant={variant}
          delayMs={isInView ? idx * intervalMs : 0}
          durationMs={durationMs}
          distancePx={distancePx}
        >
          {child as any}
        </ScrollReveal>
      ))}
    </div>
  )
}

