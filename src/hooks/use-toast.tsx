"use client"

import * as React from "react"

type ToastVariant = "default" | "destructive"

interface ToastProps {
  title?: string
  description?: string
  variant?: ToastVariant
}

interface Toast extends ToastProps {
  id: string
}

interface ToastContextType {
  toast: (props: ToastProps) => void
  toasts: Toast[]
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

let toastCount = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const toast = React.useCallback((props: ToastProps) => {
    const id = `toast-${toastCount++}-${Date.now()}`
    const newToast: Toast = {
      ...props,
      id,
    }
    
    setToasts((prev) => [...prev, newToast])
    
    // Auto-remove toast after 5 seconds
    setTimeout(() => {
      removeToast(id)
    }, 5000)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ toast, toasts, removeToast }}>
      {children}
      <ToastViewport toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

function ToastViewport({ 
  toasts, 
  removeToast 
}: { 
  toasts: Toast[]
  removeToast: (id: string) => void 
}) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-0 right-0 z-50 m-4 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-lg border p-4 shadow-lg ${
            toast.variant === "destructive"
              ? "bg-red-50 border-red-200 text-red-900"
              : "bg-white border-gray-200"
          }`}
        >
          {toast.title && (
            <div className="font-semibold mb-1">{toast.title}</div>
          )}
          {toast.description && (
            <div className="text-sm opacity-90">{toast.description}</div>
          )}
          <button
            onClick={() => removeToast(toast.id)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    // Return a fallback that just console logs if provider is missing
    return {
      toast: (props: ToastProps) => {
        console.log("Toast:", props)
      },
    }
  }
  return { toast: context.toast }
}
