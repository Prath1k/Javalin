import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const ScoreContext = createContext({
  highScores: {},
  updateHighScore: () => {},
  leaderboardDetails: {},
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

  // Load scores when user logs in (or load guest scores from server?)
  // For guests, we can also load their highscores from Supabase if we want their local state synced.
  useEffect(() => {
    async function fetchScores() {
      const fetchId = user ? user.id : guestId;
      const idColumn = user ? 'user_id' : 'guest_id';
      
      if (fetchId) {
        // Build the query to check either user_id or guest_id based on login state
        const { data, error } = user 
          ? await supabase.from('high_scores').select('game_id, score').eq('user_id', user.id)
          : await supabase.from('high_scores').select('game_id, score').eq('guest_id', guestId).is('user_id', null);

        if (!error && data) {
          const scores = {};
          data.forEach((row) => {
            scores[row.game_id] = row.score;
          });
          
          // Merge with any local scores just in case server is wiped
          const merged = { ...scores };
          setHighScores(merged);
        }
      } else {
        setHighScores({});
      }
    }
    fetchScores();
  }, [user, guestId]);

  const updateHighScore = async (gameId, score) => {
    const currentHighScore = highScores[gameId] || 0;
    
    if (score > currentHighScore) {
      setHighScores((prev) => ({ ...prev, [gameId]: score }));

      if (user) {
        await supabase.from('high_scores').upsert(
          {
            user_id: user.id,
            game_id: gameId,
            score: score,
            updated_at: new Date().toISOString(),
            display_name: user.user_metadata?.full_name || user.email || 'Player'
          },
          { onConflict: 'user_id, game_id' }
        );
      } else if (guestId) {
        await supabase.from('high_scores').upsert(
          {
            guest_id: guestId,
            game_id: gameId,
            score: score,
            updated_at: new Date().toISOString(),
            display_name: guestId
          },
          { onConflict: 'guest_id, game_id' }
        );
        localStorage.setItem(`${gameId}_highscore`, score);
      }
    }
  };

  return (
    <ScoreContext.Provider value={{ highScores, updateHighScore, guestId }}>
      {children}
    </ScoreContext.Provider>
  );
}

export const useScores = () => useContext(ScoreContext);
