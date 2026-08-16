-- Insert new coding battle badges safely checking for existing entries
INSERT INTO public.badges (name, icon, description, condition_type, condition_value, bonus_xp)
SELECT 'Battle Recruit', '⚔️', 'Joined your first coding battle', 'battles_joined', 1, 100
WHERE NOT EXISTS (SELECT 1 FROM public.badges WHERE name = 'Battle Recruit');

INSERT INTO public.badges (name, icon, description, condition_type, condition_value, bonus_xp)
SELECT 'Battle Warrior', '🛡️', 'Participated in 10 coding battles', 'battles_joined', 10, 500
WHERE NOT EXISTS (SELECT 1 FROM public.badges WHERE name = 'Battle Warrior');

INSERT INTO public.badges (name, icon, description, condition_type, condition_value, bonus_xp)
SELECT 'Battle Veteran', '⚡', 'Participated in 50 coding battles', 'battles_joined', 50, 2000
WHERE NOT EXISTS (SELECT 1 FROM public.badges WHERE name = 'Battle Veteran');

INSERT INTO public.badges (name, icon, description, condition_type, condition_value, bonus_xp)
SELECT 'Arena Master', '👑', 'Participated in 100 coding battles', 'battles_joined', 100, 5000
WHERE NOT EXISTS (SELECT 1 FROM public.badges WHERE name = 'Arena Master');
