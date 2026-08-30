export type TTTSymbol = 'X' | 'O';
export type TTTCell = TTTSymbol | null;
export type TTTBoard = TTTCell[];
export type TTTDifficulty = 'easy' | 'medium' | 'hard';

export interface TTTWinResult {
  winner: TTTSymbol | null;
  isDraw: boolean;
  winningLine: number[] | null;
  isComplete: boolean;
}

export class TicTacToeEngine {
  public static WINNING_LINES: number[][] = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];

  /**
   * Initializes a fresh 3x3 board array.
   */
  public static createEmptyBoard(): TTTBoard {
    return Array(9).fill(null);
  }

  /**
   * Evaluates board for winner, draw, and winning line coordinates.
   */
  public static evaluateBoard(board: TTTBoard): TTTWinResult {
    for (const line of this.WINNING_LINES) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return {
          winner: board[a],
          isDraw: false,
          winningLine: line,
          isComplete: true
        };
      }
    }

    const isDraw = board.every(cell => cell !== null);
    return {
      winner: null,
      isDraw,
      winningLine: null,
      isComplete: isDraw
    };
  }

  /**
   * Returns list of empty cell indices.
   */
  public static getAvailableMoves(board: TTTBoard): number[] {
    const moves: number[] = [];
    board.forEach((cell, idx) => {
      if (cell === null) moves.push(idx);
    });
    return moves;
  }

  /**
   * Bot AI Move Selector.
   */
  public static generateBotMove(board: TTTBoard, botSymbol: TTTSymbol, difficulty: TTTDifficulty): number {
    const available = this.getAvailableMoves(board);
    if (available.length === 0) return -1;

    const opponentSymbol: TTTSymbol = botSymbol === 'X' ? 'O' : 'X';

    if (difficulty === 'easy') {
      return available[Math.floor(Math.random() * available.length)];
    }

    if (difficulty === 'medium') {
      // 1. Check if bot can win in 1 move
      for (const move of available) {
        const testBoard = [...board];
        testBoard[move] = botSymbol;
        if (this.evaluateBoard(testBoard).winner === botSymbol) {
          return move;
        }
      }

      // 2. Check if opponent can win in 1 move and block them
      for (const move of available) {
        const testBoard = [...board];
        testBoard[move] = opponentSymbol;
        if (this.evaluateBoard(testBoard).winner === opponentSymbol) {
          return move;
        }
      }

      // 3. Take center cell if free
      if (board[4] === null) return 4;

      // 4. Otherwise random move
      return available[Math.floor(Math.random() * available.length)];
    }

    // Hard difficulty: Optimal Minimax Algorithm with Alpha-Beta Pruning
    let bestScore = -Infinity;
    let bestMove = available[0];

    for (const move of available) {
      const tempBoard = [...board];
      tempBoard[move] = botSymbol;
      
      const score = this.minimax(tempBoard, 0, false, botSymbol, opponentSymbol, -Infinity, Infinity);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  /**
   * Minimax Recursive Solver with Alpha-Beta Pruning.
   */
  private static minimax(
    board: TTTBoard,
    depth: number,
    isMaximizing: boolean,
    botSymbol: TTTSymbol,
    opponentSymbol: TTTSymbol,
    alpha: number,
    beta: number
  ): number {
    const evalResult = this.evaluateBoard(board);

    if (evalResult.winner === botSymbol) {
      return 10 - depth;
    }
    if (evalResult.winner === opponentSymbol) {
      return depth - 10;
    }
    if (evalResult.isDraw) {
      return 0;
    }

    const available = this.getAvailableMoves(board);

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of available) {
        board[move] = botSymbol;
        const evaluation = this.minimax(board, depth + 1, false, botSymbol, opponentSymbol, alpha, beta);
        board[move] = null;
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break; // Alpha-beta cutoff
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of available) {
        board[move] = opponentSymbol;
        const evaluation = this.minimax(board, depth + 1, true, botSymbol, opponentSymbol, alpha, beta);
        board[move] = null;
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break; // Alpha-beta cutoff
      }
      return minEval;
    }
  }
}
