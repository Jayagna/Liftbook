# Putting Liftbook on your own phone, free

No app store and no paid developer account. The app is published as a web page and added to the home screen,
where it opens full screen, has its own icon and works without signal.

## What stays private

- Everything you log is stored on the phone, inside the app. Publishing the app publishes the code only.
- This repository holds no personal data. Your Liftbook backup file is kept out of it on purpose.
- A public repository is what makes the hosting free. Anyone could read the code or open the app, and they
  would get an empty app with their own separate data on their own device.

## One-time setup

1. On github.com, create a new **public** repository named `Liftbook`. Leave it empty.
2. Push this code to its `main` branch.
3. In the repository: **Settings > Pages > Build and deployment > Source: GitHub Actions**.
4. The "Publish web app" workflow runs on every push to `main`. When it finishes, the app is at
   `https://<your-username>.github.io/Liftbook/`.

## On the iPhone

1. Open that address in **Safari** (it has to be Safari for this step).
2. Tap the **Share** button, then **Add to Home Screen**, then **Add**.
3. Open Liftbook from the home screen from now on.
4. Set up inside the installed app, or go to **Profile > Data > Choose a backup file** to bring your data in.
   Do this in the installed app, not in the Safari tab: the two keep separate data.

## Good to know

- After the first open, the app works offline. A new version is picked up the next time the app is fully
  closed and opened again while online.
- Save a backup file now and then (**Profile > Data > Save a backup file**). Deleting the home-screen icon
  deletes the data stored with it, and photos are not part of the backup file.
- Reminders that arrive while the app is closed are not possible this way without a server.

## Building it yourself

```bash
npm ci
LIFTBOOK_BASE_URL=/Liftbook npm run build:web   # output in dist/
```

Leave `LIFTBOOK_BASE_URL` unset when the site is served from the top of a domain.
