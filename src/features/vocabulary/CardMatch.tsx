import { useEffect, useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn, shuffle, pick } from '@/lib/utils'
import type { VocabItem } from '@/types/content'

interface Props {
  items: VocabItem[]
  pairCount?: number
  onComplete: (result: { correct: number; total: number; mistakes: number; timeSec: number; weakIds: string[] }) => void
}

type Tile =
  | { kind: 'word'; id: string; word: string; pairId: string }
  | { kind: 'meaning'; id: string; korean: string; pairId: string }

export function CardMatch({ items, pairCount = 6, onComplete }: Props) {
  const round = useMemo(() => pick(items, Math.min(pairCount, items.length)), [items, pairCount])
  const [tiles, setTiles] = useState<Tile[]>(() => buildTiles(round))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [matchedPairIds, setMatchedPairIds] = useState<Set<string>>(new Set())
  const [wrongIds, setWrongIds] = useState<Set<string>>(new Set())
  const [mistakes, setMistakes] = useState(0)
  const [weakIds, setWeakIds] = useState<Set<string>>(new Set())
  const [startedAt] = useState(() => Date.now())

  useEffect(() => {
    if (matchedPairIds.size === round.length && round.length > 0) {
      const timeSec = Math.round((Date.now() - startedAt) / 1000)
      onComplete({
        correct: round.length,
        total: round.length,
        mistakes,
        timeSec,
        weakIds: Array.from(weakIds),
      })
    }
  }, [matchedPairIds, round.length, mistakes, weakIds, startedAt, onComplete])

  const handleClick = (tile: Tile) => {
    if (matchedPairIds.has(tile.pairId) || tile.id === selectedId) return
    if (!selectedId) {
      setSelectedId(tile.id)
      setWrongIds(new Set())
      return
    }
    const prev = tiles.find((t) => t.id === selectedId)
    if (!prev) return

    if (prev.pairId === tile.pairId && prev.kind !== tile.kind) {
      // match!
      const next = new Set(matchedPairIds)
      next.add(tile.pairId)
      setMatchedPairIds(next)
      setSelectedId(null)
    } else {
      setMistakes((m) => m + 1)
      setWrongIds(new Set([prev.id, tile.id]))
      setWeakIds((s) => new Set([...s, prev.pairId, tile.pairId]))
      window.setTimeout(() => {
        setWrongIds(new Set())
        setSelectedId(null)
      }, 600)
    }
  }

  if (round.length === 0) {
    return <p className="text-center text-slate-500 dark:text-slate-400 py-8">단어 데이터가 없어요.</p>
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300 mb-1.5">
          <span>짝 맞추기 — 영어 단어와 한국어 뜻을 연결하세요</span>
          <span className="tabular-nums">
            {matchedPairIds.size}/{round.length}
          </span>
        </div>
        <ProgressBar value={matchedPairIds.size} max={round.length} color="emerald" />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {tiles.map((tile) => {
          const matched = matchedPairIds.has(tile.pairId)
          const selected = selectedId === tile.id
          const wrong = wrongIds.has(tile.id)
          return (
            <button
              key={tile.id}
              onClick={() => handleClick(tile)}
              disabled={matched}
              className={cn(
                'min-h-[78px] rounded-2xl p-3 text-sm font-medium transition-all border',
                'flex items-center justify-center text-center',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400',
                matched && 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300',
                !matched && selected && 'bg-violet-100 dark:bg-violet-900/40 border-violet-300 dark:border-violet-600 text-violet-800 dark:text-violet-200 scale-105',
                !matched && wrong && 'bg-rose-50 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 animate-shake',
                !matched && !selected && !wrong && 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 active:bg-slate-100',
                tile.kind === 'word' && 'font-semibold'
              )}
            >
              <span className={cn(tile.kind === 'word' ? 'text-base' : 'text-sm')}>
                {tile.kind === 'word' ? tile.word : tile.korean}
              </span>
            </button>
          )
        })}
      </div>

      {matchedPairIds.size === round.length && (
        <Card className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-900/10 border-emerald-200 dark:border-emerald-700 animate-pop">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold">
            <Sparkles className="h-4 w-4" />
            모두 맞췄어요!
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">실수 {mistakes}회. 잠시 후 결과 화면.</p>
        </Card>
      )}
    </div>
  )
}

function buildTiles(items: VocabItem[]): Tile[] {
  const tiles: Tile[] = []
  for (const it of items) {
    tiles.push({ kind: 'word', id: `${it.id}-w`, word: it.word, pairId: it.id })
    tiles.push({ kind: 'meaning', id: `${it.id}-m`, korean: it.korean, pairId: it.id })
  }
  return shuffle(tiles)
}
