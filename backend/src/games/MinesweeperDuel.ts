import type { GamePlugin } from "./GamePlugin.js";
import type { GameMove, GameResult, GameState } from "../types/index.js";

const BOARD_SIZE = 9;
const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
const MINE_COUNT = 10;

interface MinesweeperCell {
  id: string;
  row: number;
  col: number;
  hasMine: boolean;
  adjacent: number;
  revealed: boolean;
  exploded: boolean;
  revealedBy: string | null;
}

interface MinesweeperBoard {
  size: number;
  mineCount: number;
  cells: MinesweeperCell[];
  currentPlayerId: string;
  winner: string | null;
  gameOver: boolean;
  revealedSafeCount: number;
}

function parseMove(action: string): { row: number; col: number } | null {
  const match = action.trim().match(/^(\d+)-(\d+)$/);
  if (!match) {
    return null;
  }

  const row = Number(match[1]);
  const col = Number(match[2]);
  if (Number.isNaN(row) || Number.isNaN(col) || row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    return null;
  }

  return { row, col };
}

function cellId(row: number, col: number): string {
  return `${row}-${col}`;
}

function neighborOffsets(): Array<[number, number]> {
  return [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1]
  ];
}

function createBoard(): MinesweeperBoard {
  const mineIndexSet = new Set<number>();
  while (mineIndexSet.size < MINE_COUNT) {
    mineIndexSet.add(Math.floor(Math.random() * CELL_COUNT));
  }

  const cells: MinesweeperCell[] = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const index = row * BOARD_SIZE + col;
      cells.push({
        id: cellId(row, col),
        row,
        col,
        hasMine: mineIndexSet.has(index),
        adjacent: 0,
        revealed: false,
        exploded: false,
        revealedBy: null
      });
    }
  }

  const byId = new Map<string, MinesweeperCell>(cells.map((cell) => [cell.id, cell]));
  for (const cell of cells) {
    if (cell.hasMine) {
      continue;
    }

    let count = 0;
    for (const [dr, dc] of neighborOffsets()) {
      const candidate = byId.get(cellId(cell.row + dr, cell.col + dc));
      if (candidate?.hasMine) {
        count += 1;
      }
    }
    cell.adjacent = count;
  }

  return {
    size: BOARD_SIZE,
    mineCount: MINE_COUNT,
    cells,
    currentPlayerId: "",
    winner: null,
    gameOver: false,
    revealedSafeCount: 0
  };
}

function getBoard(state: GameState): MinesweeperBoard {
  return state.board as MinesweeperBoard;
}

function ensureCurrentPlayer(state: GameState, board: MinesweeperBoard): string {
  if (!board.currentPlayerId && state.players.length > 0) {
    board.currentPlayerId = state.players[Math.floor(Math.random() * state.players.length)];
  }
  return board.currentPlayerId;
}

function getInvalidMoveReason(move: GameMove, state: GameState): string | null {
  if (state.phase !== "waiting") {
    return "GAME_ALREADY_FINISHED";
  }

  const board = getBoard(state);
  if (board.gameOver) {
    return "GAME_ALREADY_FINISHED";
  }

  const currentPlayerId = ensureCurrentPlayer(state, board);
  if (!currentPlayerId || currentPlayerId !== move.playerId) {
    return "NOT_YOUR_TURN";
  }

  const parsed = parseMove(move.action);
  if (!parsed) {
    return "INVALID_MOVE";
  }

  const target = board.cells.find((cell) => cell.row === parsed.row && cell.col === parsed.col);
  if (!target) {
    return "INVALID_MOVE";
  }

  if (target.revealed) {
    return "CELL_OCCUPIED";
  }

  return null;
}

function revealSafeArea(board: MinesweeperBoard, start: MinesweeperCell, playerId: string): number {
  const byId = new Map<string, MinesweeperCell>(board.cells.map((cell) => [cell.id, cell]));
  const queue: MinesweeperCell[] = [start];
  let revealed = 0;

  while (queue.length > 0) {
    const cell = queue.shift();
    if (!cell || cell.revealed) {
      continue;
    }

    if (cell.hasMine) {
      continue;
    }

    cell.revealed = true;
    cell.revealedBy = playerId;
    revealed += 1;

    if (cell.adjacent !== 0) {
      continue;
    }

    for (const [dr, dc] of neighborOffsets()) {
      const candidate = byId.get(cellId(cell.row + dr, cell.col + dc));
      if (!candidate || candidate.revealed || candidate.hasMine) {
        continue;
      }
      queue.push(candidate);
    }
  }

  return revealed;
}

export const MinesweeperDuel: GamePlugin = {
  id: "minesweeper-duel",
  name: "Minesweeper Duel",
  getRequiredPlayers: () => 1,
  initBoard: (): GameState => ({
    board: createBoard(),
    players: [],
    moves: {},
    phase: "waiting"
  }),
  validateMove: (move: GameMove, state: GameState): boolean => getInvalidMoveReason(move, state) === null,
  getInvalidMoveReason: (move: GameMove, state: GameState): string => getInvalidMoveReason(move, state) ?? "INVALID_MOVE",
  calculateResult: (state: GameState): GameResult => {
    const board = getBoard(state);
    ensureCurrentPlayer(state, board);

    const [playerId, action] = Object.entries(state.moves)[0] ?? [];
    if (!playerId || !action) {
      return { winner: null, isDraw: true, scores: {}, winGap: 0 };
    }

    const parsed = parseMove(action);
    if (!parsed) {
      return { winner: null, isDraw: true, scores: {}, winGap: 0 };
    }

    const target = board.cells.find((cell) => cell.row === parsed.row && cell.col === parsed.col);
    if (!target || target.revealed) {
      return { winner: null, isDraw: true, scores: {}, winGap: 0 };
    }

    if (target.hasMine) {
      target.revealed = true;
      target.exploded = true;
      target.revealedBy = playerId;
      board.gameOver = true;

      const winner = state.players.find((id) => id !== playerId) ?? null;
      board.winner = winner;
      return {
        winner,
        isDraw: false,
        scores: winner ? { [winner]: 1, [playerId]: 0 } : {},
        winGap: winner ? 1 : 0
      };
    }

    board.revealedSafeCount += revealSafeArea(board, target, playerId);
    const safeTotal = BOARD_SIZE * BOARD_SIZE - MINE_COUNT;
    if (board.revealedSafeCount >= safeTotal) {
      board.gameOver = true;
      board.winner = playerId;
      const loser = state.players.find((id) => id !== playerId) ?? "";
      return {
        winner: playerId,
        isDraw: false,
        scores: {
          [playerId]: 1,
          ...(loser ? { [loser]: 0 } : {})
        },
        winGap: 1
      };
    }

    board.currentPlayerId = state.players.find((id) => id !== playerId) ?? playerId;
    return {
      winner: null,
      isDraw: true,
      scores: {},
      winGap: 0
    };
  },
  getValidMoves: (state: GameState): string[] => {
    const board = getBoard(state);
    if (board.gameOver) {
      return [];
    }

    return board.cells.filter((cell) => !cell.revealed).map((cell) => cell.id);
  },
  toClientState: (state: GameState): GameState => {
    const board = getBoard(state);
    ensureCurrentPlayer(state, board);

    return {
      ...state,
      board: {
        size: board.size,
        mineCount: board.mineCount,
        currentPlayerId: board.currentPlayerId,
        winner: board.winner,
        gameOver: board.gameOver,
        revealedSafeCount: board.revealedSafeCount,
        cells: board.cells.map((cell) => ({
          id: cell.id,
          row: cell.row,
          col: cell.col,
          revealed: cell.revealed,
          exploded: cell.exploded,
          adjacent: cell.adjacent,
          revealedBy: cell.revealedBy,
          isMine: cell.revealed || board.gameOver ? cell.hasMine : false
        }))
      }
    };
  }
};
