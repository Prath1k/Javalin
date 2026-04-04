const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

const pawnTable = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const knightTable = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const bishopTable = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const rookTable = [
  [0, 0, 0, 5, 5, 0, 0, 0],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const queenTable = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

const kingTable = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

const positionTables = {
  p: pawnTable,
  n: knightTable,
  b: bishopTable,
  r: rookTable,
  q: queenTable,
  k: kingTable,
};

const difficultyProfiles = {
  easy: {
    depth: 2,
    randomness: 0.45,
    candidatePool: 4,
  },
  medium: {
    depth: 3,
    randomness: 0.12,
    candidatePool: 3,
  },
  hard: {
    depth: 4,
    randomness: 0,
    candidatePool: 1,
  },
};

function getProfile(difficulty) {
  if (!difficulty) return difficultyProfiles.medium;
  if (typeof difficulty === 'number') {
    return {
      depth: Math.max(1, Math.min(5, difficulty)),
      randomness: 0,
      candidatePool: 1,
    };
  }

  const value = typeof difficulty === 'string' ? difficulty : difficulty.difficulty;
  if (value && difficultyProfiles[value]) return difficultyProfiles[value];
  return difficultyProfiles.medium;
}

function getPositionBonus(piece, row, col) {
  const table = positionTables[piece.type];
  if (!table) return 0;
  if (piece.color === 'w') return table[row][col];
  return table[7 - row][col];
}

function evaluateBoard(chess) {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -999999 : 999999;
  }

  if (chess.isDraw() || chess.isStalemate() || chess.isInsufficientMaterial()) {
    return 0;
  }

  let score = 0;
  let whiteBishops = 0;
  let blackBishops = 0;

  const board = chess.board();
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;

      const material = pieceValues[piece.type];
      const position = getPositionBonus(piece, row, col);
      const signed = piece.color === 'w' ? 1 : -1;
      score += signed * (material + position);

      if (piece.type === 'b') {
        if (piece.color === 'w') whiteBishops += 1;
        else blackBishops += 1;
      }
    }
  }

  if (whiteBishops >= 2) score += 25;
  if (blackBishops >= 2) score -= 25;

  const mover = chess.turn();
  const mobility = chess.moves().length;
  score += mover === 'w' ? mobility * 2 : -mobility * 2;

  if (chess.isCheck()) {
    score += mover === 'w' ? -35 : 35;
  }

  const fen = chess.fen();
  const castling = fen.split(' ')[2] || '-';
  if (castling.includes('K') || castling.includes('Q')) score += 15;
  if (castling.includes('k') || castling.includes('q')) score -= 15;

  return score;
}

function scoreMoveForOrdering(move) {
  let score = 0;
  if (move.captured) {
    score += 500 + (pieceValues[move.captured] || 0) - (pieceValues[move.piece] || 0) / 10;
  }
  if (move.promotion) score += 800;
  if (move.san.includes('+')) score += 80;
  if (move.san.includes('#')) score += 10000;
  if (move.flags.includes('k') || move.flags.includes('q')) score += 60;
  return score;
}

function getOrderedMoves(chess) {
  const moves = chess.moves({ verbose: true });
  moves.sort((a, b) => scoreMoveForOrdering(b) - scoreMoveForOrdering(a));
  return moves;
}

function minimax(chess, depth, alpha, beta) {
  if (depth === 0 || chess.isGameOver()) {
    return evaluateBoard(chess);
  }

  const moves = getOrderedMoves(chess);
  if (moves.length === 0) {
    return evaluateBoard(chess);
  }

  const maximizing = chess.turn() === 'w';

  if (maximizing) {
    let best = -Infinity;
    for (let i = 0; i < moves.length; i++) {
      chess.move(moves[i]);
      const value = minimax(chess, depth - 1, alpha, beta);
      chess.undo();
      if (value > best) best = value;
      if (value > alpha) alpha = value;
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (let i = 0; i < moves.length; i++) {
    chess.move(moves[i]);
    const value = minimax(chess, depth - 1, alpha, beta);
    chess.undo();
    if (value < best) best = value;
    if (value < beta) beta = value;
    if (beta <= alpha) break;
  }
  return best;
}

function pickMoveWithStyle(candidates, profile, maximizing) {
  if (candidates.length === 0) return null;
  if (candidates.length === 1 || profile.randomness <= 0) return candidates[0];

  const limit = Math.max(1, Math.min(profile.candidatePool, candidates.length));
  const shortlist = candidates.slice(0, limit);

  if (Math.random() > profile.randomness) {
    return shortlist[0];
  }

  if (maximizing) {
    const weighted = shortlist.map((item, idx) => ({
      ...item,
      weight: 1 / (idx + 1),
    }));
    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
    let pick = Math.random() * totalWeight;
    for (let i = 0; i < weighted.length; i++) {
      pick -= weighted[i].weight;
      if (pick <= 0) return weighted[i];
    }
    return weighted[0];
  }

  const reversed = shortlist
    .slice()
    .sort((a, b) => a.score - b.score)
    .map((item, idx) => ({ ...item, weight: 1 / (idx + 1) }));
  const totalWeight = reversed.reduce((sum, item) => sum + item.weight, 0);
  let pick = Math.random() * totalWeight;
  for (let i = 0; i < reversed.length; i++) {
    pick -= reversed[i].weight;
    if (pick <= 0) return reversed[i];
  }
  return reversed[0];
}

function analyzeMoves(chess, profile) {
  const moves = getOrderedMoves(chess);
  const maximizing = chess.turn() === 'w';

  const evaluated = [];
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const applied = chess.move(move);
    const score = minimax(chess, profile.depth - 1, -Infinity, Infinity);
    chess.undo();

    evaluated.push({
      move,
      score,
      san: applied.san,
      from: applied.from,
      to: applied.to,
      captured: applied.captured,
      flags: applied.flags,
    });
  }

  evaluated.sort((a, b) => (maximizing ? b.score - a.score : a.score - b.score));
  return { evaluated, maximizing };
}

function describeHint(hint) {
  if (hint.san.includes('#')) return 'This creates a checkmate threat immediately.';
  if (hint.san.includes('+')) return 'This puts the king in check and gains initiative.';
  if (hint.captured) return 'This wins material while keeping pressure on your opponent.';
  if (hint.flags.includes('k') || hint.flags.includes('q')) return 'Castling improves king safety and rook activity.';
  return 'This improves piece activity and keeps your position solid.';
}

export function getBestMove(chess, difficulty = 'medium') {
  const profile = getProfile(difficulty);
  const { evaluated, maximizing } = analyzeMoves(chess, profile);
  if (evaluated.length === 0) return null;

  const picked = pickMoveWithStyle(evaluated, profile, maximizing);
  return picked ? picked.san : evaluated[0].san;
}

export function getSmartHint(chess, difficulty = 'medium') {
  const baseProfile = getProfile(difficulty);
  const hintProfile = {
    ...baseProfile,
    depth: Math.min(4, baseProfile.depth + 1),
    randomness: 0,
    candidatePool: 1,
  };

  const { evaluated } = analyzeMoves(chess, hintProfile);
  if (evaluated.length === 0) return null;

  const best = evaluated[0];
  return {
    from: best.from,
    to: best.to,
    san: best.san,
    reason: describeHint(best),
  };
}
