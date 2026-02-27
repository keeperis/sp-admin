# sp-admin

Admin frontend projektas (`admin.soulpoetry.lt` ateityje).

## Paskirtis

Valdo 2 projektus per API:
- `ceramics`
- `yoga`

Pagrindiniai puslapiai:
- `/admin/content`
- `/admin/workshops`

## Local paleidimas

```bash
npm install
npm run dev
```

Serveris: `http://localhost:3001`

## API sujungimas

`next.config.js` perrašo `/api/*` į `sp-api` (`http://localhost:4100`).

## Reikalingi env

```bash
cp .env.example .env.local
```

## Build

```bash
npm run build
```
