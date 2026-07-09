# sp-admin

Teisiniai checkout dokumentai ir paslaugų teikėjo rekvizitai redaguojami puslapyje
`/admin/legal`. Nustatymai saugomi centriniame `sp-api` projekte atskirai `ceramics` ir `yoga`
svetainėms; kiekvienas išsaugojimas automatiškai sukuria naują dokumentų redakciją.

Admin frontend projektas (`admin.soulpoetry.lt` ateityje).

## Paskirtis

Valdo 2 projektus per API:
- `ceramics`
- `yoga`

Pagrindiniai puslapiai:
- `/admin/content`
- `/admin/workshops` (rankinis kūrimas pasirinkto būsimo Facebook evento pagrindu)
- `/admin/meta` (šifruoto Facebook Page credentialo valdymas)

## Local paleidimas

```bash
npm install
npm run dev
```

Serveris: `http://localhost:3000`

## API sujungimas

`next.config.js` perrašo `/api/*` į `sp-api` (`http://localhost:4100`).

Meta credential operacijos eina per atskirus same-origin admin proxy endpointus. Proxy
nepersiunčia tokeno į naršyklę ir pasirašo trumpalaikę server-to-server užklausą su
`INTERNAL_ADMIN_API_TOKEN`; `sp-api` papildomai patikrina administratoriaus rolę MongoDB.

## Reikalingi env

```bash
cp .env.example .env.local
```

## Build

```bash
npm run build
```
