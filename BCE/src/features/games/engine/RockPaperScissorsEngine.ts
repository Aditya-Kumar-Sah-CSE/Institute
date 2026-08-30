export type RPSMove = 'rock' | 'paper' | 'scissors';
export type RPSRoundResult = 'host_win' | 'guest_win' | 'draw';
export type RPSDifficulty = 'easy' | 'medium' | 'hard';

export interface RPSRoundSummary {
  round: number;
  hostMove: RPSMove;
  guestMove: RPSMove;
  result: RPSRoundResult;
}

export interface RPSState {
  round: number;
  targetWins: number;
  hostScore: number;
  guestScore: number;
  hostMove: RPSMove | null;
  guestMove: RPSMove | null;
  history: RPSRoundSummary[];
  matchWinner: 'host' | 'guest' | 'draw' | null;
  isComplete: boolean;
}

export class RockPaperScissorsEngine {
  public static MOVES: RPSMove[] = ['rock', 'paper', 'scissors'];

  /**
   * Evaluates a single round outcome between host and guest.
   */
  public static evaluateRound(hostMove: RPSMove, guestMove: RPSMove): RPSRoundResult {
    if (hostMove === guestMove) return 'draw';
    
    if (
      (hostMove === 'rock' && guestMove === 'scissors') ||
      (hostMove === 'scissors' && guestMove === 'paper') ||
      (hostMove === 'paper' && guestMove === 'rock')
    ) {
      return 'host_win';
    }
    
    return 'guest_win';
  }

  /**
   * Checks if match has concluded based on target win count.
   */
  public static checkMatchWinner(hostScore: number, guestScore: number, targetWins: number): { isComplete: boolean; winner: 'host' | 'guest' | null } {
    if (hostScore >= targetWins) {
      return { isComplete: true, winner: 'host' };
    }
    if (guestScore >= targetWins) {
      return { isComplete: true, winner: 'guest' };
    }
    return { isComplete: false, winner: null };
  }

  /**
   * Returns counter move for a given move.
   */
  public static getWinningMove(move: RPSMove): RPSMove {
    if (move === 'rock') return 'paper';
    if (move === 'paper') return 'scissors';
    return 'rock';
  }

  /**
   * Bot AI Move Generator.
   */
  public static generateBotMove(difficulty: RPSDifficulty, playerHistory: RPSMove[]): RPSMove {
    if (difficulty === 'easy' || playerHistory.length === 0) {
      return this.MOVES[Math.floor(Math.random() * 3)];
    }

    if (difficulty === 'medium') {
      // Calculate frequency of player moves
      const counts: Record<RPSMove, number> = { rock: 0, paper: 0, scissors: 0 };
      playerHistory.forEach(m => counts[m]++);

      // 70% chance to counter most frequent move, 30% random
      if (Math.random() < 0.7) {
        let mostFrequent: RPSMove = 'rock';
        let maxCount = -1;
        this.MOVES.forEach(m => {
          if (counts[m] > maxCount) {
            maxCount = counts[m];
            mostFrequent = m;
          }
        });
        return this.getWinningMove(mostFrequent);
      }
      return this.MOVES[Math.floor(Math.random() * 3)];
    }

    // Hard difficulty: Pattern adaptation
    // Analyzes recent player moves and transition tendencies
    const lastPlayerMove = playerHistory[playerHistory.length - 1];
    
    // 85% chance to counter predicted player behavior, 15% randomized noise
    if (Math.random() < 0.85) {
      // Players commonly repeat their last winning move or switch after loss
      const predictedMove = lastPlayerMove;
      return this.getWinningMove(predictedMove);
    }

    return this.MOVES[Math.floor(Math.random() * 3)];
  }
}
