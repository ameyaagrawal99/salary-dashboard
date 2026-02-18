import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  type Direction,
  type SnakeGameState,
  createInitialState,
  stepGame,
  togglePause,
} from "@/lib/snake-game";

const TICK_MS = 140;

type CellType = "empty" | "snake" | "food";

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  a: "left",
  s: "down",
  d: "right",
};

function keyForCell(x: number, y: number): string {
  return `${x}:${y}`;
}

export default function SnakePage() {
  const isMobile = useIsMobile();
  const [state, setState] = useState<SnakeGameState>(() => createInitialState());
  const [queuedDirection, setQueuedDirection] = useState<Direction | null>(null);

  useEffect(() => {
    if (state.gameOver || state.paused) {
      return;
    }

    const timer = window.setInterval(() => {
      setState((current) => stepGame(current, queuedDirection));
      setQueuedDirection(null);
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, [queuedDirection, state.gameOver, state.paused]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === " " || event.key.toLowerCase() === "p") {
        event.preventDefault();
        setState((current) => togglePause(current));
        return;
      }

      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        setState(createInitialState());
        setQueuedDirection(null);
        return;
      }

      const direction = KEY_TO_DIRECTION[event.key] || KEY_TO_DIRECTION[event.key.toLowerCase()];
      if (direction) {
        event.preventDefault();
        setQueuedDirection(direction);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const grid = useMemo(() => {
    const snakeCells = new Set(state.snake.map((segment) => keyForCell(segment.x, segment.y)));

    const rows: CellType[][] = [];
    for (let y = 0; y < state.gridSize; y += 1) {
      const row: CellType[] = [];
      for (let x = 0; x < state.gridSize; x += 1) {
        const key = keyForCell(x, y);
        if (state.food.x === x && state.food.y === y) {
          row.push("food");
        } else if (snakeCells.has(key)) {
          row.push("snake");
        } else {
          row.push("empty");
        }
      }
      rows.push(row);
    }

    return rows;
  }, [state.food.x, state.food.y, state.gridSize, state.snake]);

  const statusLabel = state.gameOver ? "Game Over" : state.paused ? "Paused" : "Running";

  const onControl = (direction: Direction) => setQueuedDirection(direction);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight">Snake</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Arrow keys or WASD to move. P/Space to pause, R to restart.</p>
        </div>

        <Card className="max-w-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span>Classic Mode</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Score: {state.score}</Badge>
                <Badge variant={state.gameOver ? "destructive" : "secondary"}>{statusLabel}</Badge>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div
              className="grid gap-[2px] bg-border p-2 rounded-md w-fit"
              style={{ gridTemplateColumns: `repeat(${state.gridSize}, minmax(0, 1fr))` }}
              data-testid="snake-grid"
            >
              {grid.flatMap((row, y) =>
                row.map((cell, x) => {
                  const className =
                    cell === "snake"
                      ? "bg-primary"
                      : cell === "food"
                        ? "bg-destructive"
                        : "bg-muted/40";

                  return (
                    <div
                      key={keyForCell(x, y)}
                      className={`h-4 w-4 rounded-[2px] ${className}`}
                      data-testid={`snake-cell-${x}-${y}`}
                    />
                  );
                }),
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setState((current) => togglePause(current))}>
                {state.paused ? "Resume" : "Pause"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setState(createInitialState());
                  setQueuedDirection(null);
                }}
              >
                Restart
              </Button>
            </div>

            {isMobile && (
              <div className="space-y-2" data-testid="snake-mobile-controls">
                <p className="text-xs text-muted-foreground">On-screen controls</p>
                <div className="flex justify-center">
                  <Button size="sm" variant="outline" onClick={() => onControl("up")}>Up</Button>
                </div>
                <div className="flex justify-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => onControl("left")}>Left</Button>
                  <Button size="sm" variant="outline" onClick={() => onControl("down")}>Down</Button>
                  <Button size="sm" variant="outline" onClick={() => onControl("right")}>Right</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
