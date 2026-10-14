# Android release build

Package id: `org.selak.langcombat` (permanent, never change it).

## Prerequisites
- JDK 21, with `JAVA_HOME` pointing at it (e.g. `C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot`).
- Android Studio with the Android SDK installed.
- SDK location: set `ANDROID_HOME`, or create `android/local.properties` containing
  `sdk.dir=C\:\Users\<you>\AppData\Local\Android\Sdk` (gitignored).
- Node 24 and `npm install` done.

## 1. Create the upload keystore (once)
```
keytool -genkeypair -v -keystore release-keys/lang-combat-upload.jks \
  -alias lang-combat-upload -keyalg RSA -keysize 4096 -validity 36500
```
On Windows use the full path to `keytool.exe` in the JDK `bin` folder if it is not on PATH.
Create the `release-keys/` folder first. It is gitignored.

**Back the keystore and its passwords up somewhere safe (password manager, encrypted storage) and never commit it.**
Losing it means a support request to Google to reset the upload key.

## 2. Tell Gradle about it
Either copy `android/keystore.properties.example` to `android/keystore.properties` and fill it in
(`storeFile` is relative to `android/app/`), or set the env vars `LANG_COMBAT_KEYSTORE`,
`LANG_COMBAT_KEYSTORE_PASSWORD`, `LANG_COMBAT_KEY_ALIAS`, `LANG_COMBAT_KEY_PASSWORD`.
The properties file wins. If neither is complete, the release build is produced unsigned
(debug builds and CI work without secrets).

## 3. Build
```
npm run build && npx cap sync android
cd android
./gradlew bundleRelease        # Windows: gradlew.bat bundleRelease
```
Shortcut from the repo root: `npm run android:bundle` (syncs, then runs the wrapper on any OS).

Output: `android/app/build/outputs/bundle/release/app-release.aab`.

Before each Play upload, increase `versionCode` in `android/app/build.gradle`.

## 4. Run on an emulator or device
Start an emulator (Android Studio Device Manager) or plug in a device with USB debugging, then:
```
npm run android:run      # = sync + npx cap run android
```
If `cap run` fails with `'gradlew' is not recognized` (shells with `NoDefaultCurrentDirectoryInExePath=1`), install and launch directly:
```
npm run android:sync && node scripts/gradle.mjs installDebug
adb shell am start -n org.selak.langcombat/.MainActivity
```

## 5. Upload to Play Console (internal testing)
1. Create the app in Play Console with package `org.selak.langcombat`.
2. Testing -> Internal testing -> Create release, enrol in Play App Signing when asked.
3. Upload the `.aab`, add testers (email list), roll out, and open the opt-in link on the device.

## Play App Signing
Google holds the app signing key; you sign uploads with the upload key from step 1.
If the upload key is lost or leaked, Google can register a new one. This is why the
upload keystore is not as critical as an app signing key would be, but still back it up.
