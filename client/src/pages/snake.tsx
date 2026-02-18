import { useEffect, useMemo, useRef, useState } from "react";
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

const EAT_LINES = [
  "Wow. You found food. Nobel committee is on standby.",
  "Ate one. Still not enough to impress anyone.",
  "Great, the snake survives your management for one more bite.",
  "Calories acquired. Strategy still questionable.",
  "Nice snack. Try not to steer into your own bad choices next.",
];

const WALL_DEATH_LINES = [
  "You hit a wall. A literal one. Poetic.",
  "Bold tactic: negotiate with concrete using your face.",
  "Wall 1, You 0. Classic scoreboard.",
  "Incredible. Defeated by geometry.",
];

const SELF_DEATH_LINES = [
  "You outplayed yourself. Efficient.",
  "That was a clean self-own.",
  "You collided with your own decisions.",
  "Snake yoga gone wrong. Very wrong.",
];

const PAUSE_LINES = [
  "Pause accepted. Tactical thinking or panic buffering?",
  "Break time. The snake needed a better manager anyway.",
  "Paused. Collecting confidence from external sources.",
];

const RESUME_LINES = [
  "Back already? Ambitious.",
  "Resume pressed. Consequences resumed too.",
  "Let us continue this questionable journey.",
];

const RESTART_LINES = [
  "Fresh start. Same driver though.",
  "Restarted. Pretending the previous round was a simulation.",
  "New run, new excuses.",
];

const EDGE_LINES = [
  "You are hugging the wall like it owes you rent.",
  "Edge detected. Drama detected.",
  "So close to disaster. You must enjoy suspense.",
];

const WIN_LINES = [
  "You filled the board. Miracles happen.",
  "Perfect game. I am legally required to be impressed.",
  "You actually mastered it. Annoyingly good.",
];

function randomLine(lines: string[]): string {
  return lines[Math.floor(Math.random() * lines.length)];
}

function keyForCell(x: number, y: number): string {
  return `${x}:${y}`;
}

export default function SnakePage() {
  const isMobile = useIsMobile();
  const [state, setState] = useState<SnakeGameState>(() => createInitialState());
  const [queuedDirection, setQueuedDirection] = useState<Direction | null>(null);
  const [commentary, setCommentary] = useState("Welcome to Snake. Try to survive your own steering.");
  const [highScore, setHighScore] = useState(0);
  const previousStateRef = useRef<SnakeGameState | null>(null);

  const tickMs = Math.max(80, 145 - state.score * 3);

  useEffect(() => {
    const persisted = window.localStorage.getItem("snake-high-score");
    if (!persisted) {
      return;
    }

    const parsed = Number(persisted);
    if (!Number.isNaN(parsed)) {
      setHighScore(parsed);
    }
  }, []);

  useEffect(() => {
    if (state.score <= highScore) {
      return;
    }

    setHighScore(state.score);
    window.localStorage.setItem("snake-high-score", String(state.score));
  }, [highScore, state.score]);

  useEffect(() => {
    if (state.gameOver || state.paused) {
      return;
    }

    const timer = window.setInterval(() => {
      setState((current) => stepGame(current, queuedDirection));
      setQueuedDirection(null);
    }, tickMs);

    return () => window.clearInterval(timer);
  }, [queuedDirection, state.gameOver, state.paused, tickMs]);

  useEffect(() => {
    const previous = previousStateRef.current;
    previousStateRef.current = state;

    if (!previous) {
      return;
    }

    if (state.lastEvent === "eat" && state.score > previous.score) {
      setCommentary(randomLine(EAT_LINES));
      return;
    }

    if (state.lastEvent === "game-over") {
      setCommentary(
        state.deathReason === "self"
          ? randomLine(SELF_DEATH_LINES)
          : randomLine(WALL_DEATH_LINES),
      );
      return;
    }

    if (state.lastEvent === "win") {
      setCommentary(randomLine(WIN_LINES));
      return;
    }

    if (
      state.lastEvent === "move" &&
      state.moves % 12 === 0 &&
      !state.gameOver &&
      !state.paused
    ) {
      const head = state.snake[0];
      const nearEdge =
        head.x <= 1 ||
        head.y <= 1 ||
        head.x >= state.gridSize - 2 ||
        head.y >= state.gridSize - 2;

      if (nearEdge) {
        setCommentary(randomLine(EDGE_LINES));
      }
    }
  }, [state]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const lowered = event.key.toLowerCase();

      if (event.key === " " || lowered === "p") {
        event.preventDefault();
        setState((current) => {
          const next = togglePause(current);
          if (next.paused !== current.paused) {
            setCommentary(next.paused ? randomLine(PAUSE_LINES) : randomLine(RESUME_LINES));
          }
          return next;
        });
        return;
      }

      if (lowered === "r") {
        event.preventDefault();
        setState(createInitialState());
        setQueuedDirection(null);
        setCommentary(randomLine(RESTART_LINES));
        return;
      }

      const direction = KEY_TO_DIRECTION[event.key] || KEY_TO_DIRECTION[lowered];
      if (direction) {
        event.preventDefault();
        setQueuedDirection(direction);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const snakeIndexes = useMemo(() => {
    const map = new Map<string, number>();
    state.snake.forEach((segment, index) => {
      map.set(keyForCell(segment.x, segment.y), index);
    });
    return map;
  }, [state.snake]);

  const statusLabel = state.gameOver ? "Game Over" : state.paused ? "Paused" : "Alive";

  const onControl = (direction: Direction) => setQueuedDirection(direction);

  const handlePauseClick = () => {
    setState((current) => {
      const next = togglePause(current);
      if (next.paused !== current.paused) {
        setCommentary(next.paused ? randomLine(PAUSE_LINES) : randomLine(RESUME_LINES));
      }
      return next;
    });
  };

  const handleRestartClick = () => {
    setState(createInitialState());
    setQueuedDirection(null);
    setCommentary(randomLine(RESTART_LINES));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 lg:p-6 space-y-4">
        <div className="rounded-xl border p-4 bg-gradient-to-r from-cyan-500/15 via-emerald-500/10 to-amber-400/10">
          <h1 className="text-2xl font-semibold tracking-tight">Snake That Bites (With Sarcasm)</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Controls: Arrow Keys or WASD. Pause with P/Space. Restart with R.
          </p>
        </div>

        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
              <span>Silent. Colorful. Mildly disrespectful.</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Score: {state.score}</Badge>
                <Badge variant="secondary">Best: {highScore}</Badge>
                <Badge variant={state.gameOver ? "destructive" : "secondary"}>{statusLabel}</Badge>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border/70 p-3 bg-gradient-to-b from-background to-muted/20 w-fit mx-auto">
              <div
                className="grid gap-[2px] bg-slate-900/30 p-2 rounded-md"
                style={{ gridTemplateColumns: `repeat(${state.gridSize}, minmax(0, 1fr))` }}
                data-testid="snake-grid"
              >
                {Array.from({ length: state.gridSize * state.gridSize }).map((_, index) => {
                  const x = index % state.gridSize;
                  const y = Math.floor(index / state.gridSize);
                  const key = keyForCell(x, y);
                  const snakeIndex = snakeIndexes.get(key);
                  const isFood = state.food.x === x && state.food.y === y;

                  let className = "h-4 w-4 rounded-[2px] bg-slate-100/70 dark:bg-slate-800/60";

                  if (isFood) {
                    className = "h-4 w-4 rounded-[3px] bg-rose-500 shadow-[0_0_0_1px_rgba(255,255,255,0.2)]";
                  } else if (snakeIndex !== undefined) {
                    className =
                      snakeIndex === 0
                        ? "h-4 w-4 rounded-[3px] bg-emerald-500"
                        : "h-4 w-4 rounded-[2px] bg-cyan-500";
                  }

                  return <div key={key} className={className} data-testid={`snake-cell-${x}-${y}`} />;
                })}
              </div>
            </div>

            <div className="rounded-md border bg-muted/20 px-3 py-2">
              <p className="text-sm font-medium">{commentary}</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handlePauseClick}>
                {state.paused ? "Resume" : "Pause"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleRestartClick}>
                Restart
              </Button>
              <span className="text-xs text-muted-foreground">Speed: {tickMs}ms per step</span>
            </div>

            {isMobile && (
              <div className="space-y-2" data-testid="snake-mobile-controls">
                <p className="text-xs text-muted-foreground">Touch controls for thumbs and chaos</p>
                <div className="flex justify-center">
                  <Button size="sm" variant="outline" onClick={() => onControl("up")}>
                    Up
                  </Button>
                </div>
                <div className="flex justify-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => onControl("left")}>
                    Left
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onControl("down")}>
                    Down
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onControl("right")}>
                    Right
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
