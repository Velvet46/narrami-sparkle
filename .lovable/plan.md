## Obiettivo

Trasformare MilleStorie in un'app **voice-first**: il genitore crea un account, registra il profilo del bambino (nome, età, paure, preferenze), e da quel momento il bambino tocca un solo tasto **🎤 Parla con MilleStorie** che apre una conversazione vocale completa: l'app saluta, chiede chi sta ascoltando, se vuole riascoltare una storia preferita o crearne una nuova, raccoglie eventuali preferenze al volo e genera/riprende la fiaba.

---

## 1. Backend: Lovable Cloud + profili

Attivo Lovable Cloud. Aggiungo auth email/password + Google per il **genitore** (non per il bimbo).

**Tabelle (migration):**
- `profiles` — 1 riga per account genitore (id = auth.users.id, display_name).
- `child_profiles` — uno o più bambini per genitore:
  - `id`, `parent_id` (FK auth.users), `name`, `age_range` (3-5/6-8/9-12), `favorite_color`, `favorite_animal`, `fears` (text), `preferred_voice`, `created_at`.
- `stories` — migrazione delle storie da localStorage al cloud:
  - `id`, `child_id` (FK), `title`, `subtitle`, `content`, `mode`, `duration`, `age`, `cover_key`, `favorite` (bool), `created_at`.

RLS: ogni genitore vede solo i propri figli e le storie dei propri figli. GRANT corretti per ogni tabella.

---

## 2. Onboarding (manuale, dal genitore)

Nuove route:
- `/auth` — login/signup (email+password, Google via broker Lovable).
- `/_authenticated/famiglia` — lista bambini + bottone "Aggiungi bambino" che apre il wizard.
- `/_authenticated/bambino/nuovo` — wizard 4 step: nome → età → colore/animale preferito → paure da evitare → scelta voce narratore (preview di ogni voce). Salva su `child_profiles`.

Dopo aver creato il primo profilo, il genitore torna in home: appare il bottone **🎤 Parla con MilleStorie** gigante al centro.

---

## 3. Voice assistant conversazionale (cuore della feature)

### 3a. Server route STT
- `src/routes/api/stt.ts` — proxy a Lovable AI `openai/gpt-4o-mini-transcribe` con streaming SSE. Riceve audio dal browser (webm/mp4), restituisce trascrizione in italiano.

### 3b. Conversation engine (client-side state machine)
File `src/lib/voice-conversation.ts`. Macchina a stati che alterna **TTS** (parla, già implementato) e **STT** (ascolta, MediaRecorder + invio al server). Stati:

1. **GREET** → "Ciao! Sono MilleStorie. Chi sta per ascoltare una storia stasera?" → ascolta.
2. **MATCH_CHILD** → cerca nel nome detto un match (case-insensitive, normalizzazione) tra i `child_profiles` del genitore. Se 0 match → "Non ti ho riconosciuto, provo di nuovo?" (max 2 retry, poi fallback tap). Se ≥2 match → "Sei Luca o Sofia?".
3. **ASK_TYPE** → "Bene <Nome>! Vuoi riascoltare una storia che ti è piaciuta o ne creiamo una nuova insieme?" → ascolta. Match keyword: "preferita/già/quella di…" vs "nuova/inventiamo/creiamo".
4a. **FAVORITES** → legge i preferiti del bambino, ne elenca max 3 ("Hai 'Il drago della luna', 'Stella la stellina', 'Bosco magico'. Quale scegli?"). Match titolo, → naviga a `/ascolta?id=...`.
4b. **NEW_STORY** → 2 micro-domande veloci pesate sull'età: "Di cosa vuoi che parli?" e "In che mondo? Bosco, spazio, castello o sorprendimi?". Compone uno `StoryDraft` con i dati salvati nel profilo (età, paure→fearsToAvoid, animale/colore preferiti) + risposte → naviga a `/genera`.
5. **CONFIRM** → "Perfetto, preparo la tua storia magica…" → naviga.

In ogni stato: timeout silenzio 6s, retry max 2, fallback al tap se STT fallisce.

### 3c. UI Voice Mode
- Nuova route `/_authenticated/parla` — schermo a tutto schermo con un orb animato che pulsa quando l'app parla (TTS) e respira quando ascolta (STT). Sottotitoli live di quello che dice l'app e di quello che capisce dal bimbo. Bottone X per uscire. Bottone "Usa i tasti" come fallback.

Il tasto **🎤 Parla con MilleStorie** in home apre `/parla`.

---

## 4. Sicurezza contenuti

Il flusso vocale **non passa mai testo grezzo del bambino al TTS o al generatore di storie**. Le risposte STT vengono usate solo per:
- match nome contro lista chiusa,
- match keyword (preferita/nuova) contro vocabolario fisso,
- estrazione di 1-2 parole tematiche (animale, ambientazione) sanitizzate prima di entrare nel prompt.

Il prompt di generazione resta quello già blindato in `stories.functions.ts`.

---

## 5. File toccati

**Nuovi:**
- `src/routes/api/stt.ts`
- `src/routes/auth.tsx`
- `src/routes/_authenticated/route.tsx` (gate Lovable-managed)
- `src/routes/_authenticated/famiglia.tsx`
- `src/routes/_authenticated/bambino.nuovo.tsx`
- `src/routes/_authenticated/parla.tsx`
- `src/lib/voice-conversation.ts`
- `src/lib/voice-recorder.ts` (MediaRecorder wrapper)
- `src/lib/child-profiles.functions.ts`
- `src/lib/stories-cloud.functions.ts`
- migration SQL per le 3 tabelle

**Modificati:**
- `src/routes/index.tsx` — sostituisce CTA principale con "🎤 Parla con MilleStorie" quando loggato + ha almeno un profilo.
- `src/routes/genera.tsx` + `ascolta.tsx` + `libreria.tsx` — leggono/salvano da cloud invece di localStorage (con fallback locale per ospite).
- `src/lib/story-store.ts` — wrapper che usa cloud se loggato, altrimenti localStorage.

---

## Note tecniche

- Lovable AI gateway già configurato (`LOVABLE_API_KEY`) → uso `gpt-4o-mini-transcribe` per STT e `gpt-4o-mini-tts` per TTS (già attivo).
- MediaRecorder con `audio/webm` (fallback `audio/mp4` Safari/iOS), guardia su blob < 1KB.
- Tutto il parsing/matching client-side, niente costi LLM extra per le micro-decisioni.
- Le storie generate restano salvate sotto il profilo del bambino → riascoltabili dalla libreria filtrata per bambino.

---

## Cosa NON faccio in questo round

- Voice ID biometrico (matching solo per nome, come confermato).
- Pagamenti / piani famiglia.
- App nativa / wake word "Hey MilleStorie" (richiede nativo).

Confermi e procedo?