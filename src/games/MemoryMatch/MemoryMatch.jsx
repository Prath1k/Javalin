import React, { useState, useEffect, useRef } from 'react';
import './MemoryMatch.css';

const ICONS = ['🌐', '💎', '🚀', '🔮', '⚡', '🌙', '🔥', '🧩'];

const generateCards = () => {
  const deck = [...ICONS, ...ICONS]
    .sort(() => Math.random() - 0.5)
    .map((icon, index) => ({
      id: index,
      icon,
      isFlipped: false,
      isMatched: false,
    }));
  return deck;
};

const MemoryMatch = () => {
  const [cards, setCards] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState([]);
  const [matches, setMatches] = useState(0);
  const [moves, setMoves] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [combo, setCombo] = useState(0);
  const [sparkleCards, setSparkleCards] = useState([]);
  const [lastMatchWasCombo, setLastMatchWasCombo] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setCards(generateCards());
  }, []);

  useEffect(() => {
    if (isGameStarted && !timerRef.current) {
      timerRef.current = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }
    if (matches === ICONS.length && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isGameStarted, matches]);

  const getStars = () => {
    if (moves <= ICONS.length + 2) return 3;
    if (moves <= ICONS.length * 2) return 2;
    return 1;
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleCardClick = (index) => {
    if (isLocked || cards[index].isFlipped || cards[index].isMatched) return;
    if (!isGameStarted) setIsGameStarted(true);

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlippedIndices = [...flippedIndices, index];
    setFlippedIndices(newFlippedIndices);

    if (newFlippedIndices.length === 2) {
      setIsLocked(true);
      setMoves(m => m + 1);

      const [firstIndex, secondIndex] = newFlippedIndices;
      if (newCards[firstIndex].icon === newCards[secondIndex].icon) {
        // Match found!
        const newCombo = combo + 1;
        setCombo(newCombo);
        setLastMatchWasCombo(newCombo > 1);
        setTimeout(() => {
          const matchedCards = [...newCards];
          matchedCards[firstIndex].isMatched = true;
          matchedCards[secondIndex].isMatched = true;
          setCards(matchedCards);
          setFlippedIndices([]);
          setMatches(m => m + 1);
          setIsLocked(false);
          setSparkleCards([firstIndex, secondIndex]);
          setTimeout(() => setSparkleCards([]), 600);
        }, 400);
      } else {
        // No match
        setCombo(0);
        setLastMatchWasCombo(false);
        setTimeout(() => {
          const resetCards = [...newCards];
          resetCards[firstIndex].isFlipped = false;
          resetCards[secondIndex].isFlipped = false;
          setCards(resetCards);
          setFlippedIndices([]);
          setIsLocked(false);
        }, 900);
      }
    }
  };

  const restartGame = () => {
    setCards(generateCards());
    setFlippedIndices([]);
    setMatches(0);
    setMoves(0);
    setIsLocked(false);
    setTimer(0);
    setIsGameStarted(false);
    setCombo(0);
    setLastMatchWasCombo(false);
    setSparkleCards([]);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const isGameOver = matches === ICONS.length;
  const stars = getStars();

  return (
    <div className="memory-container">
      <div className="memory-header">
        <div className="memory-stats">
          <div className="stat-box">
            <span className="stat-label">MOVES</span>
            <span className="stat-value">{moves}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">MATCHES</span>
            <span className="stat-value">{matches} / {ICONS.length}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">TIME</span>
            <span className="stat-value">{formatTime(timer)}</span>
          </div>
          {combo > 1 && (
            <div className="stat-box combo-box">
              <span className="stat-label">COMBO</span>
              <span className="stat-value combo-value">x{combo} 🔥</span>
            </div>
          )}
        </div>
      </div>

      <div className="memory-grid">
        {cards.map((card, index) => (
          <div
            key={card.id}
            className={`memory-card ${card.isFlipped ? 'flipped' : ''} ${card.isMatched ? 'matched' : ''} ${sparkleCards.includes(index) ? 'sparkle' : ''}`}
            onClick={() => handleCardClick(index)}
          >
            <div className="card-inner">
              <div className="card-front">
                <div className="glass-reflection"></div>
                <div className="card-question">?</div>
              </div>
              <div className="card-back">
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isGameOver && (
        <div className="memory-win-overlay">
          <div className="win-stars">
            {[1, 2, 3].map(i => (
              <span key={i} className={`star ${i <= stars ? 'earned' : 'empty'}`}>★</span>
            ))}
          </div>
          <h2>Calibration Complete</h2>
          <p>Matched all sectors in {moves} moves ({formatTime(timer)})</p>
          {lastMatchWasCombo && <p className="combo-bonus">Combo Master! 🔥</p>}
          <button className="btn btn-primary mt-4" onClick={restartGame}>Recalibrate</button>
        </div>
      )}
    </div>
  );
};

export default MemoryMatch;
