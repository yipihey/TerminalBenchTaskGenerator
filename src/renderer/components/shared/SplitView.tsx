import React, { useState, useRef, useCallback, useEffect } from 'react'

interface SplitViewProps {
  left: React.ReactNode
  right: React.ReactNode
  initialRatio?: number
  minLeftWidth?: number
  minRightWidth?: number
}

export function SplitView({
  left,
  right,
  initialRatio = 0.5,
  minLeftWidth = 200,
  minRightWidth = 200,
}: SplitViewProps) {
  const [ratio, setRatio] = useState(initialRatio)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const containerWidth = rect.width
      const x = e.clientX - rect.left

      // Clamp the ratio based on min widths
      const minRatioLeft = minLeftWidth / containerWidth
      const maxRatioLeft = 1 - minRightWidth / containerWidth
      const newRatio = Math.min(Math.max(x / containerWidth, minRatioLeft), maxRatioLeft)

      setRatio(newRatio)
    }

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [minLeftWidth, minRightWidth])

  return (
    <div ref={containerRef} className="flex h-full w-full overflow-hidden">
      <div className="h-full overflow-hidden" style={{ width: `${ratio * 100}%` }}>
        {left}
      </div>
      <div
        className="h-full w-1 shrink-0 cursor-col-resize bg-zinc-800 hover:bg-indigo-500 transition-colors duration-150"
        onMouseDown={handleMouseDown}
      />
      <div className="h-full overflow-hidden" style={{ width: `${(1 - ratio) * 100}%` }}>
        {right}
      </div>
    </div>
  )
}
