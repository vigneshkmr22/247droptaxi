# Android app plan (to do later)

Status: not started. Nothing has been changed in the site for this yet.

## Approach

Wrap the live Next.js site (https://www.247droptaxi.com) in a Trusted Web Activity (TWA) built with Bubblewrap. There is no second codebase: the app only opens the site, so every site update appears in the app without a Play Store update. Java/JDK is only used once, on the PC, by Bubblewrap to package and sign the `.aab`; no Java or Android code is written.

Rejected options: Capacitor (needs Android Studio, too heavy for this PC, only worth it for push notifications later), native Kotlin/React Native (4-8 weeks, duplicate logic). iOS skipped (US$99/year, plain wrappers often rejected).

## Part 1: changes in this Next.js project

| # | File | Purpose |
|---|---|---|
| 1 | `src/app/manifest.ts` | Web manifest: name "247 Drop Taxi", `start_url: /`, `display: standalone`, theme `#0a0b0e`, icons |
| 2 | `public/icons/` (192, 512, maskable 512 PNG) | App icons generated from `public/logo.png` |
| 3 | `public/sw.js` | Minimal service worker, offline fallback only (never cache bookings or prices) |
| 4 | `public/offline.html` | "No internet" page showing the phone number |
| 5 | service worker registration in `src/app/layout.tsx` | Registers `sw.js` |
| 6 | `public/.well-known/assetlinks.json` | Ties the app to the domain (hides the browser bar); placeholder until the fingerprint exists |
| 7 | `src/app/privacy-policy/page.tsx` + footer link | Play Store requires a privacy policy URL (current policy text is placeholder wording, so write a real draft) |

Verify with `npx.cmd tsc --noEmit` and `npm.cmd run build`, then check manifest/installability in Chrome DevTools or Lighthouse.

## Part 2: on the PC (Bubblewrap)

PC check done 2026-10-31: Node v24, OpenJDK 21 (Corretto), 3.9 GB RAM, C: 12 GB free, D: 81 GB free, no Bubblewrap/Android SDK/adb yet.

1. `npm.cmd i -g @bubblewrap/cli` (PowerShell blocks `npm.ps1`, so use `npm.cmd`).
2. `bubblewrap init --manifest https://www.247droptaxi.com/manifest.webmanifest`. Choose the package name (e.g. `com.droptaxi247.app`, cannot be changed later) and put the Android SDK on D: (e.g. `D:\android-sdk`). If JDK 21 causes errors, let Bubblewrap download JDK 17.
3. `bubblewrap build` creates the signing key and the `.aab` (and an `.apk`). Back up the keystore; losing it blocks all future updates.
4. `bubblewrap fingerprint` gives the SHA-256. Put it in `public/.well-known/assetlinks.json`, push, and let Vercel deploy.

Do not install Android Studio or use the emulator (3.9 GB RAM is too little). Close other apps and the browser before building. Claude Code killed a background `npm run dev` earlier for low memory.

## Part 3: Play Store (Google Play Console)

1. Developer account, US$25 one-time.
2. Listing: icon, 1024x500 feature graphic, 2-8 phone screenshots, short and long description, privacy policy URL.
3. Internal testing, then closed testing (a new personal account needs 12 testers for 14 days), then production. Review takes about 1-7 days.

## Testing locally

- PWA part: `npm.cmd run dev`, open http://localhost:3000, DevTools > Application (manifest, service worker) and Lighthouse; Chrome offers "Install app".
- Real app: copy the signed `.apk` to an Android phone and install it (allow unknown sources), or enable USB debugging and `bubblewrap install`. The app loads the live site.
- Until `assetlinks.json` has the right fingerprint, the app works but shows a thin browser bar at the top. This is expected.
- Tunnels (ngrok etc.) to test local code are not worth it; push to a Vercel preview instead.

## Order

Part 1 and push, then Part 2 steps 1-3, then fingerprint into `assetlinks.json` and push, then Part 2 step 4, then Part 3.

## Decisions still open

- App name: "247 Drop Taxi" (proposed), icon from `public/logo.png`.
- Privacy policy: a generic draft to be reviewed by the owner.
- Keep `/admin` out of the app; use it in a browser.
