# Struttura del progetto

- `index.html`: ingresso pubblico della PWA (Inizia, Continua e Accedi).
- `landing/`: stile e logica della pagina iniziale.
- `hub/`: studio virtuale, profilo, selezione del personaggio e stampante creativa.
- `games/`: un modulo autonomo per ogni minigioco. Ogni cartella contiene `index.html`, `game.js`, `game.css` e i propri `assets/`.
  - `feedback-invaders/`
  - `file-bomber/` (in precedenza chiamato Pacman nei file)
  - `deadline-drive/` (in precedenza chiamato Frogger nei file)
  - `pixel-punch/` (unica versione attiva)
- `shared/`: codice e stile condivisi da più giochi, inclusi audio, punteggi, rotazione, Supabase e schermate finali.
- `assets/`: risorse comuni all'intera applicazione: hub, avatar, audio e icona PWA.
- `supabase/`: configurazione e migrazioni del backend.
- `legacy/`: pagine precedenti conservate come riferimento, ma non usate dal flusso corrente.
- `tools/`: pagine tecniche di test, escluse dal flusso dell'app.

Le chiavi persistenti dei punteggi non sono state rinominate, così gli account e le classifiche già esistenti rimangono compatibili.
