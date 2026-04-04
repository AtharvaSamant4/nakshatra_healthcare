"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { RotateCcw, Trophy, Clock } from "lucide-react"

const SYMBOLS = ["A", "B", "C", "D", "E", "F", "G", "H"]

interface CardData {
  id: number
  symbol: string
  isFlipped: boolean
  isMatched: boolean
}

interface MemoryGameProps {
  onComplete: (score: number, time: number, moves: number) => void
}

export function MemoryGame({ onComplete }: MemoryGameProps) {
  const [cards, setCards] = useState<CardData[]>([])
  const [flippedCards, setFlippedCards] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [time, setTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const initializeGame = () => {
    const shuffledCards = [...SYMBOLS, ...SYMBOLS]
      .sort(() => Math.random() - 0.5)
      .map((symbol, index) => ({
        id: index,
        symbol,
        isFlipped: false,
        isMatched: false,
      }))
    setCards(shuffledCards)
    setFlippedCards([])
    setMoves(0)
    setTime(0)
    setIsPlaying(false)
    setIsComplete(false)
  }

  useEffect(() => {
    initializeGame()
  }, [])

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isPlaying && !isComplete) {
      timer = setInterval(() => {
        setTime((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [isPlaying, isComplete])

  useEffect(() => {
    if (cards.length > 0 && cards.every((card) => card.isMatched)) {
      setIsComplete(true)
      setIsPlaying(false)
      const score = Math.max(1000 - moves * 10 - time * 2, 100)
      onComplete(score, time, moves)
    }
  }, [cards, moves, time, onComplete])

  const handleCardClick = (id: number) => {
    if (!isPlaying) setIsPlaying(true)

    const card = cards.find((c) => c.id === id)
    if (!card || card.isFlipped || card.isMatched || flippedCards.length === 2) return

    const newFlipped = [...flippedCards, id]
    setFlippedCards(newFlipped)
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isFlipped: true } : c))
    )

    if (newFlipped.length === 2) {
      setMoves((prev) => prev + 1)
      const [first, second] = newFlipped
      const firstCard = cards.find((c) => c.id === first)
      const secondCard = cards.find((c) => c.id === second)

      if (firstCard && secondCard && firstCard.symbol === secondCard.symbol) {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === first || c.id === second ? { ...c, isMatched: true } : c
            )
          )
          setFlippedCards([])
        }, 500)
      } else {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === first || c.id === second ? { ...c, isFlipped: false } : c
            )
          )
          setFlippedCards([])
        }, 1000)
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Memory Match</CardTitle>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(time)}
            </Badge>
            <Badge variant="secondary">Moves: {moves}</Badge>
            <Button variant="ghost" size="icon" onClick={initializeGame}>
              <RotateCcw className="h-4 w-4" />
              <span className="sr-only">Reset game</span>
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Match all pairs of cards to complete the game
        </p>
      </CardHeader>
      <CardContent>
        {isComplete ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
              <Trophy className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Congratulations!</h3>
            <p className="mt-2 text-muted-foreground">
              Completed in {formatTime(time)} with {moves} moves
            </p>
            <Button onClick={initializeGame} className="mt-4">
              Play Again
            </Button>
          </div>
        ) : (
          <div className="mx-auto max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
            <div className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-4">
              {cards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => handleCardClick(card.id)}
                  disabled={card.isFlipped || card.isMatched}
                  className={cn(
                    "aspect-square rounded-xl text-lg sm:text-xl md:text-2xl font-bold transition-all duration-300",
                    card.isFlipped || card.isMatched
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted hover:bg-muted/80 shadow-sm",
                    card.isMatched && "bg-accent text-accent-foreground"
                  )}
                >
                  {card.isFlipped || card.isMatched ? card.symbol : "?"}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
