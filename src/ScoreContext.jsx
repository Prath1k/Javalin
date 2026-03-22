import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const ScoreContext = createContext({
  highScores: {},
  updateHighScore: () => {},
});

export function ScoreProvider({ children, user }) {
  const [highScores, setHighScores] = useState({});

  // Load scores when user logs in
  useEffect(() => {
    async function fetchScores() {
      if (user) {
        const { data, error } = await supabase
          .from('high_scores')
          .select('game_id, score')
          .eq('user_id', user.id);

        if (!error && data) {
          const scores = {};
          data.forEach((row) => {
            scores[row.game_id] = row.score;
          });
          setHighScores(scores);
        }
      } else {
        setHighScores({});
      }
    }
    fetchScores();
  }, [user]);

  const updateHighScore = async (gameId, score) => {
    // Check if new score is higher
    const currentHighScore = highScores[gameId] || 0;
    
    if (score > currentHighScore) {
      // Update local state optimistic
      setHighScores((prev) => ({ ...prev, [gameId]: score }));

      // Save to Supabase if logged in
      if (user) {
        await supabase.from('high_scores').upsert(
          {
            user_id: user.id,
            game_id: gameId,
            score: score,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id, game_id' }
        );
      } else {
        // Fallback for non-logged-in users
        localStorage.setItem(`${gameId}_highscore`, score);
      }
    }
  };

  return (
    <ScoreContext.Provider value={{ highScores, updateHighScore }}>
      {children}
    </ScoreContext.Provider>
  );
}

export const useScores = () => useContext(ScoreContext);
