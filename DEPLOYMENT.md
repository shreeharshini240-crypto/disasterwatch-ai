# DisasterWatch AI Deployment

## Required production environment

Set these variables in your hosting providers:

- `DATABASE_URL`
- `JWT_SECRET`
- `WEB_ORIGIN`
- `NEXT_PUBLIC_API_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `GOOGLE_CLIENT_ID`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `NEWS_API_KEY`
- `OPENWEATHER_API_KEY`
- `OPENAI_API_KEY`

## API + PostgreSQL on Render

1. Create a new Blueprint from this repository.
2. Use `render.yaml`.
3. After the database is available, run:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

## Frontend on Vercel

1. Create a Vercel project with root directory `apps/web`.
2. Set `NEXT_PUBLIC_API_URL` to the deployed API URL.
3. Deploy with the included `vercel.json`.

## Health and monitoring

- API health: `/api/health`
- Render can use `/api/health` for uptime checks.
- Database and notification status are exposed through `/api/admin/system` for admin users.

## Security note

`npm audit --omit=dev` currently reports a moderate advisory in `next` through its bundled `postcss` dependency. The available audit fix would downgrade Next.js to an incompatible version, so the project keeps Next.js 15 as requested and pins top-level PostCSS to a patched version where possible.
