# Deploy Pulse (real online app)

Your **accounts, posts, chats, and media stay saved** when you update the app.
Code updates go to Vercel; data lives in Neon + Blob and is never wiped by a deploy.

## Agent / you handoff (required once)

Code is already cloud-ready. These account steps need **you** (browsers cannot create your Neon/GitHub/Vercel logins):

1. Create Neon → paste the pooled `DATABASE_URL` into `.env` (replace the `USER:PASSWORD@ep-xxxx…` placeholder).
2. Create a GitHub repo → run the push commands in §2 (or tell the agent your GitHub username after installing [GitHub CLI](https://cli.github.com)).
3. Import the repo in Vercel → set the env vars in §3 → enable Blob in §4.
4. Reply in chat with: “Neon is in `.env`” (and your public Vercel URL when deploy finishes) so migrate + live verify can run.

**Windows tip:** if you previously set `DATABASE_URL` in your PowerShell session (e.g. to `localhost`), clear it before Prisma so `.env` wins:

```powershell
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
npm run check:cloud
npx prisma migrate deploy
```

Check readiness anytime (prints OK/FAIL only, never secrets):

```powershell
npm run check:cloud
```

## 1. Create Neon (database)

1. Go to [https://neon.tech](https://neon.tech) and sign up (free).
2. Create a project named `pulse`.
3. Open **Dashboard → Connection details**.
4. Copy the **pooled** connection string (`DATABASE_URL`).
   It looks like:
   `postgresql://user:pass@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require`

## 2. Create GitHub repo

1. Install Git if needed, then in this folder:

```powershell
cd C:\Users\PC\Projects\bad-word-beep\pulse
git init
git add .
git commit -m "Pulse cloud-ready: Neon Postgres + Vercel Blob"
```

2. Create a new empty repo on [https://github.com/new](https://github.com/new) (name it `pulse`).
3. Push:

```powershell
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pulse.git
git push -u origin main
```

## 3. Create Vercel project

1. Go to [https://vercel.com](https://vercel.com) and sign in with GitHub.
2. **Add New… → Project** → import the `pulse` repo.
3. Before deploying, open **Environment Variables** and add:

| Name | Value |
|------|--------|
| `DATABASE_URL` | Neon pooled URL from step 1 |
| `NEXTAUTH_URL` | `https://YOUR_PROJECT.vercel.app` (update after first deploy if needed) |
| `NEXTAUTH_SECRET` | Long random string (see below) |
| `BLOB_READ_WRITE_TOKEN` | From step 4 |

Generate a secret in PowerShell:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

4. Deploy. The build runs `prisma migrate deploy` then `next build`, which creates tables in Neon **without deleting data** on later deploys.

## 4. Enable Vercel Blob (media)

1. In the Vercel project: **Storage → Create Database → Blob**.
2. Create a store (e.g. `pulse-media`).
3. Copy `BLOB_READ_WRITE_TOKEN` into the project env vars (Production + Preview).
4. Redeploy so uploads go to Blob.

## 5. Local development against the cloud DB

Copy `.env.example` → `.env` and paste the **same** Neon + Blob values:

```powershell
copy .env.example .env
# edit .env with your real secrets
npm install
npx prisma migrate deploy
npm run dev
```

Optional demo users (safe on empty DB only — **never** on a DB with real users):

```powershell
npm run db:seed
```

## 6. Updating the app anytime (data stays)

```powershell
# make your code changes, then:
git add .
git commit -m "Describe your update"
git push
```

Vercel redeploys automatically. Neon and Blob are untouched.

## Never do this in production

- `npm run db:reset`
- `prisma migrate reset`
- Seeding over a live database with real users

## Verify it’s real

1. Open `https://YOUR_PROJECT.vercel.app`
2. Sign up account A in one browser → post something
3. Sign up account B in another browser/incognito → see A’s post, DM A
4. Push a tiny README tweak → after redeploy, both accounts and the post are still there
