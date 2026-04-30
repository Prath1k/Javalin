import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useScores } from './ScoreContext';
import './Leaderboard.css';

export default function Leaderboard({ user }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeGame, setActiveGame] = useState('pacman');

  const gameTabs = [
    { id: 'pacman', name: 'Pac-Man' },
    { id: 'space-invaders', name: 'Space Inv' },
    { id: 'retro-snake', name: 'Snake' },
    { id: 'terminal-hacker', name: 'Hacker' },
    { id: 'rhythm-clicker', name: 'Rhythm' },
    { id: 'orb-chase', name: 'Orb Chase' },
    { id: 'neon-tetris', name: 'Tetris' },
    { id: 'prism-break', name: 'Breakout' },
    { id: 'neon-fusion', name: '2048' },
  ];

  useEffect(() => {
    fetchScores();
  }, [activeGame]);

  const fetchScores = async () => {
    setLoading(true);
    try {
      // Join with profiles to get avatar_url
      const { data, error } = await supabase
        .from('high_scores')
        .select(`
          *,
          profiles:user_id (
            display_name,
            avatar_url
          )
        `)
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

  const getDisplayInfo = (row) => {
    // If linked to a profile, use that
    if (row.profiles) {
      return {
        name: row.profiles.display_name || 'Player',
        avatar: row.profiles.avatar_url || '',
        isUser: user && row.user_id === user.id,
      };
    }
    // Fallback to display_name on high_scores row
    if (row.display_name && row.display_name !== 'Player') {
      return {
        name: row.display_name,
        avatar: '',
        isUser: false,
      };
    }
    // Guest
    if (row.guest_id) {
      return {
        name: `Ghost-${row.guest_id.slice(0, 6).toUpperCase()}`,
        avatar: '',
        isUser: false,
      };
    }
    return { name: 'Unknown', avatar: '', isUser: false };
  };

  const getRankEmoji = (idx) => {
    if (idx === 0) return '👑';
    if (idx === 1) return '⚔️';
    if (idx === 2) return '🛡️';
    return '';
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
              {scores.map((s, idx) => {
                const info = getDisplayInfo(s);
                return (
                  <tr key={s.id} className={`${idx < 3 ? `top-rank-${idx+1}` : ''} ${info.isUser ? 'lb-you' : ''}`}>
                    <td className="lb-rank">
                      {getRankEmoji(idx)} {idx + 1}
                    </td>
                    <td className="lb-ident">
                      <div className="lb-player-info">
                        {info.avatar && (
                          <img src={info.avatar} alt="" className="lb-avatar" />
                        )}
                        <span>{info.name}</span>
                        {info.isUser && <span className="lb-you-badge">YOU</span>}
                      </div>
                    </td>
                    <td className="lb-score right-align">{s.score.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
