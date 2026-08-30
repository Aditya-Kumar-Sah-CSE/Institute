-- Migration 123: Smart Learn Multiplayer Games System (RPS + Tic-Tac-Toe)

-- 1. Create game_sessions table
CREATE TABLE IF NOT EXISTS public.game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_type TEXT NOT NULL CHECK (game_type IN ('rock_paper_scissors', 'tic_tac_toe')),
    mode TEXT NOT NULL CHECK (mode IN ('bot', 'friend')),
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    target_wins INTEGER NOT NULL DEFAULT 1,
    host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    guest_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    host_symbol TEXT DEFAULT 'X',
    guest_symbol TEXT DEFAULT 'O',
    current_turn UUID REFERENCES public.profiles(id),
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'ready', 'playing', 'completed', 'cancelled', 'expired', 'forfeited')),
    host_ready BOOLEAN NOT NULL DEFAULT FALSE,
    guest_ready BOOLEAN NOT NULL DEFAULT FALSE,
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    winner_id UUID REFERENCES public.profiles(id),
    forfeited_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- 2. Create game_moves table
CREATE TABLE IF NOT EXISTS public.game_moves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    round INTEGER NOT NULL DEFAULT 1,
    move_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create player_game_stats table
CREATE TABLE IF NOT EXISTS public.player_game_stats (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    rps_played INTEGER NOT NULL DEFAULT 0,
    rps_wins INTEGER NOT NULL DEFAULT 0,
    rps_losses INTEGER NOT NULL DEFAULT 0,
    rps_draws INTEGER NOT NULL DEFAULT 0,
    rps_current_streak INTEGER NOT NULL DEFAULT 0,
    rps_best_streak INTEGER NOT NULL DEFAULT 0,
    ttt_played INTEGER NOT NULL DEFAULT 0,
    ttt_wins INTEGER NOT NULL DEFAULT 0,
    ttt_losses INTEGER NOT NULL DEFAULT 0,
    ttt_draws INTEGER NOT NULL DEFAULT 0,
    ttt_current_streak INTEGER NOT NULL DEFAULT 0,
    ttt_best_streak INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_sessions_host ON public.game_sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_guest ON public.game_sessions(guest_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON public.game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_type ON public.game_sessions(game_type);
CREATE INDEX IF NOT EXISTS idx_game_moves_game_id ON public.game_moves(game_id);

-- Enable RLS
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_game_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_sessions
CREATE POLICY "Users can view game sessions they participate in or public waiting rooms"
ON public.game_sessions FOR SELECT
USING (
    status = 'waiting' OR 
    auth.uid() = host_id OR 
    auth.uid() = guest_id
);

CREATE POLICY "Authenticated users can create game sessions"
ON public.game_sessions FOR INSERT
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Participants can update their game sessions"
ON public.game_sessions FOR UPDATE
USING (auth.uid() = host_id OR auth.uid() = guest_id);

-- RLS Policies for game_moves
CREATE POLICY "Participants can view game moves"
ON public.game_moves FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.game_sessions s 
        WHERE s.id = game_moves.game_id 
        AND (s.host_id = auth.uid() OR s.guest_id = auth.uid())
    )
);

CREATE POLICY "Participants can insert game moves"
ON public.game_moves FOR INSERT
WITH CHECK (auth.uid() = player_id);

-- RLS Policies for player_game_stats
CREATE POLICY "Anyone can view player game stats"
ON public.player_game_stats FOR SELECT
USING (true);

CREATE POLICY "Users can insert/update their own game stats"
ON public.player_game_stats FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own game stats"
ON public.player_game_stats FOR UPDATE
USING (auth.uid() = user_id);

-- 4. Atomic Procedure for match finalization and stats update
CREATE OR REPLACE FUNCTION public.finalize_game_match(
    p_game_id UUID,
    p_winner_id UUID DEFAULT NULL,
    p_is_draw BOOLEAN DEFAULT FALSE,
    p_status TEXT DEFAULT 'completed'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_game RECORD;
    v_host_stats RECORD;
    v_guest_stats RECORD;
BEGIN
    -- 1. Lock and fetch game session
    SELECT * INTO v_game FROM public.game_sessions WHERE id = p_game_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Game session not found');
    END IF;

    -- Prevent double finalization
    IF v_game.status IN ('completed', 'cancelled', 'forfeited', 'expired') THEN
        RETURN jsonb_build_object('success', true, 'message', 'Match already finalized', 'status', v_game.status);
    END IF;

    -- Update session status
    UPDATE public.game_sessions
    SET status = p_status,
        winner_id = p_winner_id,
        completed_at = now(),
        updated_at = now()
    WHERE id = p_game_id;

    -- If vs Bot or single player, only update host stats
    -- Ensure host stats row exists
    INSERT INTO public.player_game_stats (user_id)
    VALUES (v_game.host_id)
    ON CONFLICT (user_id) DO NOTHING;

    IF v_game.game_type = 'rock_paper_scissors' THEN
        IF p_is_draw THEN
            UPDATE public.player_game_stats
            SET rps_played = rps_played + 1,
                rps_draws = rps_draws + 1,
                updated_at = now()
            WHERE user_id = v_game.host_id;
        ELSIF p_winner_id = v_game.host_id THEN
            UPDATE public.player_game_stats
            SET rps_played = rps_played + 1,
                rps_wins = rps_wins + 1,
                rps_current_streak = rps_current_streak + 1,
                rps_best_streak = GREATEST(rps_best_streak, rps_current_streak + 1),
                updated_at = now()
            WHERE user_id = v_game.host_id;
        ELSE
            UPDATE public.player_game_stats
            SET rps_played = rps_played + 1,
                rps_losses = rps_losses + 1,
                rps_current_streak = 0,
                updated_at = now()
            WHERE user_id = v_game.host_id;
        END IF;
    ELSIF v_game.game_type = 'tic_tac_toe' THEN
        IF p_is_draw THEN
            UPDATE public.player_game_stats
            SET ttt_played = ttt_played + 1,
                ttt_draws = ttt_draws + 1,
                updated_at = now()
            WHERE user_id = v_game.host_id;
        ELSIF p_winner_id = v_game.host_id THEN
            UPDATE public.player_game_stats
            SET ttt_played = ttt_played + 1,
                ttt_wins = ttt_wins + 1,
                ttt_current_streak = ttt_current_streak + 1,
                ttt_best_streak = GREATEST(ttt_best_streak, ttt_current_streak + 1),
                updated_at = now()
            WHERE user_id = v_game.host_id;
        ELSE
            UPDATE public.player_game_stats
            SET ttt_played = ttt_played + 1,
                ttt_losses = ttt_losses + 1,
                ttt_current_streak = 0,
                updated_at = now()
            WHERE user_id = v_game.host_id;
        END IF;
    END IF;

    -- If guest is a real user (friend mode), update guest stats as well
    IF v_game.guest_id IS NOT NULL THEN
        INSERT INTO public.player_game_stats (user_id)
        VALUES (v_game.guest_id)
        ON CONFLICT (user_id) DO NOTHING;

        IF v_game.game_type = 'rock_paper_scissors' THEN
            IF p_is_draw THEN
                UPDATE public.player_game_stats
                SET rps_played = rps_played + 1,
                    rps_draws = rps_draws + 1,
                    updated_at = now()
                WHERE user_id = v_game.guest_id;
            ELSIF p_winner_id = v_game.guest_id THEN
                UPDATE public.player_game_stats
                SET rps_played = rps_played + 1,
                    rps_wins = rps_wins + 1,
                    rps_current_streak = rps_current_streak + 1,
                    rps_best_streak = GREATEST(rps_best_streak, rps_current_streak + 1),
                    updated_at = now()
                WHERE user_id = v_game.guest_id;
            ELSE
                UPDATE public.player_game_stats
                SET rps_played = rps_played + 1,
                    rps_losses = rps_losses + 1,
                    rps_current_streak = 0,
                    updated_at = now()
                WHERE user_id = v_game.guest_id;
            END IF;
        ELSIF v_game.game_type = 'tic_tac_toe' THEN
            IF p_is_draw THEN
                UPDATE public.player_game_stats
                SET ttt_played = ttt_played + 1,
                    ttt_draws = ttt_draws + 1,
                    updated_at = now()
                WHERE user_id = v_game.guest_id;
            ELSIF p_winner_id = v_game.guest_id THEN
                UPDATE public.player_game_stats
                SET ttt_played = ttt_played + 1,
                    ttt_wins = ttt_wins + 1,
                    ttt_current_streak = ttt_current_streak + 1,
                    ttt_best_streak = GREATEST(ttt_best_streak, ttt_current_streak + 1),
                    updated_at = now()
                WHERE user_id = v_game.guest_id;
            ELSE
                UPDATE public.player_game_stats
                SET ttt_played = ttt_played + 1,
                    ttt_losses = ttt_losses + 1,
                    ttt_current_streak = 0,
                    updated_at = now()
                WHERE user_id = v_game.guest_id;
            END IF;
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'status', p_status, 'winner_id', p_winner_id);
END;
$$;
