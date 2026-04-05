import type { GamePlugin } from "./GamePlugin.js";
import type { GameMove, GameResult, GameState, RewardCardOption } from "../types/index.js";
import { GOMOKU_TASK_POOL_BY_CELL } from "./gomokuTaskPool.js";

const BOARD_SIZE = 15;
const WIN_LENGTH = 5;

type Stone = "black" | "white";

interface GomokuCell {
  id: string;
  row: number;
  col: number;
  stone: Stone | null;
  taskId: string;
  taskLevel: 1 | 2 | 3 | 4;
  taskTitle: string;
  taskDescription: string;
}

interface GomokuBoard {
  size: number;
  cells: GomokuCell[];
  currentPlayerId: string;
  winner: string | null;
  winningLine: string[];
}

function pickRandomPlayer(players: string[]): string {
  if (players.length === 0) {
    return "";
  }
  if (players.length === 1) {
    return players[0];
  }
  const index = Math.floor(Math.random() * players.length);
  return players[index];
}

function ensureCurrentPlayer(state: GameState, board: GomokuBoard): string {
  if (!board.currentPlayerId) {
    board.currentPlayerId = pickRandomPlayer(state.players);
  }
  return board.currentPlayerId;
}

function createBoard(): GomokuBoard {
  const cells: GomokuCell[] = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const id = `${row}-${col}`;
      const task = GOMOKU_TASK_POOL_BY_CELL.get(id);
      cells.push({
        id,
        row,
        col,
        stone: null,
        taskId: task?.id ?? "",
        taskLevel: task?.level ?? 1,
        taskTitle: task?.title ?? "占位任务",
        taskDescription: task?.description ?? "待填写任务文案"
      });
    }
  }

  return {
    size: BOARD_SIZE,
    cells,
    currentPlayerId: "",
    winner: null,
    winningLine: []
  };
}

function getBoard(state: GameState): GomokuBoard {
  return state.board as GomokuBoard;
}

function parseMove(action: string): { row: number; col: number } | null {
  const match = action.trim().match(/^(\d+)-(\d+)$/);
  if (!match) {
    return null;
  }

  const row = Number(match[1]);
  const col = Number(match[2]);
  if (Number.isNaN(row) || Number.isNaN(col)) {
    return null;
  }

  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    return null;
  }

  return { row, col };
}

function cellId(row: number, col: number): string {
  return `${row}-${col}`;
}

function toStone(playerId: string, state: GameState): Stone {
  return playerId === state.players[0] ? "black" : "white";
}

function getCurrentPlayerId(state: GameState, board: GomokuBoard): string {
  return ensureCurrentPlayer(state, board);
}

function checkWinningLine(board: GomokuBoard, row: number, col: number, stone: Stone): string[] {
  const directions: Array<[number, number]> = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1]
  ];

  const byPos = new Map<string, GomokuCell>();
  for (const cell of board.cells) {
    byPos.set(cellId(cell.row, cell.col), cell);
  }

  for (const [dr, dc] of directions) {
    const line: string[] = [cellId(row, col)];

    for (const step of [-1, 1]) {
      let r = row + dr * step;
      let c = col + dc * step;
      while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
        const cell = byPos.get(cellId(r, c));
        if (!cell || cell.stone !== stone) {
          break;
        }
        if (step === -1) {
          line.unshift(cell.id);
        } else {
          line.push(cell.id);
        }
        r += dr * step;
        c += dc * step;
      }
    }

    if (line.length >= WIN_LENGTH) {
      for (let start = 0; start <= line.length - WIN_LENGTH; start += 1) {
        const candidate = line.slice(start, start + WIN_LENGTH);
        if (candidate.includes(cellId(row, col))) {
          return candidate;
        }
      }
    }
  }

  return [];
}

function buildCardOptionsFromLine(board: GomokuBoard, line: string[]): RewardCardOption[] {
  return line.map((id, index) => {
    const cell = board.cells.find((item) => item.id === id);
    return {
      id: `card-${index + 1}-${id}`,
      cellId: id,
      level: cell?.taskLevel ?? 1,
      displayName: `盲选卡牌 ${index + 1}`
    };
  });
}

export const GomokuDuel: GamePlugin = {
  id: "gomoku-duel",
  name: "Gomoku Duel",
  getRequiredPlayers: () => 1,
  initBoard: (): GameState => ({
    board: createBoard(),
    players: [],
    moves: {},
    phase: "waiting"
  }),
  validateMove: (move: GameMove, state: GameState): boolean => {
    if (state.phase !== "waiting") {
      return false;
    }

    const board = getBoard(state);
    if (board.winner) {
      return false;
    }

    const currentPlayerId = getCurrentPlayerId(state, board);
    if (!currentPlayerId || currentPlayerId !== move.playerId) {
      return false;
    }

    const parsed = parseMove(move.action);
    if (!parsed) {
      return false;
    }

    const target = board.cells.find((cell) => cell.row === parsed.row && cell.col === parsed.col);
    return Boolean(target && !target.stone);
  },
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
    if (!target || target.stone) {
      return { winner: null, isDraw: true, scores: {}, winGap: 0 };
    }

    const stone = toStone(playerId, state);
    target.stone = stone;

    const line = checkWinningLine(board, parsed.row, parsed.col, stone);
    if (line.length === WIN_LENGTH) {
      board.winner = playerId;
      board.winningLine = line;
      const loser = state.players.find((id) => id !== playerId) ?? "";
      return {
        winner: playerId,
        isDraw: false,
        scores: {
          [playerId]: 1,
          ...(loser ? { [loser]: 0 } : {})
        },
        winGap: 1,
        cardOptions: buildCardOptionsFromLine(board, line)
      };
    }

    const hasSpace = board.cells.some((cell) => !cell.stone);
    if (!hasSpace) {
      board.winner = null;
      board.winningLine = [];
      return {
        winner: null,
        isDraw: true,
        scores: {},
        winGap: 0
      };
    }

    const nextPlayer = state.players.find((id) => id !== playerId) ?? playerId;
    board.currentPlayerId = nextPlayer;

    return {
      winner: null,
      isDraw: true,
      scores: {},
      winGap: 0
    };
  },
  getValidMoves: (state: GameState): string[] => {
    const board = getBoard(state);
    if (board.winner) {
      return [];
    }

    return board.cells.filter((cell) => !cell.stone).map((cell) => cell.id);
  },
  toClientState: (state: GameState): GameState => {
    const board = getBoard(state);
    ensureCurrentPlayer(state, board);

    return {
      ...state,
      board: {
        size: board.size,
        currentPlayerId: board.currentPlayerId,
        winner: board.winner,
        winningLine: board.winningLine,
        cells: board.cells
      }
    };
  }
};
