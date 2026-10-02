import { useMemo } from 'react'

const COLORS = ['#2f6bff', '#46a6ff', '#ffc861', '#5ee2a0', '#ff7a93', '#ffffff']

// A short, light confetti burst. Re-mount it (change its key) to play it again.
export default function Confetti({ seed }) {
  const pieces = useMemo(() => {
    // Deterministic pseudo-random number in [0, 1) for piece i, property k.
    const random = (i, k) => {
      const x = Math.sin((seed % 100000) * 0.013 + i * 12.9898 + k * 78.233) * 43758.5453
      return x - Math.floor(x)
    }
    return Array.from({ length: 28 }, (_, i) => ({
      id: i,
      left: `${random(i, 1) * 100}%`,
      color: COLORS[i % COLORS.length],
      delay: `${random(i, 2) * 0.25}s`,
      drift: `${(random(i, 3) - 0.5) * 160}px`,
      spin: `${(random(i, 4) - 0.5) * 900}deg`,
      size: `${6 + random(i, 5) * 6}px`,
    }))
  }, [seed])

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            left: p.left,
            background: p.color,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            '--drift': p.drift,
            '--spin': p.spin,
          }}
        />
      ))}
    </div>
  )
}
