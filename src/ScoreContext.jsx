import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const ScoreContext = createContext({
  highScores: {},
  updateHighScore: () => {},
  logGameSession: () => {},
  guestId: null,
});

export function ScoreProvider({ children, user }) {
  const [highScores, setHighScores] = useState({});
  const [guestId, setGuestId] = useState(null);

  // Initialize Guest ID if no user is logged in
  useEffect(() => {
    let storedGuest = localStorage.getItem('pixelarena_guest_id');
    if (!storedGuest) {
      storedGuest = 'Guest-' + Math.floor(Math.random() * 10000);
      localStorage.setItem('pixelarena_guest_id', storedGuest);
    }
    setGuestId(storedGuest);
  }, []);

  // Load scores when user logs in
  useEffect(() => {
    async function fetchScores() {
      const fetchId = user ? user.id : guestId;
      if (!fetchId) return;

      try {
        const query = supabase.from('high_scores').select('game_id, score');
        if (user) {
          query.eq('user_id', user.id);
        } else {
          query.eq('guest_id', guestId).is('user_id', null);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching scores:', error);
          return;
        }

        if (data) {
          const scores = {};
          data.forEach((row) => {
            scores[row.game_id] = row.score;
          });
          setHighScores(scores);
        }
      } catch (err) {
        console.error('Fetch scores exception:', err);
      }
    }
    fetchScores();
  }, [user, guestId]);

  const updateHighScore = async (gameId, score) => {
    // 1. Update local state immediately for responsiveness
    const currentHighScore = highScores[gameId] || 0;
    if (score <= currentHighScore) return;

    setHighScores((prev) => ({ ...prev, [gameId]: score }));

    // 2. Persist to Supabase
    try {
      if (user) {
        const { error } = await supabase.from('high_scores').upsert(
          {
            user_id: user.id,
            game_id: gameId,
            score: score,
            updated_at: new Date().toISOString(),
            display_name: user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Player'
          },
          { onConflict: 'user_id,game_id' }
        );
        if (error) console.error('Supabase HighScore Error (Auth):', error);
      } else if (guestId) {
        const { error } = await supabase.from('high_scores').upsert(
          {
            guest_id: guestId,
            game_id: gameId,
            score: score,
            updated_at: new Date().toISOString(),
            display_name: `Guest ${guestId.split('-')[1] || guestId}`
          },
          { onConflict: 'guest_id,game_id' }
        );
        if (error) console.error('Supabase HighScore Error (Guest):', error);
        localStorage.setItem(`${gameId}_highscore`, score);
      }
    } catch (err) {
      console.error('Update high score exception:', err);
    }
  };

  // Log a game session
  const logGameSession = async (gameId, score = 0, durationSeconds = 0) => {
    if (!user) return; 
    
    try {
      const { error } = await supabase.from('game_sessions').insert({
        user_id: user.id,
        game_id: gameId,
        score,
        duration_seconds: durationSeconds,
        played_at: new Date().toISOString(),
      });
      if (error) console.error('Log Session Error:', error);
    } catch (err) {
      console.error('Log session exception:', err);
    }
  };


  return (
    <ScoreContext.Provider value={{ highScores, updateHighScore, logGameSession, guestId }}>
      {children}
    </ScoreContext.Provider>
  );
}

export const useScores = () => useContext(ScoreContext);
