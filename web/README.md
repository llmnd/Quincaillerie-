This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Sites publics multi-organisations

Configurez ces variables sur le déploiement Next.js :

```env
NEXT_PUBLIC_API_URL=https://api.monerp.app
NEXT_PUBLIC_PUBLIC_HOST=monerp.vercel.app
NEXT_PUBLIC_APP_HOST=monerp.vercel.app
# Temporaire sans DNS : /site/<slug>. Passer à subdomain après configuration DNS.
NEXT_PUBLIC_PUBLIC_SITE_MODE=path
```

Configurez les variables correspondantes sur l’API :

```env
PUBLIC_SITE_BASE_DOMAIN=monerp.vercel.app
PUBLIC_SITE_PROTOCOL=https
```

En mode temporaire, la publication est accessible via `https://monerp.vercel.app/site/organisation`. Pour activer les sous-domaines plus tard, passez `NEXT_PUBLIC_PUBLIC_SITE_MODE=subdomain`, ajoutez un domaine racine personnalisé dans Vercel et utilisez-le comme `NEXT_PUBLIC_PUBLIC_HOST` et `PUBLIC_SITE_BASE_DOMAIN` (par exemple `sites.monerp.app` avec `*.sites.monerp.app`). Un domaine personnalisé configuré depuis l’éditeur devient ensuite l’URL principale ; son DNS doit pointer vers le même déploiement Next.js.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
