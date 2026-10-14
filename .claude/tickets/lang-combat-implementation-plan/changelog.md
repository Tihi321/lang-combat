# Changelog — lang-combat-implementation-plan

## 2026-10-14 — Phase 4: Android

The signed release `.aab` builds, and the app runs on the Android emulator. The real-device run and the Play Console upload are still open.

**Environment:** Microsoft OpenJDK 21.0.12 and Android Studio 2026.2.1.8 were installed with winget. The user installed the Android SDK through the Studio setup wizard and generated the upload keystore (`release-keys/lang-combat-upload.jks`, alias `upload`). Both the keystore and `android/keystore.properties` are gitignored.

**Files (commit 19bf6d9, plus a follow-up commit)**
- `android/app/build.gradle`: the release signing config reads `android/keystore.properties` first, then the `LANG_COMBAT_*` env vars. It is applied only when all four values are present.
- `android/keystore.properties.example`, `.gitignore` (`release-keys/`), `.gitattributes` (gradlew LF, .bat CRLF, binaries).
- `package.json`:
  - New scripts `android:sync`, `android:bundle` and `android:run`.
  - New dev dependencies `@capacitor/assets` and `sharp`.
- `scripts/gradle.mjs`: a cross-platform Gradle wrapper. The follow-up commit makes it call `gradlew.bat` by absolute path, because cmd with `NoDefaultCurrentDirectoryInExePath=1` does not search the working directory.
- `scripts/make-icons.mjs` and `assets/*`: the placeholder "LC" icon and splash (#111 background, #4a90d9 text). The Android mipmap and splash resources were regenerated with `@capacitor/assets`.
- `docs/android-release.md` and `README.md`: release steps, plus a fallback for `cap run` in shells where it cannot find `gradlew`.

**Verification**
- `npm run android:bundle`: BUILD SUCCESSFUL. It produced `android/app/build/outputs/bundle/release/app-release.aab` (3.2 MB).
- `jarsigner -verify`: "jar verified", signed by CN=Tihomir Selak.
- `node scripts/gradle.mjs installDebug` on emulator `Medium_Phone_API_37.0` (API 37):
  - The app starts.
  - Commands typed on the soft keyboard work, e.g. NotTakeable on `Nimm den Tisch`.
  - Entering a room prints its description.
  - The layout shrinks correctly above the keyboard.
- `npm test` (78/78), `npm run build` and `npm run lint` pass.
- Not done: a run on a real device, and the upload to Play Console internal testing, which is the user's action.

**Known limitations / follow-ups**
- The Android status bar is light while the app is dark. `@capacitor/status-bar` could fix that.
- The word-chip area has a fixed height, so the 4th row (ein/eine/einen/Hilfe) only shows after scrolling.
- `npx cap run android` fails in this agent shell because of `NoDefaultCurrentDirectoryInExePath`. The docs have the workaround.
- `npm audit` reports issues in transitive dependencies. These were not checked.
- Gradle warns about deprecated features (Gradle 9 compatibility); these come from the Capacitor template.

**Commit status:** committed on `lang-combat-implementation`, not pushed.

## 2026-10-14 — Phase 3: UI

Floor 1 can be played from start to finish in the browser on a phone-sized viewport. The game state persists across a page reload. 78 tests.

**Files**
- `src/App.tsx`: owns the game state, the log and the input.
  - The input has autocorrect, autocapitalisation and spellcheck off, a 16px font, submits on Enter or ↵, and keeps focus after a submit.
  - The save is loaded once on start and written after every step.
  - "Neues Spiel" resets the game. After a win the input is disabled and "Neues Spiel" stays available.
- `src/ui/Terminal.tsx`: the scrolling log, auto-scrolled. Input, text, grammar error, game error, hint and win each have their own style.
- `src/ui/WordChips.tsx`: chips for the verbs, `nach`, the exits of the current room, the visible nouns, the 9 articles and `Hilfe`. A tap appends the word.
- `src/ui/UmlautRow.tsx`: ä ö ü ß buttons that insert at the cursor and restore the caret.
- `src/ui/storage.ts`: `{state, log}` saved under the key `lang-combat:save:v1` through `@capacitor/preferences`, falling back to `localStorage`. The log is capped at 300 entries and a corrupt save is ignored.
- `src/ui/types.ts`: the `LogEntry` type.
- `src/index.css`: dark theme built on CSS custom properties.
  - `100dvh` column layout with safe-area insets.
  - Tap targets are at least 36px tall.
- `index.html`: `lang="de"`.
- `src/core/engine.ts`:
  - Exports `visibleNouns()`.
  - Entering a room now prints its description.
  - Opening a container now lists what is inside.
- `tests/engine.test.ts`: tests for `visibleNouns`, the room description on entry, and the container contents on open.

**Deviations**
- There are direction chips, limited to the current room's exits.
- The orchestrator made these changes after the playtest:
  - The win state is read from `state.flags[goalFlag]` instead of being searched for in the log, which can be trimmed.
  - The input regains focus after "Neues Spiel".
  - Room descriptions on entry and container contents on open; without them the player had to type `Schau` every time.

**Verification**
- `npm test`: 78/78 passed.
- `npm run build`: passed.
- `npm run lint`: clean.
- Manual play in Chrome at 390×844:
  - A WrongCase error showed the in-world line, and `Hilfe` then showed the English hint.
  - The chips filled in the input.
  - `Oeffne die Tuer` was understood.
  - The locked door showed the Locked message.
  - The state survived a reload, the game was played to the win, and the input was disabled afterwards.
  - "Neues Spiel" reset the game and focused the input.
  - The umlaut button inserted at the cursor.
- At 360px width there is no horizontal scroll (checked in an iframe).
- Not checked: a real phone keyboard, which happens in Phase 4.

**Commit status:** committed on `lang-combat-implementation`.

## 2026-10-14 — Phase 2: Engine + Floor 1 content

There is now a pure game engine and Floor 1, a 3-room house with a grumpy Hausgeist, and it is winnable through `step()`. 75 tests.

**Files**
- `src/core/engine.ts`:
  - Exports the `Level`, `Room`, `Entity`, `GameState` and `GameEvent` types, the `FLOOR1` level, `initialState`, `apply(level, state, command)` and `step(level, state, input)`.
  - Visibility: an entity is visible when it is in the current room and not inside a closed container, or when it is in the inventory.
  - Open and unlocked state lives in `flags`. Opening the door sets the goal flag `open:tuer` and emits `win`.
  - `Hilfe` keeps `lastError`, and every other successful command clears it.
- `src/core/messages.ts`: all German in-world text in one place, in the Hausgeist's voice.
  - `grammarMessages` covers the 7 grammar-error kinds and `gameMessages` the game errors.
  - `texts` holds look, take, open and move lines and the win line.
  - Lines use pronouns and k-articles that match the noun's gender.
- `src/core/hints.ts`: one English line per GrammarError kind. Articles are built with `articleFor`, and there is a generic tip for when there is no error.
- `src/levels/floor1.json`:
  - Rooms: kueche (start), flur, salon.
  - 10 entities: Tisch, Kerze, Kamin, Feuer, Tür, Regal, Buch, Sessel, Truhe, and the Schlüssel inside the Truhe.
  - The level also holds the intro text.
- `src/core/lexicon.ts`: adds the nouns Kamin (m), Regal (n) and Sessel (m), 10 in total.
- `tests/engine.test.ts`: 22 tests.
  - The full walkthrough.
  - Every game error.
  - A grammar error, then `Hilfe`, then the hint.
  - That the input state is not mutated, including a frozen-state run.
  - That every entity noun is in the lexicon and every exit target exists.

**Deviations**
- Extra game-error kinds: NoExit, AlreadyOpen, NotOpenable, AlreadyHave.
- The entity schema gained `description`, `openable` and `inside`, the last one for the key in the chest.
- The orchestrator edited the German text:
  - "gedankenlesend" became "Gedanken lesen kann ich nicht".
  - The `*die*` markup became „die Tür“, because the UI has no markdown.
  - "zieht es kalt" became "Es ist kalt, und es zieht".
  - "Du läufst noch dagegen" became "Gleich läufst du noch dagegen".

**Winning path:** `Geh nach Norden`, `Geh nach Osten`, `Öffne die Truhe`, `Nimm den Schlüssel`, `Geh nach Westen`, `Öffne die Tür`

**Verification**
- `npm test`: 75/75 passed.
- `npm run build`: passed.
- `npm run lint`: clean.
- The `src/core` purity grep found no matches.

**Commit status:** committed on `lang-combat-implementation`.

## 2026-10-14 — Phase 1: Core grammar + parser

Pure-TS Floor 1 parser for du-imperatives with an accusative object, `Geh nach <Richtung>`, `Schau` and `Hilfe`. Grammar errors are typed values. 53 tests.

**Repo:** `lang-combat`, branch `lang-combat-implementation`

**Files**
- `src/core/lexicon.ts`: `Gender`, `Case`, `Noun`, `Verb` and `Lexicon` types, plus `FLOOR1_LEXICON`. It has 5 verbs and 7 nouns: the 6 from the plan plus `das Feuer`, which the normalization-guard test needs.
- `src/core/grammar.ts`: definite and indefinite article tables over m/f/n/pl × case. `articleFor()` looks up one form. `articleReadings(form)` returns all readings, so `die` has 4.
- `src/core/tokenize.ts`: splits on whitespace, strips trailing `.`/`!`, lowercases for matching and keeps the original. The umlaut fallback tries the token as typed first, then every subset of ae/oe/ue/ss substitutions.
- `src/core/parser.ts`:
  - `parse(input, lexicon)` returns a `Command` (`act`, `go` or `help`) or a `GrammarError` (the 7 kinds from the plan).
  - Precedence:
    - Empty input gives `UnknownVerb('')`.
    - A verb that is present but not first gives `WrongWordOrder`. No verb anywhere gives `UnknownVerb`.
    - After a valid verb, the checks run in this order: missing or unknown pieces, then article agreement (WrongCase if the gender fits, otherwise WrongGender), then trailing extra words, which give `UnknownWord`.
- `tests/parser.test.ts`: 53 table-driven cases plus unit tests for the article lookup.
- `tsconfig.app.json`: `include` now covers `tests`, so the tests are type-checked by `tsc -b`.

**Deviations**
- The umlaut fallback applies every subset of the substitutions, not all of them at once. Applying all at once turns `Schluessel` into `schlüßel`.
- Choices the plan left open: empty input gives `UnknownVerb('')`, and trailing extra words give `UnknownWord`. `Geh` and `Geh nach` give `MissingObject`. When a WrongCase article has several possible cases, `gotCase` reports nom.

**Verification**
- `npm test`: 53/53 passed.
- `npm run build`: passed.
- `npm run lint`: clean.
- `grep` for react/window/document in `src/core`: no matches.

**Commit status:** committed on `lang-combat-implementation`.

## 2026-10-14 — Phase 0: Scaffold

Vite + React + TS app scaffolded with Capacitor Android (`org.selak.langcombat`) and Vitest; placeholder page builds and serves.

**Repo:** `lang-combat`, branch `lang-combat-implementation` (base `master` @ 8cac12c)

**Files**
- `package.json`, `package-lock.json`: package `lang-combat`. Deps are React 19, `@capacitor/core|android` 8.5, and `@capacitor/preferences` 8.0. Dev deps are Vite 8, TypeScript 6, Vitest 5, `@capacitor/cli`, and oxlint. Adds the `test: vitest run` script.
- `vite.config.ts`: React plugin; the Vitest `test` block includes `tests/**/*.test.ts` and sets `passWithNoTests`.
- `capacitor.config.ts`: appId `org.selak.langcombat`, appName "Lang Combat", webDir `dist`.
- `android/`: generated Capacitor Android project with applicationId `org.selak.langcombat`.
- `.gitignore`: Vite defaults plus `*.jks`, `*.keystore`, `keystore.properties`, `android/app/release/`, `.claude/temp/`.
- `index.html` (title "Lang Combat"), `src/main.tsx`, `src/index.css`, `public/favicon.svg`: template entry, trimmed.
- `src/App.tsx`: placeholder heading and subtitle.
- `tests/.gitkeep`: keeps the empty tests dir.
- `.oxlintrc.json` and the `tsconfig*.json` files: unchanged template config.
- Template demo files removed: `src/App.css`, `src/assets/`, `public/icons.svg`.

**Deviations**
- Ran `npm run build` before `npx cap add android`, because that command needs `dist/`.
- `create-vite` ran with `--no-interactive` into `.claude/temp/vite-scaffold`, and the files were copied in. README.md was kept.
- The Vitest config lives in `vite.config.ts`, not in a separate file.
- The template's linter is oxlint, not ESLint.

**Verification**
- `npm test`: "No test files found, exiting with code 0". The orchestrator re-ran it and got the same result.
- `npm run build`: passed (tsc and vite). The orchestrator re-ran it and it passed again.
- `npm run lint`: clean.
- `npm run dev`: `curl http://localhost:5173/` served `<title>Lang Combat</title>`, then the server was stopped.
- Not run: the Android build. No JDK or Android SDK is installed, which is expected until Phase 4.

**Commit status:** committed on `lang-combat-implementation`. `.claude/` is not committed.
