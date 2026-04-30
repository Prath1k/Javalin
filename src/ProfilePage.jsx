import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import './ProfilePage.css';

const GAMES_MAP = {
  'pacman': 'Pac-Man',
  'space-invaders': 'Space Invaders',
  'bottle-spin': 'Bottle Spin 2.0',
  'retro-snake': 'Neon Snake',
  'memory-match': 'Glass Memory',
  'rhythm-clicker': 'Pulse Rhythm',
  'terminal-hacker': 'Terminal Hacker',
  'quantum-sweeper': 'Quantum Sweeper',
  'neon-pong': 'Neon Pong',
  'neon-air-hockey': 'Neon Air Hockey',
  'sort-viz': 'Sort Viz',
  'hex-connect': 'Hex Connect',
  'grandmaster-chess': 'Grandmaster Chess',
  'ludo-royale': 'Ludo Royale',
  'orb-chase': 'Orb Chase',
  'neon-tetris': 'Neon Tetris',
  'prism-break': 'Prism Break',
  'neon-fusion': 'Neon Fusion',
  'the-glitch': 'The Glitch',
  'orbit-royale': 'Orbit Royale',
  'vector-race': 'Vector Race',
  'infection-tag': 'Infection Tag',
  'snakes-ladders': 'Snakes & Ladders',
  'retro-racer': 'Outwave Racer',
};

const GAMES_LIST = Object.entries(GAMES_MAP).map(([id, name]) => ({ id, name }));

const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

export default function ProfilePage({ user }) {
  const [profile, setProfile] = useState(null);
  const [highScores, setHighScores] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    if (user) fetchAllData();
  }, [user]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(prof);
      setEditForm(prof || {});

      // Fetch high scores
      const { data: scores } = await supabase
        .from('high_scores')
        .select('*')
        .eq('user_id', user.id)
        .order('score', { ascending: false });

      setHighScores(scores || []);

      // Fetch recent sessions
      const { data: sess } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('played_at', { ascending: false })
        .limit(20);

      setSessions(sess || []);
    } catch (err) {
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: editForm.display_name?.trim(),
          bio: editForm.bio?.trim() || '',
          avatar_url: editForm.avatar_url || '',
          favorite_game: editForm.favorite_game || '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile({ ...profile, ...editForm, updated_at: new Date().toISOString() });
      setEditing(false);
      setSaveMsg('Profile updated!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      setSaveMsg('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="profile-page">
        <div className="pp-empty">
          <Icon name="lock" />
          <h3>Authentication Required</h3>
          <p>Sign in to access your player profile and stats.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="profile-page">
        <div className="pp-loading">
          <div className="pp-spinner"></div>
          <p>Loading profile data...</p>
        </div>
      </div>
    );
  }

  // Compute stats
  const totalGamesPlayed = sessions.length;
  const totalScore = highScores.reduce((sum, s) => sum + s.score, 0);
  const bestScore = highScores.length > 0 ? highScores[0] : null;
  const uniqueGames = new Set(highScores.map(s => s.game_id)).size;
  const memberSince = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'Unknown';

  const formatTime = (seconds) => {
    if (!seconds) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="profile-page">
      {/* Profile Card */}
      <div className="pp-card">
        <div className="pp-card-bg"></div>
        <div className="pp-card-content">
          <div className="pp-avatar">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" />
            ) : (
              <Icon name="account_circle" className="pp-avatar-icon" />
            )}
            <div className="pp-avatar-ring"></div>
          </div>
          <div className="pp-info">
            <h2>{profile?.display_name || 'Player'}</h2>
            {profile?.bio && <p className="pp-bio">{profile.bio}</p>}
            <div className="pp-meta">
              <span><Icon name="calendar_month" /> Joined {memberSince}</span>
              {profile?.favorite_game && (
                <span><Icon name="favorite" /> {GAMES_MAP[profile.favorite_game] || profile.favorite_game}</span>
              )}
            </div>
          </div>
          <button className="pp-edit-btn" onClick={() => setEditing(!editing)}>
            <Icon name={editing ? 'close' : 'edit'} />
          </button>
        </div>
      </div>

      {saveMsg && <div className="pp-save-msg">{saveMsg}</div>}

      {/* Edit Form */}
      {editing && (
        <div className="pp-edit-section">
          <h3>Edit Profile</h3>
          <div className="pp-edit-form">
            <div className="pp-edit-field">
              <label>Display Name</label>
              <input
                type="text"
                value={editForm.display_name || ''}
                onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                maxLength={30}
              />
            </div>
            <div className="pp-edit-field">
              <label>Avatar URL</label>
              <input
                type="url"
                value={editForm.avatar_url || ''}
                onChange={(e) => setEditForm({ ...editForm, avatar_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="pp-edit-field">
              <label>Bio</label>
              <textarea
                value={editForm.bio || ''}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                rows={3}
                maxLength={200}
              />
            </div>
            <div className="pp-edit-field">
              <label>Favorite Game</label>
              <select
                value={editForm.favorite_game || ''}
                onChange={(e) => setEditForm({ ...editForm, favorite_game: e.target.value })}
              >
                <option value="">None</option>
                {GAMES_LIST.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <button className="pp-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="pp-stats-grid">
        <div className="pp-stat-card">
          <Icon name="sports_esports" className="stat-icon" />
          <div className="stat-value">{totalGamesPlayed}</div>
          <div className="stat-label">Games Played</div>
        </div>
        <div className="pp-stat-card">
          <Icon name="emoji_events" className="stat-icon" />
          <div className="stat-value">{totalScore.toLocaleString()}</div>
          <div className="stat-label">Total Score</div>
        </div>
        <div className="pp-stat-card">
          <Icon name="star" className="stat-icon" />
          <div className="stat-value">{bestScore ? bestScore.score.toLocaleString() : '—'}</div>
          <div className="stat-label">Best Score</div>
        </div>
        <div className="pp-stat-card">
          <Icon name="grid_view" className="stat-icon" />
          <div className="stat-value">{uniqueGames}</div>
          <div className="stat-label">Games Explored</div>
        </div>
      </div>

      {/* High Scores */}
      <div className="pp-section">
        <h3><Icon name="military_tech" /> Personal Bests</h3>
        {highScores.length === 0 ? (
          <div className="pp-empty-small">No scores recorded yet. Play some games!</div>
        ) : (
          <div className="pp-scores-grid">
            {highScores.map(s => (
              <div key={s.game_id} className="pp-score-item">
                <span className="pp-score-game">{GAMES_MAP[s.game_id] || s.game_id}</span>
                <span className="pp-score-value">{s.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="pp-section">
        <h3><Icon name="history" /> Recent Activity</h3>
        {sessions.length === 0 ? (
          <div className="pp-empty-small">No recent sessions. Start playing to see your history!</div>
        ) : (
          <div className="pp-activity-list">
            {sessions.map(s => (
              <div key={s.id} className="pp-activity-item">
                <div className="pp-activity-game">
                  <span className="pp-activity-name">{GAMES_MAP[s.game_id] || s.game_id}</span>
                  {s.score > 0 && <span className="pp-activity-score">{s.score.toLocaleString()} pts</span>}
                </div>
                <div className="pp-activity-meta">
                  {s.duration_seconds > 0 && <span>{formatTime(s.duration_seconds)}</span>}
                  <span>{timeAgo(s.played_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
