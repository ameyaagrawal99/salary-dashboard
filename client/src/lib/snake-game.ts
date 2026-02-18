export type Direction = "up" | "down" | "left" | "right";

export type Cell = {
  x: number;
  y: number;
};

export type SnakeGameState = {
  gridSize: number;
  snake: Cell[];
  direction: Direction;
  food: Cell;
  score: number;
  gameOver: boolean;
  paused: boolean;
};

const INITIAL_SNAKE: Cell[] = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];

export const DEFAULT_GRID_SIZE = 20;

export function createInitialState(
  random: () => number = Math.random,
  gridSize = DEFAULT_GRID_SIZE,
): SnakeGameState {
  const snake = INITIAL_SNAKE.map((segment) => ({ ...segment }));

  return {
    gridSize,
    snake,
    direction: "right",
    food: placeFood(snake, gridSize, random),
    score: 0,
    gameOver: false,
    paused: false,
  };
}

export function isOppositeDirection(current: Direction, next: Direction): boolean {
  return (
    (current === "up" && next === "down") ||
    (current === "down" && next === "up") ||
    (current === "left" && next === "right") ||
    (current === "right" && next === "left")
  );
}

export function canTurn(current: Direction, next: Direction): boolean {
  return current !== next && !isOppositeDirection(current, next);
}

export function nextHead(head: Cell, direction: Direction): Cell {
  switch (direction) {
    case "up":
      return { x: head.x, y: head.y - 1 };
    case "down":
      return { x: head.x, y: head.y + 1 };
    case "left":
      return { x: head.x - 1, y: head.y };
    case "right":
      return { x: head.x + 1, y: head.y };
  }
}

export function isOutOfBounds(cell: Cell, gridSize: number): boolean {
  return cell.x < 0 || cell.y < 0 || cell.x >= gridSize || cell.y >= gridSize;
}

export function isOnSnake(cell: Cell, snake: Cell[]): boolean {
  return snake.some((segment) => segment.x === cell.x && segment.y === cell.y);
}

export function placeFood(
  snake: Cell[],
  gridSize: number,
  random: () => number = Math.random,
): Cell {
  const freeCells: Cell[] = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      if (!isOnSnake({ x, y }, snake)) {
        freeCells.push({ x, y });
      }
    }
  }

  if (freeCells.length === 0) {
    return { x: -1, y: -1 };
  }

  const index = Math.floor(random() * freeCells.length);
  return freeCells[index];
}

export function stepGame(
  state: SnakeGameState,
  requestedDirection: Direction | null,
  random: () => number = Math.random,
): SnakeGameState {
  if (state.gameOver || state.paused) {
    return state;
  }

  const direction =
    requestedDirection && canTurn(state.direction, requestedDirection)
      ? requestedDirection
      : state.direction;

  const head = state.snake[0];
  const candidateHead = nextHead(head, direction);
  const ateFood = candidateHead.x === state.food.x && candidateHead.y === state.food.y;
  const snakeForCollision = ateFood ? state.snake : state.snake.slice(0, -1);

  if (
    isOutOfBounds(candidateHead, state.gridSize) ||
    isOnSnake(candidateHead, snakeForCollision)
  ) {
    return {
      ...state,
      direction,
      gameOver: true,
    };
  }

  const nextSnake = [candidateHead, ...state.snake];

  if (!ateFood) {
    nextSnake.pop();
  }

  if (ateFood) {
    const nextFood = placeFood(nextSnake, state.gridSize, random);
    const noFoodSlotLeft = nextFood.x < 0 || nextFood.y < 0;

    return {
      ...state,
      snake: nextSnake,
      direction,
      food: nextFood,
      score: state.score + 1,
      gameOver: noFoodSlotLeft,
    };
  }

  return {
    ...state,
    snake: nextSnake,
    direction,
  };
}

export function togglePause(state: SnakeGameState): SnakeGameState {
  if (state.gameOver) {
    return state;
  }

  return {
    ...state,
    paused: !state.paused,
  };
}
