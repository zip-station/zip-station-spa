import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'

interface ToastProps {
  message: string
  type?: 'success' | 'error'
  onClose: () => void
  duration?: number
}

export function Toast({ message, type = 'success', onClose, duration = 4000 }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true))

    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 200) // wait for fade out
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const colors = type === 'success'
    ? 'border-green-500/50 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
    : 'border-red-500/50 bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'

  return (
    <div className={`fixed bottom-6 right-6 z-[100] transition-all duration-200 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}>
      <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg ${colors}`}>
        {type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
        <span className="text-sm font-medium">{message}</span>
        <button onClick={() => { setVisible(false); setTimeout(onClose, 200) }} className="ml-2 rounded p-0.5 hover:bg-black/10">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
