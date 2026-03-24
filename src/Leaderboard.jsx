import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import './Leaderboard.css';

export default function Leaderboard() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeGame, setActiveGame] = useState('pacman'); // default

  // Limit leaderboard to ones that support scores clearly
  const gameTabs = [
    { id: 'pacman', name: 'Pac-Man' },
    { id: 'space-invaders', name: 'Space Inv' },
    { id: 'retro-snake', name: 'Snake' },
    { id: 'terminal-hacker', name: 'Hacker' },
    { id: 'rhythm-clicker', name: 'Rhythm' },
    { id: 'orb-chase', name: 'Orb Chase' }
  ];

  useEffect(() => {
    fetchScores();
  }, [activeGame]);

  const fetchScores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('high_scores')
        .select('*')
        .eq('game_id', activeGame)
        .order('score', { ascending: false })
        .limit(20);
        
      if (error) {
        console.error('Error fetching leaderboard:', error);
      } else {
        setScores(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getIdentDisplay = (row) => {
    if (row.user_id) return 'Verified Agent';
    if (row.guest_id) return `Ghost-${row.guest_id.slice(0,6).toUpperCase()}`;
    return 'Unknown Entity';
  };

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h2 style={{ textShadow: '0 0 10px var(--primary-color)'}}>Global Matrix</h2>
        <p>Top operatives ranked by net efficiency.</p>
      </div>

      <div className="leaderboard-tabs">
        {gameTabs.map(g => (
          <button 
            key={g.id} 
            className={`lb-tab ${activeGame === g.id ? 'active' : ''}`}
            onClick={() => setActiveGame(g.id)}
          >
            {g.name}
          </button>
        ))}
      </div>

      <div className="leaderboard-card">
        {loading ? (
          <div className="lb-loading">Syncing secure data...</div>
        ) : scores.length === 0 ? (
          <div className="lb-empty">No secure records found for this sector.</div>
        ) : (
          <table className="lb-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Callsign</th>
                <th className="right-align">Rating</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s, idx) => (
                <tr key={s.id} className={idx < 3 ? `top-rank-${idx+1}` : ''}>
                  <td className="lb-rank">
                    {idx === 0 ? '👑 1' : idx === 1 ? '⚔️ 2' : idx === 2 ? '🛡️ 3' : idx + 1}
                  </td>
                  <td className="lb-ident">{getIdentDisplay(s)}</td>
                  <td className="lb-score right-align">{s.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
