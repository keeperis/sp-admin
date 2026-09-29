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

## iPhone Home Screen aplikacija

Administravimas palaiko **online standalone** režimą, be offline įrašymo. Pasirinktiniai pranešimai naudoja tik push skirtą Service Worker (žr. žemiau), kuris nekešuoja administravimo duomenų.

1. Safari atidarykite `https://soulpoetry.love/admin`.
2. Pasirinkite **Bendrinti → Pridėti prie pagrindinio ekrano**.
3. Jei rodomas **Open as Web App**, palikite įjungtą.
4. Paleiskite iš naujos ikonos ir prireikus prisijunkite per Google.

Jei senesnė pridėta nuoroda vis dar atidaro Safari skirtuką, pašalinkite tik tą Home Screen
nuorodą ir pridėkite iš naujo. Google prisijungimas bei išorinės nuorodos gali parodyti
sistemos naršymo langą; vidiniai `/admin` ekranai turi likti aplikacijoje.

Manifestas: `/admin.webmanifest`, stabilus `id` ir `start_url` — `/admin`.
`scope: /` sąmoningai apima `/login` ir `/api/auth` tame pačiame domene; tai nekeičia
autorizacijos ir neapima keramikos / jogos domenų. Metaduomenys jungiami tik admin ir auth
layout'uose; viešas pradžios puslapis neįgyja administravimo aplikacijos identiteto.

Ikonos `/icons/admin-*.png` paruoštos iš esamo `public/favicon_dark.png`: 180 px Apple Touch,
192 ir 512 px manifestui, nepermatomas baltas fonas. Naujų PWA priklausomybių nepridėta.

### Patikra prieš pristatymą

Read-only HTTP patikra prieš jau paleistą production build arba produkciją:

```bash
node scripts/check-admin-pwa.mjs http://localhost:3311
node scripts/check-admin-pwa.mjs https://soulpoetry.love
```

- Login HTML turi vieną manifestą, Apple Touch ikoną ir `apple-mobile-web-app-capable=yes`;
  viešas `/` HTML šių admin nustatymų neturi.
- Manifestas ir visos jo ikonos grąžina 200 be prisijungimo, su tinkamais MIME tipais.
- Neprisijungęs `/admin` nukreipia į `/login`; API vis dar grąžina 401 be sesijos.
- Realiame iPhone patikrinti naują įdiegimą, atskirą langą aplikacijų perjungiklyje,
  Google prisijungimą / grįžimą, uždarymą / pakartotinį paleidimą ir atsijungimą.
- Patikrinti meniu, modalus, klaviatūrą ir bilietų kameros leidimą. Praradus internetą
  įrašymo veiksmai neturi būti laikomi sėkmingais.

Desktop / WebKit emuliacija nepakeičia iPhone Home Screen ir tikro Google OAuth testo.
# Admin registration notifications

Open **Pranešimai į telefoną** (`/admin/notifications`) in the installed Home Screen app, press **Įjungti pranešimus**, allow notifications, then press **Bandomasis pranešimas**. iPhone requires iOS 16.4+. Each device opts in independently; normal logout unsubscribes this device.

New recurring and one-time workshop registrations are sent by the API's minute worker. Transfers notify on submission, cards after confirmed fulfillment/payment. Historical registrations are not replayed. Notification payloads contain no customer contact data. Click opens the authenticated admin section.

The worker `/admin-push-sw.js` is push-only: no fetch handler, offline administration, auth caching or API caching. Service-worker contract test: `node scripts/check-push-worker.mjs`. The test button reports push-provider acceptance; physical delivery must still be checked on the device (Focus/permissions apply). API setup and delivery semantics: `sp-api/docs/admin-registration-push.md`.
