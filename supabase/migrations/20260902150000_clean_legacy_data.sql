begin;

-- Rimuove soltanto gli utenti Auth appartenenti ai profili dell'arcade.
delete from auth.users
where id in (
  select user_id
  from public.profiles
  where user_id is not null
);

-- Copre anche eventuali profili legacy privi di user_id.
delete from public.profiles;

-- Tabelle appartenenti ai flussi precedenti e non più usate dall'app.
drop table if exists public.account_migrations cascade;
drop table if exists public.game_scores cascade;
drop table if exists public.leaderboard cascade;

commit;
