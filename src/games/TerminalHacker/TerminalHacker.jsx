import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useScores } from '../../ScoreContext';
import './TerminalHacker.css';

const WORD_LIST = [
  'sudo', 'root', 'compile', 'decrypt', 'encrypt', 'kernel', 'shell',
  'bash', 'proxy', 'firewall', 'breach', 'mainframe', 'override',
  'payload', 'malware', 'exploit', 'buffer', 'overflow', 'sysadmin',
  'ping', 'latency', 'bandwidth', 'packet', 'router', 'gateway',
  'hash', 'cipher', 'token', 'socket', 'thread', 'process', 'memory',
  'algorithm', 'binary', 'hex', 'octal', 'syntax', 'logic', 'variable',
  'function', 'pointer', 'reference', 'class', 'object', 'module',
  'import', 'export', 'build', 'deploy', 'cluster', 'node', 'docker',
  'kubernetes', 'cloud', 'server', 'database', 'query', 'index', 'table'
];

const MATRIX_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789';

const TerminalHacker = () => {
  const { updateHighScore } = useScores();
  const [selectedLevel, setSelectedLevel] = useState(1);
  
  const [gameState, setGameState] = useState('start');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [words, setWords] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [level, setLevel] = useState(1);
  const [wordsTyped, setWordsTyped] = useState(0);
  const [shatterWord, setShatterWord] = useState(null);
  const inputRef = useRef(null);

  const wordsRef = useRef([]);
  const requestRef = useRef();
  const lastTimeRef = useRef();
  const spawnTimerRef = useRef(0);
  const gameStartTimeRef = useRef(0);

  // Matrix rain columns
  const [matrixCols] = useState(() => {
    const cols = [];
    for (let i = 0; i < 30; i++) {
      cols.push({
        x: Math.random() * 100,
        speed: 0.5 + Math.random() * 1.5,
        chars: Array.from({ length: 8 + Math.floor(Math.random() * 12) }, () =>
          MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]
        ),
        offset: Math.random() * 100
      });
    }
    return cols;
  });

  const getWPM = useCallback(() => {
    if (wordsTyped === 0 || gameState !== 'playing') return 0;
    const elapsed = (performance.now() - gameStartTimeRef.current) / 60000;
    return elapsed > 0 ? Math.round(wordsTyped / elapsed) : 0;
  }, [wordsTyped, gameState]);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setLives(5);
    setWords([]);
    setInputValue('');
    setLevel(selectedLevel);
    setWordsTyped(0);
    setShatterWord(null);
    wordsRef.current = [];
    lastTimeRef.current = performance.now();
    gameStartTimeRef.current = performance.now();
    requestRef.current = requestAnimationFrame(gameLoop);

    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 100);
  };

  const spawnWord = () => {
    const randomWord = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    const xPos = 5 + Math.random() * 75;
    const newWord = {
      id: Date.now() + Math.random(),
      text: randomWord,
      x: xPos,
      y: -10,
      speed: 15 + (level * 5)
    };
    wordsRef.current = [...wordsRef.current, newWord];
    setWords(wordsRef.current);
  };

  const gameLoop = (time) => {
    if (gameState !== 'playing') return;

    if (lastTimeRef.current != null) {
      const deltaTime = (time - lastTimeRef.current) / 1000;

      spawnTimerRef.current -= deltaTime;
      const currentSpawnRate = Math.max(0.5, 2.5 - (level * 0.2));
      if (spawnTimerRef.current <= 0) {
        spawnWord();
        spawnTimerRef.current = currentSpawnRate;
      }

      let lostLife = false;
      let remainingWords = [];

      for (let i = 0; i < wordsRef.current.length; i++) {
        const w = wordsRef.current[i];
        w.y += w.speed * deltaTime;
        if (w.y > 90) {
          lostLife = true;
        } else {
          remainingWords.push(w);
        }
      }

      if (lostLife) {
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) endGame();
          return Math.max(0, newLives);
        });

        const container = document.querySelector('.terminal-container');
        if (container) {
          container.classList.add('damage-flash');
          setTimeout(() => container.classList.remove('damage-flash'), 200);
        }
      }

      wordsRef.current = remainingWords;
      setWords([...wordsRef.current]);
    }

    lastTimeRef.current = time;
    if (gameState === 'playing') {
      requestRef.current = requestAnimationFrame(gameLoop);
    }
  };

  const endGame = () => {
    setGameState('gameover');
    cancelAnimationFrame(requestRef.current);
    updateHighScore('terminal-hacker', score);
  };

  useEffect(() => {
    if (gameState === 'playing') {
      lastTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(gameLoop);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameState, level]);

  useEffect(() => {
    if (score > 0 && score % 100 === 0) {
      setLevel(prev => prev + 1);
    }
  }, [score]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);

    const matchIndex = wordsRef.current.findIndex(w => w.text === value.trim());
    if (matchIndex !== -1) {
      const matched = wordsRef.current[matchIndex];
      setScore(prev => prev + (matched.text.length * 10));
      setWordsTyped(prev => prev + 1);

      // Shatter effect
      setShatterWord({ text: matched.text, x: matched.x, y: matched.y });
      setTimeout(() => setShatterWord(null), 500);

      wordsRef.current.splice(matchIndex, 1);
      setWords([...wordsRef.current]);
      setInputValue('');

      const inputLine = document.querySelector('.input-line');
      if (inputLine) {
        inputLine.classList.add('success-flash');
        setTimeout(() => inputLine.classList.remove('success-flash'), 150);
      }
    }
  };

  useEffect(() => {
    const handleClick = () => {
      if (gameState === 'playing' && inputRef.current) {
        inputRef.current.focus();
      }
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [gameState]);

  return (
    <div className="terminal-container">
      <div className="crt-overlay"></div>
      <div className="scanlines"></div>

      {/* Matrix Rain Background */}
      <div className="matrix-rain">
        {matrixCols.map((col, i) => (
          <div
            key={i}
            className="matrix-column"
            style={{
              left: `${col.x}%`,
              animationDuration: `${8 / col.speed}s`,
              animationDelay: `${-col.offset / 10}s`
            }}
          >
            {col.chars.map((ch, j) => (
              <span key={j} style={{ opacity: 0.1 + (j / col.chars.length) * 0.3 }}>{ch}</span>
            ))}
          </div>
        ))}
      </div>

      {gameState === 'start' && (
        <div className="terminal-screen start-screen">
          <h1 className="terminal-title">TERMINAL_HACKER.EXE</h1>
          <p className="terminal-subtitle">INITIATING BREACH SEQUENCE...</p>
          <div className="boot-sequence">
            <p>&gt; CONNECTING TO MAINFRAME...</p>
            <p>&gt; BYPASSING FIREWALLS...</p>
            <p>&gt; DECRYPTING PAYLOADS...</p>
          </div>
          <p className="instructions">
            Type the descending code blocks to intercept them before they reach the system core.<br/>
            You have 5 system integrity blocks.
          </p>
          <div style={{ marginBottom: 20, textAlign: 'left', width: '100%', maxWidth: 360 }}>
            <label style={{ display: 'block', marginBottom: 8, color: '#00ff41', letterSpacing: 1 }}>
              START LEVEL
            </label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 6,
                border: '1px solid rgba(0, 255, 65, 0.4)',
                background: 'rgba(0, 0, 0, 0.65)',
                color: '#00ff41',
                fontFamily: 'inherit',
                fontSize: '1rem'
              }}
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((lvl) => (
                <option key={lvl} value={lvl}>0x{lvl.toString(16).toUpperCase()}</option>
              ))}
            </select>
          </div>
          <button className="hack-btn" onClick={startGame}>[ EXECUTE ]</button>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="terminal-screen playing-screen">
          <div className="terminal-header">
            <div className="stat">SYS_DEFENSE: {'■ '.repeat(lives)}{'- '.repeat(5 - lives)}</div>
            <div className="stat">LVL: 0x{level.toString(16).toUpperCase()}</div>
            <div className="stat">WPM: {getWPM()}</div>
            <div className="stat">DATA: {score} KB</div>
          </div>

          <div className="play-area">
            {words.map(w => (
              <div
                key={w.id}
                className="falling-word"
                style={{
                  left: `${w.x}%`,
                  top: `${w.y}%`,
                  color: w.y > 75 ? '#ff003c' : (w.y > 50 ? '#ffea00' : '#00ff41')
                }}
              >
                {/* Highlight matching prefix */}
                {inputValue && w.text.startsWith(inputValue) ? (
                  <>
                    <span className="typed-chars">{inputValue}</span>
                    {w.text.slice(inputValue.length)}
                  </>
                ) : w.text}
              </div>
            ))}

            {/* Shatter effect */}
            {shatterWord && (
              <div className="shatter-container" style={{ left: `${shatterWord.x}%`, top: `${shatterWord.y}%` }}>
                {shatterWord.text.split('').map((ch, i) => (
                  <span
                    key={i}
                    className="shatter-char"
                    style={{
                      '--shatter-x': `${(Math.random() - 0.5) * 80}px`,
                      '--shatter-y': `${(Math.random() - 0.5) * 80}px`,
                      '--shatter-r': `${(Math.random() - 0.5) * 360}deg`,
                      animationDelay: `${i * 0.03}s`
                    }}
                  >
                    {ch}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="input-line">
            <span className="prompt">root@system:~$</span>
            <input
              ref={inputRef}
              type="text"
              className="terminal-input"
              value={inputValue}
              onChange={handleInputChange}
              spellCheck="false"
              autoComplete="off"
              autoFocus
            />
            <span className="cursor">_</span>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="terminal-screen gameover-screen">
          <h1 className="terminal-title glitch" data-text="SYSTEM BREACHED">SYSTEM BREACHED</h1>
          <p className="final-stats">&gt; CONNECTION LOST.</p>
          <p className="final-stats">&gt; TOTAL DATA EXTRACTED: {score} KB</p>
          <p className="final-stats">&gt; THREAT LEVEL REACHED: {level}</p>
          <p className="final-stats">&gt; WORDS INTERCEPTED: {wordsTyped}</p>
          <p className="final-stats">&gt; PEAK WPM: {getWPM()}</p>
          <button className="hack-btn mt-4" onClick={startGame}>[ REBOOT_SYSTEM ]</button>
        </div>
      )}
    </div>
  );
};

export default TerminalHacker;
