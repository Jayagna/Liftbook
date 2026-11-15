# Liftbook

A premium, personal fitness app for iOS and Android: training plans with progressive overload, macros, protein and creatine tracking, hydration and progress analytics. It's built with Expo (SDK 58), React Native and TypeScript.

It grew out of the original single-page Liftbook tracker. The training and nutrition logic (targets, sport burn, water, double progression, PRs and the e1RM charts) was ported to `src/domain/` with tests, so results match the original.

## Run it

```bash
npm install
npx expo start          # scan the QR code with Expo Go
npm test                # domain logic tests
npm run typecheck
```

## Structure

```
src/app/            Expo Router screens: (tabs)/ Home, Train, Nutrition, Progress, Profile; planner, workout, food, supplements, exercises
src/components/     ui/ design-system primitives (Card, Ring, Bar, WaterTank, LineChart, BarChart, TabBar…), dashboard/ widgets
src/domain/         pure TypeScript logic, no React: targets, progression, session, meals, analytics, exercises, import
src/store/          local-first state persisted with AsyncStorage; selectors; labelled sample data
src/theme/tokens.ts colours, type scale, spacing, radii
supabase/           Postgres schema with row-level security (written, not wired up yet)
docs/INSTALL.md     how to put the app on your own phone for free as a home-screen web app
docs/PUBLISHING.md  step-by-step Play Store and App Store guide (not planned, kept for reference)
scripts/            make-pwa.mjs adds install and offline support to the web build; make-icons.py draws the icons
```

## Principles

- No user-specific values in code. Everything comes from the profile, plan and settings.
- Sample data only appears behind the "Sample data" banner, and real data is set aside while it's shown.
- AI output is always shown as an estimate before it's saved. Anything that can be calculated is calculated, not guessed.
- Animations respect the system's reduced-motion setting, and haptics fire only on iOS and Android.

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Codebase review, design system, navigation, dashboard, 3D visuals, onboarding | Done |
| 2 | Weekly planner editor, live workout mode with rest timer, Liftbook backup restore | Done. Sign-in and sync (Supabase) not started |
| 3 | Food list search, own foods, saved meals, meal-text matching, supplement editor, water history | Done. Barcode scanning, AI meal estimates and reminders not started |
| 4 | Exercise library with how-to guides and 3D muscle view, analytics over 7, 30 and 90 days and 1 year, progress photos kept on the device | Done. AI assistant (needs a server function to hold the key) not started |
| 5 | Backup file with checked restore, erase-everything, a warning when a change cannot be saved, home-screen install and offline use for the web build, a smaller build; then real-device checks | Done except real-device checks. Nothing is published yet |

Everything marked done has been checked in an iPhone-sized browser preview, not yet on a real phone.
