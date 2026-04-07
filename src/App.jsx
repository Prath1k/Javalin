import React, { useState, useMemo, useEffect } from 'react';
import './App.css';
import { supabase } from './supabaseClient';
import { ScoreProvider, useScores } from './ScoreContext';
import Leaderboard from './Leaderboard';

import BottleSpin from './games/BottleSpin/BottleSpin';
import Snake from './games/Snake/Snake';
import MemoryMatch from './games/MemoryMatch/MemoryMatch';
import RhythmClicker from './games/RhythmClicker/RhythmClicker';

import TerminalHacker from './games/TerminalHacker/TerminalHacker';
import QuantumSweeper from './games/QuantumSweeper/QuantumSweeper';
import NeonPong from './games/NeonPong/NeonPong';
import NeonAirHockey from './games/NeonAirHockey/NeonAirHockey';
import SortViz from './games/SortViz/SortViz';
import HexConnect from './games/HexConnect/HexConnect';
import ChessGame from './games/Chess/Chess';
import LudoGame from './games/Ludo/Ludo';
import SpaceInvaders from './games/SpaceInvaders/SpaceInvaders';
import PacMan from './games/PacMan/PacMan';
import OrbChase from './games/OrbChase/OrbChase';
import NeonTetris from './games/NeonTetris/NeonTetris';
import PrismBreak from './games/PrismBreak/PrismBreak';
import NeonFusion from './games/NeonFusion/NeonFusion';
import TheGlitch from './games/TheGlitch/TheGlitch';
import OrbitRoyale from './games/OrbitRoyale/OrbitRoyale';
import VectorRace from './games/VectorRace/VectorRace';
import InfectionTag from './games/InfectionTag/InfectionTag';
import SnakesAndLadders from './games/SnakesAndLadders/SnakesAndLadders';

// ── Theme Assets ─────────────────────────────────────────────
import logoLight from './assets/logo-light.png';
import logoDark from './assets/logo-dark.png';

// ── Game Thumbnail Images ───────────────────────────────────
import imgPacman from './assets/games/pacman.png';
import imgSpaceInvaders from './assets/games/space-invaders.png';
import imgBottleSpin from './assets/games/bottle-spin.png';
import imgSnake from './assets/games/retro-snake.png';
import imgMemoryMatch from './assets/games/memory-match.png';
import imgRhythmClicker from './assets/games/rhythm-clicker.png';
import imgTerminalHacker from './assets/games/terminal-hacker.png';
import imgQuantumSweeper from './assets/games/quantum-sweeper.png';
import imgNeonPong from './assets/games/neon-pong.png';
import imgSortViz from './assets/games/sort-viz.png';
import imgHexConnect from './assets/games/hex-connect.png';
import imgChess from './assets/games/grandmaster-chess.png';
import imgOrbChase from './assets/games/orb-chase.svg';
import imgNeonTetris from './assets/games/neon-tetris.png';
import imgPrismBreak from './assets/games/prism-break.png';
import imgNeonFusion from './assets/games/neon-fusion.png';
import imgInfectionTag from './assets/games/infection-tag.png';
import imgTheGlitch from './assets/games/the-glitch.png';
import imgOrbitRoyale from './assets/games/orbit-royale.png';
import imgVectorRace from './assets/games/vector-race.png';


// ── Game Registry ───────────────────────────────────────────
const GAMES = [
  {
    id: 'pacman',
    title: 'Pac-Man',
    genre: 'Arcade / Maze',
    desc: 'Waka Waka! Eat pellets, avoid unique ghost AI, and score high.',
    icon: '🟡',
    image: imgPacman,
    component: PacMan,
    status: 'active',
  },
  {
    id: 'space-invaders',
    title: 'Space Invaders',
    genre: 'Arcade / Classic',
    desc: 'Defend earth from the invading alien fleet. Fast-paced retro action.',
    icon: '👾',
    image: imgSpaceInvaders,
    component: SpaceInvaders,
    status: 'active',
  },
  {
    id: 'bottle-spin',
    title: 'Bottle Spin 2.0',
    genre: 'Physics / Party',
    desc: 'Microphone-powered physics simulation. The harder you blow, the faster it spins.',
    icon: '🌪️',
    image: imgBottleSpin,
    component: BottleSpin,
    status: 'active',
  },
  {
    id: 'retro-snake',
    title: 'Neon Snake',
    genre: 'Arcade / Classic',
    desc: 'Synthwave classic with local-storage high scores and fluid grid movement.',
    icon: '🐍',
    image: imgSnake,
    component: Snake,
    status: 'active',
  },
  {
    id: 'memory-match',
    title: 'Glass Memory',
    genre: 'Cognitive / Puzzle',
    desc: 'Test your speed with premium glassmorphic cards and 3D flips.',
    icon: '🎴',
    image: imgMemoryMatch,
    component: MemoryMatch,
    status: 'active',
  },
  {
    id: 'rhythm-clicker',
    title: 'Pulse Rhythm',
    genre: 'Music / Reaction',
    desc: 'Sync taps with visual audio frequencies in this mesmerizing experience.',
    icon: '🎵',
    image: imgRhythmClicker,
    component: RhythmClicker,
    status: 'active',
  },

  {
    id: 'terminal-hacker',
    title: 'Terminal Hacker',
    genre: 'Strategy / Typing',
    desc: 'Defend the mainframe. Fast-paced CRT typing interceptor.',
    icon: '💻',
    image: imgTerminalHacker,
    component: TerminalHacker,
    status: 'active',
  },
  {
    id: 'quantum-sweeper',
    title: 'Quantum Sweeper',
    genre: 'Logic / Puzzle',
    desc: 'Classic logic, premium UI. Navigate the quantum field without breaching containment.',
    icon: '💣',
    image: imgQuantumSweeper,
    component: QuantumSweeper,
    status: 'active',
  },
  {
    id: 'neon-pong',
    title: 'Neon Pong',
    genre: 'Multiplayer / Sports',
    desc: 'Local multiplayer physics paddle game with high-speed synthetic glow.',
    icon: '🏓',
    image: imgNeonPong,
    component: NeonPong,
    status: 'active',
  },
  {
    id: 'neon-air-hockey',
    title: 'Neon Air Hockey',
    genre: 'Arcade / Sports',
    desc: 'High-speed glow rink duels with VS AI and local 2P controls on one keyboard.',
    icon: '🏒',
    image: null,
    component: NeonAirHockey,
    status: 'active',
  },
  {
    id: 'sort-viz',
    title: 'Sort Viz',
    genre: 'Education / Visual',
    desc: 'Algorithm visualization engine showing array transformations in real time.',
    icon: '📊',
    image: imgSortViz,
    component: SortViz,
    status: 'active',
  },
  {
    id: 'hex-connect',
    title: 'Hex Connect',
    genre: 'Strategy / Logic',
    desc: 'Close the circuits. A premium SVG-based node connection logic puzzle.',
    icon: '🔗',
    image: imgHexConnect,
    component: HexConnect,
    status: 'active',
  },
  {
    id: 'grandmaster-chess',
    title: 'Grandmaster Chess',
    genre: 'Board / Strategy',
    desc: 'Full chess with legal move validation and an integrated Alpha-Beta pruning AI engine.',
    icon: '♚',
    image: imgChess,
    component: ChessGame,
    status: 'active',
  },
  {
    id: 'ludo-royale',
    title: 'Ludo Royale',
    genre: 'Board / Party',
    desc: 'Classic Ludo with local or global rooms inspired by Ludo King.',
    icon: '🎲',
    image: null,
    component: LudoGame,
    status: 'active',
  },
  {
    id: 'orb-chase',
    title: 'Orb Chase',
    genre: '1P / Reflex',
    desc: 'Single-player precision click sprint. Build combos while the target speeds up.',
    icon: '🎯',
    image: imgOrbChase,
    component: OrbChase,
    status: 'active',
  },
  {
    id: 'neon-tetris',
    title: 'Neon Tetris',
    genre: 'Arcade / Puzzle',
    desc: 'Classic block-stacking logic with a synthetic neon glow and ghost piece tracking.',
    icon: '🧱',
    image: imgNeonTetris,
    component: NeonTetris,
    status: 'active',
  },
  {
    id: 'prism-break',
    title: 'Prism Break',
    genre: 'Arcade / Physics',
    desc: 'Demolish the spectral field. A high-octane breakout experience with intense particles.',
    icon: '💎',
    image: imgPrismBreak,
    component: PrismBreak,
    status: 'active',
  },
  {
    id: 'neon-fusion',
    title: 'Neon Fusion',
    genre: 'Cognitive / Puzzle',
    desc: 'Merge the spectra to reach the singularity. A premium glassmorphic 2048 experience.',
    icon: '⚛️',
    image: imgNeonFusion,
    component: NeonFusion,
    status: 'active',
  },
  {
    id: 'the-glitch',
    title: 'The Glitch',
    genre: 'Multiplayer / Deduction',
    desc: 'Support local & online play! Find the Glitch or sabotage the neon system.',
    icon: '👾',
    image: imgTheGlitch,
    component: TheGlitch,
    status: 'active',
  },
  {
    id: 'orbit-royale',
    title: 'Orbit Royale',
    genre: 'Multiplayer / Arena',
    desc: 'Support local & online play! Gravity well arena. Destroy your friends.',
    icon: '🚀',
    image: imgOrbitRoyale,
    component: OrbitRoyale,
    status: 'active',
  },
  {
    id: 'vector-race',
    title: 'Vector Race',
    genre: 'Multiplayer / Racing',
    desc: 'Support local & online play! Momentum-based grid racing. Plan your path.',
    icon: '🏎️',
    image: imgVectorRace,
    component: VectorRace,
    status: 'active',
  },
  {
    id: 'infection-tag',
    title: 'Infection Tag',
    genre: 'Multiplayer / Action',
    desc: 'Real-time WebSocket multiplayer tag! Run from the glowing infected, or spread the virus.',
    icon: '🦠',
    image: imgInfectionTag,
    component: InfectionTag,
    status: 'active',
  },
  {
    id: 'snakes-ladders',
    title: 'Snakes & Ladders',
    genre: 'Board / Party',
    desc: 'Classic board game replicated with a premium jungle aesthetic. Scale the ladders, avoid the snakes!',
    icon: '🐍',
    image: null,
    component: SnakesAndLadders,
    status: 'active',
  },
];

// ── Material Icon helper ────────────────────────────────────
const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

// ── Sidebar ────────────────────────────────────────────────
function Sidebar({ activeGame, onSelectGame, onHome, activeTab, onTabChange, user, onSignIn, onSignOut, onSettings, theme, isOpen, onClose }) {
  return (
    <>
      {/* Overlay for mobile */}
      <div className={`sidebar-overlay ${isOpen ? 'show' : ''}`} onClick={onClose} />
      
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand */}
      <div className="brand" onClick={onHome}>
        <div className="brand-logo-container">
          <img 
            src={theme === 'light' ? logoLight : logoDark} 
            alt="PixelArena" 
            className="brand-logo"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="nav-section">
        <div className="nav-label">Navigation</div>
        <nav className="nav-menu">
          <div
            className={`nav-item ${activeTab === 'hub' && !activeGame ? 'active' : ''}`}
            onClick={onHome}
          >
            <Icon name="dashboard" className="nav-icon" />
            Game Hub
          </div>
          <div
            className={`nav-item ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => { onTabChange('leaderboard'); onClose?.(); }}
          >
            <Icon name="leaderboard" className="nav-icon" />
            Global Ranks
          </div>
        </nav>
      </div>

      {/* Library */}
      <div className="nav-section">
        <div className="nav-label">Your Library</div>
        <nav className="nav-menu">
          {GAMES.filter(g => g.status === 'active').map(game => (
            <div
              key={game.id}
              className={`nav-item ${activeGame?.id === game.id ? 'active' : ''}`}
              onClick={() => onSelectGame(game)}
            >
              <Icon name="play_circle" className="nav-icon" />
              {game.title}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        {user ? (
          <>
            <div className="sidebar-user">
              <div className="sidebar-avatar" style={{ overflow: 'hidden' }}>
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Icon name="person" />
                )}
              </div>
              <div>
                <div className="sidebar-user-name" style={{ fontSize: '0.85rem' }}>{user.user_metadata?.full_name || user.email}</div>
                <div className="sidebar-user-role">Online</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
              <div className="nav-item" style={{ paddingLeft: 0, marginTop: 8 }} onClick={onSettings}>
                <Icon name="settings" className="nav-icon" />
                Settings
              </div>
              <div className="nav-item" style={{ paddingLeft: 0 }} onClick={onSignOut}>
                <Icon name="logout" className="nav-icon" />
                Sign Out
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', paddingBottom: '24px' }}>
            <div className="nav-item" style={{ paddingLeft: 0, marginTop: 8 }} onClick={onSettings}>
              <Icon name="settings" className="nav-icon" />
              Settings
            </div>
            <button style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              gap: '8px', width: '100%', padding: '12px', 
              backgroundColor: 'var(--text-primary)', color: 'var(--bg-base)', 
              border: 'none', borderRadius: '8px', 
              fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
              boxShadow: '0 4px 12px var(--accent-dim)'
            }} onClick={onSignIn} className="sign-in-btn">
              <Icon name="login" style={{ color: '#000', fontSize: '18px' }} />
              Sign In
            </button>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}

// ── Topbar ─────────────────────────────────────────────────
function Topbar({ activeGame, activeTab, onTabChange, searchQuery, onSearch, onHome, theme, onToggleTheme, onToggleSidebar }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="topbar-btn menu-toggle" onClick={onToggleSidebar}>
          <Icon name="menu" />
        </button>
        <div className="page-title">
          {activeGame ? (
            <>
              <span style={{ color: 'var(--text-muted)' }}>Playing / </span>
              {activeGame.title}
            </>
          ) : activeTab === 'hub' ? (
            'Library'
          ) : activeTab === 'leaderboard' ? (
            'Global Leaderboard'
          ) : (
            'Discover'
          )}
        </div>
        {!activeGame && activeTab === 'hub' && (
          <div className="topbar-tabs">
            <div
              className={`topbar-tab ${activeTab === 'hub' ? 'active' : ''}`}
              onClick={onHome}
            >
              All Experiences
            </div>
          </div>
        )}
      </div>
      <div className="topbar-right">
        {!activeGame && (
          <div className="topbar-search">
            <Icon name="search" />
            <input
              type="text"
              placeholder="Search Collection"
              value={searchQuery}
              onChange={e => onSearch(e.target.value)}
            />
          </div>
        )}
        <button className="topbar-btn theme-toggle" onClick={onToggleTheme}>
          <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} />
        </button>
        <button className="topbar-btn">
          <Icon name="tune" />
        </button>
      </div>
    </header>
  );
}

// ── Game Card ───────────────────────────────────────────────
function GameCard({ game, onClick }) {
  return (
    <div className="game-card" onClick={() => onClick(game)}>
      <div className="game-card-thumb">
        {game.image ? (
          <img src={game.image} alt={game.title} className="game-card-image" />
        ) : (
          <div className="game-card-icon">{game.icon}</div>
        )}
        <div className="game-card-overlay">
          <span className="material-symbols-outlined game-card-overlay-icon">play_arrow</span>
        </div>
        <div className="game-card-badge">Ready</div>
      </div>
      <div className="game-card-genre">{game.genre}</div>
      <div className="game-card-title">{game.title}</div>
      <div className="game-card-desc">{game.desc}</div>
    </div>
  );
}

// ── Hub View ────────────────────────────────────────────────
function HubView({ onSelectGame, searchQuery }) {
  const filtered = useMemo(() => {
    if (!searchQuery) return GAMES;
    const q = searchQuery.toLowerCase();
    return GAMES.filter(g =>
      g.title.toLowerCase().includes(q) ||
      g.genre.toLowerCase().includes(q) ||
      g.desc.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="content-area" style={{ flex: 1 }}>
        <div className="hub-header">
          <h2 className="hub-title">Library</h2>
          <p className="hub-subtitle">Select an experience to initialize the viewport.</p>
        </div>
        <div className="game-grid">
          {filtered.length === 0 && searchQuery && (
            <div className="search-empty" style={{ gridColumn: '1 / -1' }}>
              <Icon name="search_off" className="search-empty-icon" />
              <div className="search-empty-text">
                <h3>No experiences found</h3>
                <p>Try adjusting your search query or browse the collection.</p>
              </div>
            </div>
          )}

          {filtered.map(game => (
            <GameCard key={game.id} game={game} onClick={onSelectGame} />
          ))}
          {/* Import slot */}
          <div className="game-card game-card-add">
            <div className="game-card-thumb" style={{ aspectRatio: '4/5' }}>
              <Icon name="add" style={{ fontSize: 28, color: 'var(--text-label)' }} />
              <div className="game-card-add-label">Import Title</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="hub-footer">
        <div>
          <div className="footer-stat-label">Current Session</div>
          <div className="footer-stats">
            <div className="footer-stat">
              <p>Games Available</p>
              <span>{GAMES.length}</span>
            </div>
            <div className="footer-stat">
              <p>Status</p>
              <span>Online</span>
            </div>
          </div>
        </div>
        <div className="footer-status">
          <div className="label">System Status</div>
          <div className="footer-status-badge">
            <div className="status-dot" />
            <p>All Servers Operational</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Game Player ─────────────────────────────────────────────
function GamePlayer({ game, onClose, onFullscreen, isFullscreen }) {
  const GameComponent = game.component;
  const gameId = `${game.id}.exe`;

  const wrapperClass = isFullscreen ? 'console-wrapper fullscreen' : 'console-wrapper';

  const inner = (
    <div className={wrapperClass} style={isFullscreen ? undefined : { flex: 1, minHeight: 0 }}>
      <div className="console-header">
        <div className="console-dots">
          <div className="dot close" onClick={onClose} />
          <div className="dot min" onClick={isFullscreen ? onFullscreen : undefined} />
          <div className="dot max" onClick={onFullscreen} />
        </div>
        <div className="console-title">{gameId}</div>
        <div style={{ width: 52 }} />
      </div>
      <div className="console-viewport">
        <GameComponent />
      </div>
    </div>
  );

  if (isFullscreen) {
    return inner;
  }

  return (
    <div className="content-area game-content">
      {inner}
    </div>
  );
}

// ── Root App ────────────────────────────────────────────────
export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-mode' : '';
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const [activeTab, setActiveTab] = useState('hub');
  const [activeGame, setActiveGame] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'your_supabase_project_url') {
        setUser({
          email: 'testplayer@pixelarena.com',
          user_metadata: {
            full_name: 'Test Player',
            avatar_url: 'https://ui-avatars.com/api/?name=Test+Player&background=random'
          }
        });
        setShowLoginModal(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (error) throw error;
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'your_supabase_project_url') {
        setUser({ email, user_metadata: { full_name: 'Test Player' } });
        setShowLoginModal(false);
        return;
      }
      
      let error;
      if (isSignUp) {
        const res = await supabase.auth.signUp({ email, password });
        error = res.error;
      } else {
        const res = await supabase.auth.signInWithPassword({ email, password });
        error = res.error;
      }
      
      if (error) throw error;
      setShowLoginModal(false);
      setEmail('');
      setPassword('');
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'your_supabase_project_url') {
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
  };

  const handleSelectGame = (game) => {
    if (game.status === 'active') {
      setActiveGame(game);
      setIsFullscreen(false);
      setActiveTab('hub');
      setSidebarOpen(false); // Close sidebar on mobile
    }
  };

  const handleHome = () => {
    setActiveTab('hub');
    setActiveGame(null);
    setIsFullscreen(false);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setActiveGame(null);
  };

  const handleFullscreen = () => setIsFullscreen(f => !f);

  return (
    <ScoreProvider user={user}>
      <div className="app-layout">
        {!isFullscreen && (
          <Sidebar
            activeGame={activeGame}
            onSelectGame={handleSelectGame}
            onHome={handleHome}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            theme={theme}
            user={user}
            onSignIn={() => { setAuthError(''); setShowLoginModal(true); }}
            onSignOut={handleSignOut}
            onSettings={() => setShowSettingsModal(true)}
            isOpen={isSidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        )}

      <main className="main-wrapper">
        {!isFullscreen && (
          <Topbar
            activeGame={activeGame}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
            onHome={handleHome}
            theme={theme}
            onToggleTheme={toggleTheme}
            onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
          />
        )}

        {activeGame ? (
          <GamePlayer
            game={activeGame}
            onClose={handleHome}
            onFullscreen={handleFullscreen}
            isFullscreen={isFullscreen}
          />
        ) : activeTab === 'leaderboard' ? (
          <div className="content-area">
            <Leaderboard />
          </div>
        ) : (
          <HubView onSelectGame={handleSelectGame} searchQuery={searchQuery} />
        )}
      </main>

      {showLoginModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">{isSignUp ? 'Create Account' : 'Sign In'}</h2>
              <button onClick={() => setShowLoginModal(false)} className="modal-close">
                <Icon name="close" />
              </button>
            </div>

            {authError && (
              <div style={{ padding: '12px', backgroundColor: 'rgba(255,50,50,0.1)', color: '#ff6b6b', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '16px' }}>
                {authError}
              </div>
            )}

            <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="auth-input-group">
                <label className="auth-label">Email Address</label>
                <input 
                  type="email" 
                  className="auth-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                />
              </div>
              <div className="auth-input-group">
                <label className="auth-label">Security Key</label>
                <input 
                  type="password" 
                  className="auth-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>

              <button 
                type="submit" 
                disabled={authLoading}
                style={{ 
                  marginTop: '10px', padding: '14px', 
                  backgroundColor: 'var(--text-primary)', color: 'var(--bg-base)', 
                  border: 'none', borderRadius: '12px', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                {authLoading ? 'System Authenticating...' : (isSignUp ? 'Initialize Account' : 'Establish Session')}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '12px', opacity: 0.6 }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            </div>

            <button 
              type="button" 
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
                width: '100%', padding: '12px', backgroundColor: 'transparent', 
                color: 'var(--text-primary)', border: '1px solid var(--border-strong)', 
                borderRadius: '12px', fontWeight: 600, fontSize: '0.95rem', 
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '18px', height: '18px' }} />
              Continue with Google
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button 
                onClick={() => setIsSignUp(!isSignUp)}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem' }}
              >
                {isSignUp ? 'Verify existing credentials instead' : 'Create a new player identity'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <SettingsModal 
          user={user} 
          onClose={() => setShowSettingsModal(false)} 
        />
      )}
      </div>
    </ScoreProvider>
  );
}

function SettingsModal({ user, onClose }) {
  const { highScores } = useScores();

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header" style={{ marginBottom: '24px' }}>
          <h2 className="modal-title">System & Profile</h2>
          <button onClick={onClose} className="modal-close">
            <Icon name="close" />
          </button>
        </div>

        <div style={{ overflowY: 'auto', paddingRight: '12px', scrollbarWidth: 'thin', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <section>
            <h3 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-label)', marginBottom: '16px' }}>Account Protocol</h3>
            {user ? (
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <p style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500, margin: 0 }}>{user.email || user.user_metadata?.full_name}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0 0' }}>Authorized Session</p>
              </div>
            ) : (
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Anonymous status detected. Progress stored in local cache only.</p>
              </div>
            )}
          </section>

          <section>
            <h3 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-label)', marginBottom: '16px' }}>Performance Logs</h3>
            {Object.keys(highScores).length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No session data recorded. Initialize an experience to generate logs.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                {Object.entries(highScores).map(([gameId, score]) => {
                  const gameInfo = GAMES.find(g => g.id === gameId);
                  const title = gameInfo ? gameInfo.title : gameId;
                  return (
                    <div key={gameId} style={{ 
                      padding: '12px', 
                      backgroundColor: 'rgba(255,255,255,0.04)', 
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{title}</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: 300, color: 'var(--accent)', letterSpacing: '-0.02em' }}>{score}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section style={{ paddingBottom: '16px' }}>
            <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--border-subtle)' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-label)', marginBottom: '8px' }}>Build Index</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>PixelArena v2.4.0-release</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status: All modules operational</div>
            </div>
          </section>
        </div>

        <button 
          onClick={onClose}
          style={{ 
            marginTop: '24px', padding: '14px', 
            backgroundColor: 'var(--text-primary)', color: 'var(--bg-base)', 
            border: 'none', borderRadius: '12px', fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Return to Hub
        </button>
      </div>
    </div>
  );
}
