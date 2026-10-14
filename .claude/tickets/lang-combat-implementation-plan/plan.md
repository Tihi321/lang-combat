# Lang Combat — implementation plan

> Ticket folder: `.claude/tickets/lang-combat-implementation-plan/` — canonical location:
> `C:\projects\Personal\lang-combat\.claude\tickets\lang-combat-implementation-plan\plan.md`;
> later revisions go there. Implementation runs through the global `implement` skill with that path.
> Branch: `lang-combat-implementation` (base `master` @ 8cac12c).

## Context
A German-learning text adventure for Android (mobile game). Zork-style rooms; the player acts only by typing German. As in WarriorJS, each floor unlocks a new grammar feature. Errors are in-world: an NPC misunderstands instead of the game showing a red X. Fully offline, no backend.

Repo: C:\projects\Personal\lang-combat (only `README.md` + initial commit on `master`)
Package id: org.selak.langcombat (permanent, do not change)

Environment checked: Node v24.14.0, npm 11.9.0. **No JDK and no `ANDROID_HOME`** — Phases 0–3 are fine without them (`npx cap add android` only generates the project), Phase 4 needs JDK 21 + Android SDK (Android Studio) installed first.

## Stack
- Vite + React + TypeScript
- Capacitor for Android (`@capacitor/core`, `@capacitor/android`, `@capacitor/preferences` for saves)
- Vitest for tests
- `src/core/` must be pure TS with no React or DOM imports, so it can later be replaced by a Rust→WASM module.

## Structure
```
src/
  core/
    lexicon.ts      # types + Floor 1 vocabulary
    grammar.ts      # article tables, case/gender logic
    tokenize.ts     # normalization, umlaut fallback
    parser.ts       # text -> Command | GrammarError
    engine.ts       # GameState + apply(command) -> events
    hints.ts        # GrammarError -> one-line rule explanation
  levels/
    floor1.json
  ui/
    Terminal.tsx    # output log + input
    WordChips.tsx   # tappable vocab + articles
    UmlautRow.tsx   # ä ö ü ß buttons
  App.tsx
tests/
  parser.test.ts
  engine.test.ts
```

## Working rules
- Implement one phase at a time. Stop after each phase, summarize what changed, and wait for review.
- Commit per phase.
- Keep code small and readable; no premature abstraction.

---

## Phase 0: Scaffold
- `npm create vite@latest . -- --template react-ts` — the dir is not empty (README.md), so either scaffold into `.claude/temp/vite-scaffold` and copy the files in, or answer the "ignore files and continue" prompt non-interactively. Keep the existing README.md.
- Install Capacitor core/android/preferences, `@capacitor/cli` and vitest as dev deps.
- `npx cap init "Lang Combat" org.selak.langcombat --web-dir dist`, then `npx cap add android`
- Add `.gitignore` entries for keystores (`*.jks`, `*.keystore`), `keystore.properties`, `android/app/release/`, and `.claude/temp/`.
- Add `"test": "vitest run"` script; vitest config includes `tests/**/*.test.ts`.
- **Done when:** `npm run dev` shows a placeholder page and `npm test` runs (zero tests ok).

**Status (Phase 0): DONE.** Scaffolded via `create-vite` (react-ts, `--no-interactive`) into `.claude/temp/vite-scaffold`, copied to root (README kept). Versions: vite 8.3.4, react 19.2, typescript 6.0, vitest 5.0.4, @capacitor/* 8.x, oxlint (template lint). Verified: `npm test` exit 0 (no test files, passWithNoTests); `npm run build` ok; `npm run lint` ok; dev server served placeholder HTML (title "Lang Combat", `#root`) then stopped; `capacitor.config.ts` appId `org.selak.langcombat`; `android/app/build.gradle` applicationId `org.selak.langcombat`. Deviations: ran `npm run build` before `cap add android` (dist needed); added `tests/.gitkeep`; vitest config lives in `vite.config.ts`; removed demo assets, `App.css`, `public/icons.svg`.

## Phase 1: Core grammar + parser (Floor 1 scope)
**Floor 1 grammar:** du-imperative + accusative noun phrase, plus fixed movement phrases.
- Valid: `Nimm den Schlüssel`, `Öffne die Tür`, `Untersuche das Buch`, `Schau`, `Geh nach Norden`
- Directions are fixed phrases (`nach Norden/Süden/Osten/Westen`). No general dative yet.
- `Hilfe` is also recognized by the parser as a meta command (used in Phase 2).

**Types (`lexicon.ts`):**
- `Gender = 'm' | 'f' | 'n'`, `Case = 'nom' | 'acc' | 'dat' | 'gen'`
- `Noun { lemma, gender, plural? }`
- `Verb { infinitive, imperativeDu: string[], separablePrefix?, frame: Case[] }`. `imperativeDu` accepts variants (`nimm`; `geh`/`gehe`). `schauen` has `frame: []`.
- Floor 1 vocab: verbs nehmen, öffnen, untersuchen, schauen, gehen. Nouns der Schlüssel, die Tür, das Buch, die Kerze, der Tisch, die Truhe (extended to ~10 in Phase 2 to match floor content).

**`grammar.ts`:** definite and indefinite article tables by gender × case, plus a lookup returning which (gender, case) combinations an article form can mean. Note that `die` is ambiguous between f/acc, f/nom, and plural.

**`tokenize.ts`:**
- Lowercase for matching but keep the original for display.
- Umlaut fallback: try the token as typed first. Only if it doesn't match, retry with `ae→ä, oe→ö, ue→ü, ss→ß`. Never normalize blindly, or words like "Feuer" break.

**`parser.ts`:**
`parse(input, lexicon) -> { ok: Command } | { err: GrammarError }`

`GrammarError` kinds, each carrying enough data for a specific hint:
- `UnknownWord { word }`
- `UnknownVerb { word }`
- `MissingObject { verb }`
- `MissingArticle { noun }`
- `WrongCase { noun, article, expectedCase, gotCase }`, e.g. `der Schlüssel` used as an object
- `WrongGender { noun, article, expectedGender }`, e.g. `den Tür`
- `WrongWordOrder { detail }`, e.g. the verb not first

Disambiguate: if an article fits the noun's gender but in the wrong case, return WrongCase. If it fits no case for that gender, return WrongGender.

**Tests (`parser.test.ts`):** table-driven, at least 25 cases covering every error kind, umlaut fallback (`Oeffne die Tuer`), case-insensitivity, extra whitespace, and the "Feuer" false-normalization guard.
- **Done when:** all tests pass.

**Status (Phase 1): DONE (not committed).** Added `src/core/{lexicon,grammar,tokenize,parser}.ts` and `tests/parser.test.ts` (53 tests: 22 valid, 23 error, details, article lookup). Verified: `npm test` 53 passed; `npm run build` (`tsc -b`) ok; `npm run lint` ok; grep for react/window/document in `src/core` prints nothing. Design: `Command` = `act{verb,object?{noun,article,definite},raw}` | `go{direction,raw}` | `help{raw}`; `Schau` = act/schauen. Precedence: empty -> UnknownVerb(''); non-verb first + later verb -> WrongWordOrder; else UnknownVerb; trailing extra tokens -> UnknownWord (first extra); `Geh`/`Geh nach` -> MissingObject; WrongCase reports nom if possible. Deviations: umlaut fallback tries every subset of the 4 rules (as typed first), since applying all at once turns `Schluessel` into `schlüßel`; lexicon adds `Feuer` (n); `tsconfig.app.json` include now `["src","tests"]` so tests are type-checked.

## Phase 2: Engine + Floor 1 content
**`engine.ts`:**
- `GameState { roomId, inventory, flags, lastError? }`
- `apply(state, Command) -> { state, events: GameEvent[] }`. Pure function, no side effects.
- Game-level failures are separate from grammar errors: `ObjectNotHere`, `NotTakeable`, `Locked`.

**In-world error text:** map each GrammarError to a short in-character line. Example for WrongCase: *"Der Schlüssel? Er liegt doch da. Was willst du mit ihm machen?"*. Keep the messages in a table, not scattered through the code.

**`Hilfe` command:** explains the rule behind `lastError` in one line of English (via `hints.ts`), e.g. "nehmen takes an accusative object: der → den for masculine nouns."

**`floor1.json` schema:** rooms (id, description, exits), entities (id, noun lemma, room, takeable, locked, opensWith), goal flag. Content: 3 rooms. The goal is to find the key in the chest, take it, and open the door. About 10 nouns in total (add missing nouns to the lexicon; a test asserts every entity lemma exists in the lexicon).

**Tests (`engine.test.ts`):** a full walkthrough from start to win, plus each game-level failure.
- **Done when:** a scripted playthrough passes in tests.

**Status (Phase 2): DONE (not committed).** Added `src/core/{engine,messages,hints}.ts`, `src/levels/floor1.json`, `tests/engine.test.ts` (22 tests); lexicon gained Kamin (m), Regal (n), Sessel (m) (10 nouns). API: `initialState`, `apply(level, state, cmd)`, `step(level, state, input)`, `FLOOR1`. Rooms: kueche -N-> flur -E-> salon; win = Öffne die Tür with the key (key is `inside` the Truhe). Verified: `npm test` 75 passed (53 parser + 22 engine); `npm run build` ok; `npm run lint` ok; core grep prints nothing. Deviations: extra game errors NoExit/AlreadyOpen/NotOpenable/AlreadyHave; parser untouched; `goalFlag` is `open:tuer`.

## Phase 3: UI
- `Terminal.tsx`: scrolling log with player input echoed and responses in a different style; monospace; dark theme.
- Input: `autoCorrect="off" autoCapitalize="off" spellCheck={false}`, submit on Enter.
- `UmlautRow.tsx`: ä ö ü ß buttons that insert at the cursor.
- `WordChips.tsx`: chips for the verbs, the nouns visible in the current room, and all articles (der die das den dem des ein eine einen). Tapping appends to the input. The player still has to pick the article.
- Save and restore `GameState` via `@capacitor/preferences`, falling back to localStorage on web. Add a "Neues Spiel" reset.
- **Done when:** Floor 1 is playable start to finish in the browser on a phone-sized viewport.
**Status (Phase 3): DONE (not committed; in-browser playthrough left to orchestrator).** Added `src/ui/{Terminal,WordChips,UmlautRow}.tsx`, `src/ui/storage.ts`, `src/ui/types.ts` (`LogEntry`); rewrote `App.tsx`, `index.css`; `index.html` lang=de; `visibleNouns(level, state)` exported from engine + 1 test (76 tests pass). App owns state/log/input; Terminal is the log only, the input form lives in App. Saves `{state, log<=300}` under `lang-combat:save:v1` via Capacitor Preferences with localStorage fallback; loaded once before first render; saved after every step; corrupt saves ignored. Verified: `npm test` 76 passed, `npm run build` ok, `npm run lint` ok, core purity grep empty, dev server returned HTTP 200 then stopped. Deviations: direction chips limited to current room exits (added); chips append `word + ' '`; input echo/log kind `LogEntry` in `src/ui/types.ts`.

## Phase 4: Android
- Prerequisite: install JDK 21 + Android SDK (Android Studio), set `ANDROID_HOME`.
- `npm run build && npx cap sync`, run on emulator and a real device.
- App icon and splash (placeholder art is fine).
- Release signing: document the keystore generation and the Gradle signing config reading from env or a local `keystore.properties` (gitignored). Produce a release `.aab`.
- **Done when:** a signed `.aab` builds and installs via internal testing.

**Status (Phase 4, part 1: non-SDK work): DONE (committed 19bf6d9).** Added release signing in `android/app/build.gradle` (keystore.properties, else `LANG_COMBAT_*` env vars; applied only if all four values present), `android/keystore.properties.example`, `docs/android-release.md`, README intro + link, `.gitattributes`, `release-keys/` in `.gitignore`, npm scripts `android:sync|bundle|run` (bundle uses `scripts/gradle.mjs` to pick gradlew.bat vs ./gradlew), placeholder art in `assets/` (SVG sources + PNGs, rendered by `scripts/make-icons.mjs` via sharp; bg #111, "LC" in accent #4a90d9), `@capacitor/assets` dev dep (worked on Node 24; mipmap + splash resources regenerated). Verified: tests, build, lint, `npx cap sync android` ok. Remaining (needs SDK): Gradle build, emulator/device run, keystore generation, signed `bundleRelease`, Play internal testing.

**Status (Phase 4, part 2): DONE except real device + Play upload.** JDK 21 + Android Studio installed via winget; SDK installed by the user via the Studio wizard; upload keystore generated by the user (`release-keys/lang-combat-upload.jks`, alias `upload`, gitignored). `npm run android:bundle` -> BUILD SUCCESSFUL, `android/app/build/outputs/bundle/release/app-release.aab` (3.2 MB), `jarsigner -verify` = jar verified, signed by CN=Tihomir Selak. Debug build installed and played on emulator `Medium_Phone_API_37.0` (keyboard + layout OK). Fixed `scripts/gradle.mjs` to call gradlew.bat by absolute path (NoDefaultCurrentDirectoryInExePath). Not done: real device run, Play Console internal-testing upload (user action).

## Out of scope (later floors)
Dative (Floor 2, `Gib dem Wächter das Brot`), Wechselpräpositionen, separable verbs, the scripting floor (`Wenn … dann …` with verb-final order), TTS for NPC lines, LLM hint fallback.

## Verification (per phase)
- Phase 0: `npm run dev` serves placeholder; `npm test` exits 0.
- Phase 1: `npm test` — parser table (≥25 cases) green; `npx tsc --noEmit` clean; `src/core/` has no `react`/DOM imports (grep).
- Phase 2: `npm test` — walkthrough + failure tests green.
- Phase 3: play Floor 1 to the win in the browser at ~390×844 viewport; reload restores state; "Neues Spiel" resets.
- Phase 4: `./gradlew bundleRelease` produces signed `.aab`; installs on device.
