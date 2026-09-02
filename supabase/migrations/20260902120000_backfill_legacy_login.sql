update public.profiles
set login_email = lower(btrim(username)),
    character = coalesce(character, 'tommi.png')
where login_email is null;
