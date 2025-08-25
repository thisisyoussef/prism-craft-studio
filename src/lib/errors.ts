import type { ZodError } from 'zod'

// Join an array of optional strings into a single newline-delimited message
export function joinMessages(list: Array<string | null | undefined>): string {
  return list.filter(Boolean).join('\n')
}

// Extract a concise message string from a ZodError
export function zodErrorMessage(error: ZodError): string {
  try {
    return (error?.issues || []).map((i) => i.message).filter(Boolean).join('\n') || 'Please fix the highlighted fields'
  } catch {
    return 'Please fix the highlighted fields'
  }
}

// Normalize server error messages while keeping UX-friendly fallback
export function serverErrorMessage(error: any, fallback: string): string {
  try {
    const msg = typeof error?.message === 'string' ? error.message.trim() : ''
    // Avoid leaking overly technical or long messages
    if (!msg) return fallback
    if (msg.length > 160) return fallback
    return msg
  } catch {
    return fallback
  }
}
