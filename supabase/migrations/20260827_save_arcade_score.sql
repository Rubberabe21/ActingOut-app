create or replace function public.save_arcade_score(
  p_game_key text,
  p_score bigint
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  current_stats jsonb;
  normalized_stats jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_game_key not in (
    'feedbackInvaders',
    'cyberRun',
    'pixelPunch',
    'deadlineDrive'
  ) then
    raise exception 'Invalid game key';
  end if;

  if p_score is null or p_score <= 0 then
    raise exception 'Invalid score';
  end if;

  select stats
    into current_stats
    from public.profiles
   where user_id = auth.uid()
   for update;

  if not found then
    raise exception 'Authenticated profile not found';
  end if;

  if current_stats is null then
    normalized_stats := '{}'::jsonb;
  elsif jsonb_typeof(current_stats) = 'object' then
    normalized_stats := current_stats;
  elsif jsonb_typeof(current_stats) = 'string' then
    begin
      normalized_stats := (current_stats #>> '{}')::jsonb;
      if jsonb_typeof(normalized_stats) <> 'object' then
        normalized_stats := '{}'::jsonb;
      end if;
    exception when others then
      normalized_stats := '{}'::jsonb;
    end;
  else
    normalized_stats := '{}'::jsonb;
  end if;

  normalized_stats := jsonb_build_object(
    'gamesPlayed', 0,
    'feedbackInvaders', 0,
    'cyberRun', 0,
    'pixelPunch', 0,
    'deadlineDrive', 0
  ) || normalized_stats;

  normalized_stats := jsonb_set(
    normalized_stats,
    array[p_game_key],
    to_jsonb(greatest(
      case
        when (normalized_stats ->> p_game_key) ~ '^\d+$'
          then (normalized_stats ->> p_game_key)::bigint
        else 0
      end,
      p_score
    )),
    true
  );

  normalized_stats := jsonb_set(
    normalized_stats,
    '{gamesPlayed}',
    to_jsonb(
      case
        when (normalized_stats ->> 'gamesPlayed') ~ '^\d+$'
          then (normalized_stats ->> 'gamesPlayed')::bigint
        else 0
      end + 1
    ),
    true
  );

  update public.profiles
     set stats = normalized_stats
   where user_id = auth.uid();

  return normalized_stats;
end;
$$;

revoke all on function public.save_arcade_score(text, bigint) from public;
revoke all on function public.save_arcade_score(text, bigint) from anon;
grant execute on function public.save_arcade_score(text, bigint) to authenticated;
