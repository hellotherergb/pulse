# Pulse

Mobile-first social app: clips, posts, stories, Sparks currency, cosmetics shop, stickers, and DMs.

**Production stack:** Vercel (app) + Neon Postgres (accounts/posts/chats) + Vercel Blob (photos/videos).  
Updating the code does **not** wipe user data.

## Quick local start (needs Neon URL)

```powershell
copy .env.example .env
# Put your Neon DATABASE_URL and NEXTAUTH_SECRET in .env
npm install
npx prisma migrate deploy
npm run dev
```

Optional seed (demo users — only on an empty database):

```powershell
npm run db:seed
```

Demo passwords after seed: `password123`  
`nova@pulse.app` / `kai@pulse.app` / `mira@pulse.app` / `rex@pulse.app`

## Deploy online (real users)

Follow **[DEPLOY.md](./DEPLOY.md)** step by step:

1. Neon database  
2. GitHub repo  
3. Vercel project + env vars  
4. Vercel Blob for media  

Then share your `*.vercel.app` link — anyone can sign up.

## Features

- Home feed + stories, For You clips, Create (upload or URL)
- Wallet Sparks (`+1` view, `+10` follow; shop spends)
- Cosmetics shop (frames, badges, titles, backgrounds) + sticker packs
- DMs with text, stickers, and media
- Profile picture upload

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local Next.js |
| `npm run build` | Production build |
| `npm run db:deploy` | Apply migrations (safe; does not wipe data) |
| `npm run db:seed` | Demo seed — **empty DB only** |
| `npm run db:studio` | Browse data in Prisma Studio |

## Safety

Never run `db:reset` / `prisma migrate reset` against your Neon production database.
