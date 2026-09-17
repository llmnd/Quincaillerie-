# Choisir la base de donnees

Le backend utilise la variable `DATABASE_URL`.

## Developpement local avec SQLite

Dans `backend/.env` :

```env
APP_ENV=development
DEBUG=true
DATABASE_URL=sqlite:///./erp_platform.db
```

Les organisations et utilisateurs crees dans ce mode restent dans `backend/erp_platform.db`. Ils ne sont pas envoyes automatiquement vers Neon.

## Utiliser Neon depuis le poste local

Remplacer temporairement `DATABASE_URL` par l'URL Neon actuelle, sans la committer :

```env
APP_ENV=development
DEBUG=true
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST/DBNAME?sslmode=require
```

Puis redemarrer le backend. Les inscriptions et connexions locales utiliseront alors Neon directement.

## Frontend local avec l'API Koyeb

Dans `web/.env.local` :

```env
NEXT_PUBLIC_API_URL=https://URL-REELLE-DE-L-API-KOYEB
```

Le frontend local appellera alors la base Neon via l'API de production. Il ne faut pas mettre `DATABASE_URL` dans le frontend.

## Production

Configurer dans Koyeb :

- `DATABASE_URL`: URL Neon actuelle
- `SECRET_KEY`: secret aleatoire d'au moins 32 caracteres
- `CORS_ORIGINS`: URL exacte du frontend deploye
- `APP_ENV=production`
- `DEBUG=false`

Configurer dans Vercel ou l'hebergeur frontend :

- `NEXT_PUBLIC_API_URL`: URL exacte de l'API Koyeb

Ne pas reutiliser un ancien mot de passe Neon. Comme un ancien identifiant a ete expose pendant le developpement, il doit etre regenere dans Neon puis remplace dans Koyeb.
