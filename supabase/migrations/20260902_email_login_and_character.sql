alter table public.profiles add column if not exists login_email text;
alter table public.profiles add column if not exists character text;
create unique index if not exists profiles_login_email_unique on public.profiles (login_email) where login_email is not null;
create unique index if not exists profiles_username_lower_unique on public.profiles (lower(btrim(username)));
alter table public.profiles drop constraint if exists profiles_character_check;
alter table public.profiles add constraint profiles_character_check check (character is null or character in ('tommi.png','giampa.png','bretto.png','dave.png','tobi.png','rabe.png','giulia.png','laura.png','guido.png','iris.png','tosatto.png','rache.png'));
