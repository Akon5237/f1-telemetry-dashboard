# F1 Telemetry Dashboard

A minimal deployable Next.js + TypeScript dashboard for Formula 1 telemetry using OpenF1 data.

## Features

- Dark, responsive racing dashboard UI
- Season, Grand Prix, session, team, driver, and lap selectors
- Supported teams only: Ferrari, Red Bull Racing, McLaren, Mercedes
- Team-colored badges
- Speed, throttle, brake, gear, RPM, and DRS charts
- Two-driver comparison mode for the same lap number
- Browser-memory request cache to avoid duplicate dashboard requests
- Vercel-compatible OpenF1 API proxy route
- No backend, no database, no login

## Data Source

This project uses OpenF1 only:

- `meetings`
- `sessions`
- `drivers`
- `laps`
- `car_data`

Telemetry is fetched by taking the selected lap start time and duration, then requesting `car_data` in that time range.

The browser calls this app's serverless route at `/api/openf1/[endpoint]`. That route forwards allowed requests to OpenF1, which keeps deployment simple and avoids relying on browser CORS behavior. It does not store data and does not require any credentials.

## Windows Run Commands

```powershell
cd C:\Users\20622\Documents\Codex\2026-06-16\build-a-simple-f1-telemetry-dashboard\outputs\f1-telemetry-dashboard
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Build

```powershell
npm run build
npm start
```

## Deploy to Vercel

### Option 1: Vercel Git Import

1. Push this project to a GitHub, GitLab, or Bitbucket repository.
2. In Vercel, choose **Add New Project**.
3. Import the repository.
4. Use these settings:
   - Framework Preset: `Next.js`
   - Install Command: `npm install`
   - Build Command: `npm run build`
   - Output Directory: leave empty
5. Do not add environment variables. None are required.
6. Deploy.

### Option 2: Vercel CLI on Windows

```powershell
cd C:\Users\20622\Documents\Codex\2026-06-16\build-a-simple-f1-telemetry-dashboard\outputs\f1-telemetry-dashboard
npm install
npm run build
npm install -g vercel
vercel
vercel --prod
```

The deployed site is public by default. It uses Vercel serverless/edge routing for `/api/openf1/[endpoint]` and does not need a local backend, database, or login.

## Notes

- OpenF1 historical data starts from the 2023 season.
- OpenF1 has public rate limits, so this app caches identical dashboard requests in browser memory for the current page session.
- The app intentionally stays small and client-side for a minimal working version.
