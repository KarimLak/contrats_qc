"use client"
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react"

interface ToastOptions {
  actionLabel?: string
  onAction?: () => void
  durationMs?: number
}

interface ToastState {
  id: number
  message: string
  actionLabel?: string
  onAction?: () => void
}

interface ToastContextType {
  showToast: (message: string, options?: ToastOptions) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

const DEFAULT_DURATION = 5000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nextId = useRef(0)

  const showToast = useCallback((message: string, options: ToastOptions = {}) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const id = ++nextId.current
    setToast({ id, message, actionLabel: options.actionLabel, onAction: options.onAction })
    timerRef.current = setTimeout(() => {
      setToast(t => (t?.id === id ? null : t))
    }, options.durationMs ?? DEFAULT_DURATION)
  }, [])

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast(null)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div style={{
          position: "fixed", left: "50%", bottom: 28, transform: "translateX(-50%)",
          zIndex: 200, display: "flex", alignItems: "center", gap: 14,
          background: "#1b2a4a", color: "white", borderRadius: 12,
          padding: "13px 16px 13px 20px", boxShadow: "0 10px 30px rgba(27,42,74,0.35)",
          fontSize: 13.5, fontFamily: "'Outfit', system-ui, sans-serif",
          maxWidth: "min(520px, 90vw)",
        }}>
          <span style={{ lineHeight: 1.4 }}>{toast.message}</span>
          {toast.actionLabel && (
            <button
              type="button"
              onClick={() => { toast.onAction?.(); dismiss() }}
              style={{
                flexShrink: 0, background: "none", border: "none", color: "#5FE0D6",
                fontWeight: 700, fontSize: 13.5, cursor: "pointer", padding: 0,
                fontFamily: "inherit",
              }}
            >
              {toast.actionLabel}
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Fermer"
            style={{
              flexShrink: 0, background: "none", border: "none", color: "rgba(255,255,255,0.4)",
              fontSize: 16, lineHeight: 1, cursor: "pointer", padding: 0,
            }}
          >
            ×
          </button>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>")
  return ctx
}
