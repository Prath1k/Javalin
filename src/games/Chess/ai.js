const pieceValues = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 900 };

// Simple evaluation: positive for white, negative for black
function evaluateBoard(chess) {
  let total = 0;
  const board = chess.board();
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (piece) {
        const val = pieceValues[piece.type];
        // Positional bonuses could be added here
        total += piece.color === 'w' ? val : -val;
      }
    }
  }
  return total;
}

function minimax(chess, depth, alpha, beta, isMaximizing) {
  if (depth === 0 || chess.isGameOver()) {
    if (chess.isCheckmate()) {
      // High score for checkmate
      return isMaximizing ? -9999 + depth : 9999 - depth;
    }
    if (chess.isDraw()) {
      return 0; // Draw is neutral
    }
    return evaluateBoard(chess);
  }

  const moves = chess.moves();
  if (isMaximizing) {
    let maxEval = -Infinity;
    for (let i = 0; i < moves.length; i++) {
      chess.move(moves[i]);
      const ev = minimax(chess, depth - 1, alpha, beta, false);
      chess.undo();
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break; // Beta cutoff
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (let i = 0; i < moves.length; i++) {
      chess.move(moves[i]);
      const ev = minimax(chess, depth - 1, alpha, beta, true);
      chess.undo();
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break; // Alpha cutoff
    }
    return minEval;
  }
}

export function getBestMove(chess, depth = 3) {
  const moves = chess.moves();
  if (moves.length === 0) return null;

  let bestMove = null;
  const turn = chess.turn();

  // If white is computer, it wants to maximize.
  // If black is computer, it wants to minimize.
  const isMaximizing = turn === 'w';

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (let i = 0; i < moves.length; i++) {
      chess.move(moves[i]);
      const ev = minimax(chess, depth - 1, -Infinity, Infinity, false);
      chess.undo();
      if (ev > maxEval) {
        maxEval = ev;
        bestMove = moves[i];
      }
    }
  } else {
    let minEval = Infinity;
    for (let i = 0; i < moves.length; i++) {
      chess.move(moves[i]);
      const ev = minimax(chess, depth - 1, -Infinity, Infinity, true);
      chess.undo();
      if (ev < minEval) {
        minEval = ev;
        bestMove = moves[i];
      }
    }
  }

  // Fallback random move if somehow no move is picked
  if (!bestMove) {
    bestMove = moves[Math.floor(Math.random() * moves.length)];
  }

  return bestMove;
}
