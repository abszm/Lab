import type { GamePlugin } from "./GamePlugin.js";
import type { GameMove, GameResult, GameState } from "../types/index.js";

const BOARD_SIZE = 4;
const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
const MINE_COUNT = 4;

interface MinesweeperCell {
  id: string;
  label: string;
  hasMine: boolean;
  revealedBy: string | null;
  exploded: boolean;
}

interface MinesweeperBoard {
  size: number;
  cells: MinesweeperCell[];
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
      const id = `${row}-${col}`;
      cells.push({
        id,
        label: `${row + 1}-${col + 1}`,
        hasMine: mineIndexSet.has(index),
        revealedBy: null,
        exploded: false
      });
    }
  }

  return { size: BOARD_SIZE, cells };
}

function getBoard(state: GameState): MinesweeperBoard {
  return state.board as MinesweeperBoard;
}

function parseAction(action: string): string {
  return action.trim();
}

function resolveRoundScore(
  state: GameState,
  board: MinesweeperBoard,
  playerA: string,
  playerB: string
): { winner: string | null; isDraw: boolean; scores: Record<string, number>; winGap: number } {
  const roundScores: Record<string, number> = {
    [playerA]: 0,
    [playerB]: 0
  };

  for (const [playerId, action] of Object.entries(state.moves)) {
    const pickedCell = board.cells.find((cell) => cell.id === action);
    if (!pickedCell || pickedCell.revealedBy) {
      continue;
    }

    pickedCell.revealedBy = playerId;
    pickedCell.exploded = pickedCell.hasMine;

    const opponent = playerId === playerA ? playerB : playerA;
    if (pickedCell.hasMine) {
      roundScores[opponent] += 1;
    } else {
      roundScores[playerId] += 1;
    }
  }

  const scoreA = roundScores[playerA];
  const scoreB = roundScores[playerB];
  if (scoreA === scoreB) {
    return {
      winner: null,
      isDraw: true,
      scores: roundScores,
      winGap: 0
    };
  }

  return {
    winner: scoreA > scoreB ? playerA : playerB,
    isDraw: false,
    scores: roundScores,
    winGap: Math.abs(scoreA - scoreB)
  };
}

export const MinesweeperDuel: GamePlugin = {
  id: "minesweeper-duel",
  name: "Minesweeper Duel",
  getRequiredPlayers: () => 2,
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

    const action = parseAction(move.action);
    const board = getBoard(state);
    const cell = board.cells.find((item) => item.id === action);
    if (!cell) {
      return false;
    }

    if (cell.revealedBy) {
      return false;
    }

    const pickedActions = new Set(Object.values(state.moves));
    return !pickedActions.has(action);
  },
  calculateResult: (state: GameState): GameResult => {
    const playerIds = Object.keys(state.moves);
    if (playerIds.length < 2) {
      return { winner: null, isDraw: false, scores: {}, winGap: 0 };
    }

    const [playerA, playerB] = playerIds;
    const board = getBoard(state);
    const result = resolveRoundScore(state, board, playerA, playerB);

    const hiddenCells = board.cells.filter((cell) => !cell.revealedBy);
    if (hiddenCells.length < 2) {
      state.board = createBoard();
    }

    return result;
  },
  getValidMoves: (state: GameState): string[] => {
    const board = getBoard(state);
    return board.cells.filter((cell) => !cell.revealedBy).map((cell) => cell.id);
  },
  toClientState: (state: GameState): GameState => {
    const board = getBoard(state);
    return {
      ...state,
      board: {
        size: board.size,
        cells: board.cells.map((cell) => ({
          id: cell.id,
          label: cell.label,
          revealedBy: cell.revealedBy,
          exploded: cell.exploded
        }))
      }
    };
  }
};
