const ArcadeScoreManager = (() => {
  const DEFAULT_STATS = Object.freeze({
    gamesPlayed: 0,
    feedbackInvaders: 0,
    cyberRun: 0,
    pixelPunch: 0,
    deadlineDrive: 0
  });

  const GAME_KEYS = new Set([
    'feedbackInvaders',
    'cyberRun',
    'pixelPunch',
    'deadlineDrive'
  ]);

  function toSafeInteger(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
  }

  function normalizeStats(value) {
    let parsed = value;

    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch (error) {
        parsed = {};
      }
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      parsed = {};
    }

    return {
      gamesPlayed: toSafeInteger(parsed.gamesPlayed),
      feedbackInvaders: toSafeInteger(parsed.feedbackInvaders),
      cyberRun: toSafeInteger(parsed.cyberRun),
      pixelPunch: toSafeInteger(parsed.pixelPunch),
      deadlineDrive: toSafeInteger(parsed.deadlineDrive)
    };
  }

  function buildNextStats(value, gameKey, score) {
    const stats = normalizeStats(value);
    stats[gameKey] = Math.max(stats[gameKey], toSafeInteger(score));
    stats.gamesPlayed += 1;
    return stats;
  }

  function updateLocalUser(currentUser, stats) {
    const updatedUser = { ...currentUser, stats: normalizeStats(stats) };
    localStorage.setItem('arcade_current_user', JSON.stringify(updatedUser));

    try {
      const users = JSON.parse(localStorage.getItem('arcade_users')) || {};
      if (updatedUser.username && users[updatedUser.username]) {
        users[updatedUser.username].stats = updatedUser.stats;
        localStorage.setItem('arcade_users', JSON.stringify(users));
      }
    } catch (error) {
      console.warn('Errore aggiornamento utenti locali:', error);
    }

    return updatedUser;
  }

  async function saveWithOptimisticUpdate(client, username, gameKey, score) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data: profile, error: readError } = await client
        .from('profiles')
        .select('stats')
        .eq('username', username)
        .maybeSingle();

      if (readError) throw readError;
      if (!profile) throw new Error('Profilo autenticato non trovato');

      const originalStats = profile.stats;
      const nextStats = buildNextStats(originalStats, gameKey, score);

      let updateQuery = client
        .from('profiles')
        .update({ stats: nextStats })
        .eq('username', username);

      updateQuery = originalStats === null
        ? updateQuery.is('stats', null)
        : updateQuery.eq('stats', JSON.stringify(originalStats));

      const { data: updatedRows, error: updateError } = await updateQuery
        .select('stats');

      if (updateError) throw updateError;
      if (updatedRows && updatedRows.length === 1) {
        return normalizeStats(updatedRows[0].stats);
      }
    }

    throw new Error('Salvataggio concorrente non completato');
  }

  async function saveGameScore({ client, currentUser, gameKey, score }) {
    if (!GAME_KEYS.has(gameKey)) throw new Error('Chiave gioco non valida');

    const safeScore = toSafeInteger(score);
    if (safeScore <= 0 || !currentUser) return currentUser;

    const localStats = buildNextStats(currentUser.stats, gameKey, safeScore);
    let updatedUser = updateLocalUser(currentUser, localStats);

    if (!client || !currentUser.username || currentUser.username.startsWith('GUEST_')) {
      return updatedUser;
    }

    const remoteStats = await saveWithOptimisticUpdate(
      client,
      currentUser.username,
      gameKey,
      safeScore
    );

    updatedUser = updateLocalUser(updatedUser, remoteStats);
    return updatedUser;
  }

  return { normalizeStats, saveGameScore };
})();

window.ArcadeScoreManager = ArcadeScoreManager;
