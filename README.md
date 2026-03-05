# Pearl Auction Bid Management System

Fullstack Next.js app using Prisma + PostgreSQL with shadcn/ui-style components and Tailwind CSS.

## Stack

- Next.js (App Router)
- Prisma ORM (PostgreSQL datasource)
- Shadcn-style UI components (`components/ui`)
- Tailwind CSS v4

## Setup

1. Install dependencies

```bash
npm install
```

2. Configure environment

```bash
cp .env.example .env
```

Update `DATABASE_URL` in `.env` (PostgreSQL URL).

3. Generate Prisma client and run migration

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

4. Start development server

```bash
npm run dev
```

## Key Paths

- Prisma schema: `prisma/schema.prisma`
- Prisma config: `prisma.config.ts`
- Prisma client singleton: `prisma/client.ts`
- Server actions: `lib/actions.ts`
- UI components: `components/ui/*`

## Deploy to Vercel

1. Push this project to GitHub/GitLab/Bitbucket and import it in Vercel.
2. Set environment variables in Vercel Project Settings:
   - `DATABASE_URL` (hosted PostgreSQL, not localhost)
   - `AUTH_SECRET` (long random secret)
3. Deploy the project.
4. Run production migration once:

```bash
npm run prisma:migrate:deploy
```
