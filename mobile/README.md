# BridgeX mobile (Capacitor wrapper)

A thin native shell that loads the live site
(`https://businesscard-app-production.up.railway.app`). Because it loads the
deployed site, the app updates automatically whenever you deploy — no rebuild
needed for content/feature changes.

## Android APK (built in the cloud — no local setup)

Every push that touches `mobile/**` runs **.github/workflows/android.yml** on
GitHub's runners and produces a downloadable **debug APK**.

Get the APK:
1. GitHub repo → **Actions** tab → latest "Build Android APK" run.
2. Scroll to **Artifacts** → download **konnect-android-apk** (a zip).
3. Unzip → `app-debug.apk`.

Install on a phone (test / sideload):
- Copy the APK to the phone, tap it, allow "Install unknown apps" for your
  browser/Files app when prompted. It's debug-signed, so no store needed.

Run the workflow manually anytime: Actions → Build Android APK → **Run workflow**.

### Play Store (later)
A debug APK is for testing only. For the Play Store you need a **release**,
signed with your own keystore, uploaded via a Play Console account ($25 one-time).

## iOS IPA (requires a Mac)

Apple's toolchain is Mac-only. When you have a Mac:
1. `cd mobile && npm install`
2. `sudo gem install cocoapods` (once)
3. `npx cap sync ios`
4. `npx cap open ios` (opens Xcode)
5. In Xcode: set a Team (free Apple ID works for testing on your own device),
   pick your iPhone, press **Run** — installs for 7 days (free) or via
   **TestFlight** with a paid Apple Developer account ($99/yr).

## Config
Edit `capacitor.config.json` → `server.url` to point the app at a different
deployment. Then re-run the Android workflow / `npx cap sync`.
