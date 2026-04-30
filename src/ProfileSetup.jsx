import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import './ProfileSetup.css';

const GAMES_LIST = [
  { id: 'pacman', name: 'Pac-Man' },
  { id: 'space-invaders', name: 'Space Invaders' },
  { id: 'retro-snake', name: 'Neon Snake' },
  { id: 'neon-tetris', name: 'Neon Tetris' },
  { id: 'grandmaster-chess', name: 'Chess' },
  { id: 'terminal-hacker', name: 'Terminal Hacker' },
  { id: 'rhythm-clicker', name: 'Pulse Rhythm' },
  { id: 'quantum-sweeper', name: 'Quantum Sweeper' },
  { id: 'neon-pong', name: 'Neon Pong' },
  { id: 'prism-break', name: 'Prism Break' },
  { id: 'neon-fusion', name: 'Neon Fusion' },
  { id: 'ludo-royale', name: 'Ludo Royale' },
  { id: 'retro-racer', name: 'Outwave Racer' },
];

export default function ProfileSetup({ user, onComplete }) {
  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''
  );
  const [bio, setBio] = useState('');
  const [favoriteGame, setFavoriteGame] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { error: upsertErr } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          display_name: displayName.trim(),
          avatar_url: avatarUrl,
          bio: bio.trim(),
          favorite_game: favoriteGame,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (upsertErr) throw upsertErr;
      onComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    // Auto-save minimal profile with defaults
    supabase.from('profiles').upsert({
      id: user.id,
      display_name: displayName || user.email?.split('@')[0] || 'Player',
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' }).then(() => onComplete());
  };

  return (
    <div className="profile-setup-overlay">
      <div className="profile-setup-modal">
        <div className="ps-header">
          <div className="ps-icon">
            <span className="material-symbols-outlined">person_add</span>
          </div>
          <h2>Initialize Player Profile</h2>
          <p>Set up your identity across the PixelArena network.</p>
        </div>

        {error && <div className="ps-error">{error}</div>}

        <div className="ps-form">
          <div className="ps-avatar-section">
            <div className="ps-avatar-preview">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" />
              ) : (
                <span className="material-symbols-outlined">account_circle</span>
              )}
            </div>
            <div className="ps-avatar-input">
              <label>Avatar URL</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
              <span className="ps-hint">Paste a link to your profile picture</span>
            </div>
          </div>

          <div className="ps-field">
            <label>Display Name <span className="required">*</span></label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your callsign"
              maxLength={30}
            />
          </div>

          <div className="ps-field">
            <label>Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell other players about yourself..."
              rows={3}
              maxLength={200}
            />
            <span className="ps-hint">{bio.length}/200</span>
          </div>

          <div className="ps-field">
            <label>Favorite Game</label>
            <select
              value={favoriteGame}
              onChange={(e) => setFavoriteGame(e.target.value)}
            >
              <option value="">Select a game...</option>
              {GAMES_LIST.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="ps-actions">
          <button className="ps-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Initializing...' : 'Save Profile'}
          </button>
          <button className="ps-btn-ghost" onClick={handleSkip}>
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
