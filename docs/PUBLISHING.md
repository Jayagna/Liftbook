# Publishing Liftbook to Google Play and the App Store

This guide is ordered the way you'll actually do it. Steps marked **(you)** need your own accounts, payments or devices. Everything else is already in the repo or Claude can do it.

Store rules change often. Before you pay or submit anything, check each store's current policy page.

---

## 0. Try the app on your phone (free, today)

1. Install **Node 20+** on your laptop, then in the repo run `npm install`.
2. Install **Expo Go** on your phone from the Play Store or App Store.
3. Run `npx expo start` and scan the QR code with your phone (Android: inside Expo Go; iPhone: with the Camera app).

Expo Go can run this app because it only uses modules Expo Go includes. Once you add native modules Expo Go doesn't have, such as barcode scanning or a 3D engine, you'll switch to a **development build** (step 3).

## 1. Accounts **(you)**

| | Google Play | Apple App Store |
|---|---|---|
| Account | [Play Console](https://play.google.com/console/signup) | [Apple Developer Program](https://developer.apple.com/programs/enroll/) |
| Cost | US$25, one time | US$99 a year (fee waivers exist for some non-profits) |
| Identity check | Government ID; personal accounts also verify a phone and email | Apple ID with two-factor auth; organisations need a D-U-N-S number |
| Hardware | Any computer | Any computer, because EAS builds iOS in the cloud. Testing needs an iPhone. |

Also create a free **Expo account** at expo.dev. EAS Build, Submit and Update run there.

## 2. One-time project setup

```bash
npm install -g eas-cli        # or prefix every command with: npx eas-cli@latest
eas login
eas init                      # links the project to your Expo account and writes the projectId into app.json
```

Then check `app.json` before the first build:
- `ios.bundleIdentifier` and `android.package` are set to `app.liftbook.personal`. **They can never change after the first store upload**, so rename them now if you want something else.
- Replace the icon, adaptive icon and splash images in `assets/` with final artwork (1024×1024 icon, no transparency on iOS).
- `version` is what users see. `eas.json` auto-increments build numbers.

## 3. Development build (when needed)

```bash
npx expo install expo-dev-client
eas build --profile development --platform android   # gives an .apk to install directly
eas build --profile development --platform ios       # needs your iPhone registered: eas device:create
```

## 4. Before any public release, the app itself must have

These are on the roadmap (Phases 2 and 5). Both stores will reject the app without them:

- [ ] **Sign-in and in-app account deletion.** Apple requires that any app that creates accounts lets people delete them from inside the app.
- [ ] **Privacy policy URL**, hosted publicly (GitHub Pages works) and linked inside the app.
- [ ] **Data export**, which Phase 2 adds.
- [ ] **No medical claims.** Targets, recovery and hydration are labelled as estimates, and must stay that way.
- [ ] **AI disclosure.** AI meal estimates are shown as estimates before they're saved. The Gemini key lives only on the server.
- [ ] **Permissions only when used**, each with a clear reason string: camera for barcode scanning, photos for progress pictures, notifications for reminders.

## 5. Google Play

1. **(you)** In Play Console, create the app, choose "App" and "Free", and accept the declarations.
2. Build the release bundle: `eas build --platform android --profile production`. This produces an `.aab`. Let EAS create and keep the upload keystore.
3. **(you)** Fill in **App content**: privacy policy, ads (none), app access (give test login details), content rating questionnaire, target audience (18+ or 13+), **Data safety** form (which data you collect and why; it must match the privacy policy), and the **Health apps** declaration (fitness/nutrition).
4. **(you)** Fill in the **store listing**: name, short and long description, at least 2 phone screenshots, a 512×512 icon and a 1024×500 feature graphic.
5. **Closed testing (required for new personal accounts):** create a closed testing track, upload the `.aab` by hand the first time, and invite **at least 12 testers** (Google Groups or a list of emails). They must stay opted in for **14 days in a row**. Friends from BITS are perfect for this.
6. After 14 days, apply for **production access** in the dashboard, answer the questions about your test, then promote the build to production. Review usually takes a few days.
7. Later releases can be automated: create a Google Cloud service account with Play Console access, save its JSON key (never commit it), and run `eas submit --platform android`.

## 6. Apple App Store

1. **(you)** In [App Store Connect](https://appstoreconnect.apple.com), create the app with the same bundle identifier.
2. Build and upload: `eas build --platform ios --profile production`, then `eas submit --platform ios`. EAS creates the certificates and provisioning profiles for you.
3. **TestFlight:** install the build on your iPhone through the TestFlight app. You can add up to 100 internal testers right away. External testers need a short beta review.
4. **(you)** Fill in **App Privacy** ("nutrition labels": health and fitness, identifiers, usage data, and whether data is linked to the user), age rating, category (Health & Fitness), screenshots for a 6.9" iPhone, description, keywords, support URL and privacy policy URL.
5. Add a **demo account** in "App Review Information" so reviewers can sign in.
6. Submit for review. It usually takes 1 to 3 days. Common rejection reasons for fitness apps: no account deletion, vague permission prompts, medical-sounding claims, or AI features without clear labelling.

## 7. Updating after launch

- **JavaScript-only changes** (screens, logic, styles): `eas update --branch production` ships to installed apps without store review, as long as it doesn't change native modules.
- **Native changes** (new modules, permissions, SDK upgrades): bump `version`, rebuild with `eas build`, and resubmit.

## 8. Moving your Liftbook data

Your Liftbook backup is `liftbook-export-2026-11-11.json`, kept in the project folder and deliberately not in this repo. Today you can paste it into **Profile → Data → Restore a Liftbook backup**, which loads it on that device only. When sign-in arrives (Phase 2), a one-off import script writes it into your account alone. Every other user starts with an empty, personalised onboarding.
