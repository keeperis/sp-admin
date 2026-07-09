# Soul Poetry Registracijų, Bilietų ir Dovanų Kuponų Planas

## Būsena 2026-06-26

Šiuo metu jau įgyvendinta:

- `sp-api` turi `Booking` modelį.
- Yra `POST /api/bookings`, `GET /api/bookings`, `GET /api/bookings/:id`, `POST /api/bookings/:id/cancel`.
- Booking kūrimo metu vietos rezervuojamos per backend mažinant `spotsLeft`.
- `sp-ceramics` ir `sp-yoga` turi vieną viešą užsiėmimo ir checkout route:
  - `/[locale]/workshops/[workshopId]`
  - registracijos būsena atidaroma su `?view=booking`
- Viešas checkout jau:
  - sukuria booking;
  - inicijuoja Stripe Checkout session;
  - grąžina vartotoją į tą patį checkout route su booking/payment status parametrais.
- `sp-admin` turi:
  - `/admin/bookings`;
  - workshop lentelės booking statistiką;
  - aiškesnį vietų modelį pagal `spotsLeft`, `pending_payment`, `confirmed`.
- `sp-api` turi mokėjimų bazę:
  - `Payment` modelį;
  - `POST /api/payments/create-checkout-session`;
  - `POST /api/webhooks/stripe`.
- `sp-api` jau turi ticketų/email MVP pagrindą:
  - `Ticket` modelį;
  - `EmailDelivery` outbox modelį;
  - `GET /api/tickets/:code`;
  - Stripe webhook po `confirmed` užtikrina ticket sukūrimą ir bando siųsti patvirtinimo email.
- `sp-ceramics` ir `sp-yoga` turi viešą ticket route:
  - `/[locale]/tickets/[code]`
- Confirmed checkout būsenoje jau rodoma:
  - ticket kodas;
  - QR kodas;
  - nuoroda į bilieto puslapį;
  - email siuntimo būsena (`sent | pending | failed`).

Dar liko:

- dovanų kuponai;
- QR / check-in;
- produkcinė Stripe konfigūracija (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) ir live webhook testavimas;
- produkcinė email konfigūracija (`SMTP_*`, `CERAMICS_SITE_URL`, `YOGA_SITE_URL`) ir realus delivery testavimas;
- admin / operatoriaus resend / check-in įrankiai.

## Projektų kontekstas

Yra 4 susiję projektai:

- `sp-api` - centrinis backend/API su MongoDB/Mongoose.
- `sp-admin` - administravimo panelė.
- `sp-ceramics` - vieša keramikos svetainė.
- `sp-yoga` - vieša jogos svetainė.

Dabartinė sistema jau turi:

- `Workshop` modelį `sp-api`.
- `/api/workshops` ir `/api/workshops/[id]`.
- FB event importą per `/api/workshops/fetch-fb`.
- `sp-admin` puslapį `/admin/workshops`.
- `sp-ceramics` ir `sp-yoga` rodo artimiausius užsiėmimus pagal `site=ceramics|yoga`.
- `Booking` modelį ir booking API.
- viešą checkout flow `sp-ceramics` ir `sp-yoga`.
- admin booking sąrašą ir workshop booking statistiką.
- Stripe mokėjimų session kūrimą ir webhook pagrindą `sp-api`.
- ticketų generavimą po apmokėjimo.
- email outbox + SMTP siuntimo bandymą po apmokėjimo.
- viešą ticket peržiūros puslapį `sp-ceramics` ir `sp-yoga`.

Trūksta:

- dovanų kuponų;
- admin check-in flow;
- resend / support įrankių email pakartotiniam siuntimui;
- produkcinės Stripe konfigūracijos ir webhook testavimo;
- produkcinės SMTP/site URL konfigūracijos ir live email testavimo.

Pagrindinis principas: `sp-api` turi būti vienintelis vietų, registracijų, mokėjimų, bilietų ir kuponų šaltinis. Facebook lieka tik marketingo/importo kanalas.

---

# Modulis 1: Booking / Order Pagrindas

Tikslas: sukurti registracijos/užsakymo bazę be mokėjimo integracijos.

Būsena: įgyvendinta.

## Sukurti `sp-api`

Naujas modelis `Booking`:

- `site`: `ceramics | yoga`
- `workshopId`
- `status`: `draft | pending_payment | confirmed | cancelled | expired`
- `customerName`
- `customerEmail`
- `customerPhone`
- `locale`
- `participantsCount`
- `unitPrice`
- `totalAmount`
- `currency`: `EUR`
- `source`: `website | admin | voucher`
- `notes`
- `expiresAt`
- `createdAt`
- `updatedAt`

API:

- `POST /api/bookings`
  - sukuria booking;
  - patikrina ar yra pakankamai vietų;
  - laikinai rezervuoja vietas;
  - grąžina booking ID.

- `GET /api/bookings/:id`
  - grąžina booking informaciją.

- `POST /api/bookings/:id/cancel`
  - atšaukia booking;
  - grąžina vietas.

Svarbu: vietų mažinimas turi būti atomarinis. Negalima parduoti daugiau vietų nei `spotsTotal`.

## Atnaujinti `Workshop`

Dabartinis `spotsLeft` gali likti kaip rodomas laukas, bet ilgainiui geriau skaičiuoti:

- `spotsTotal`
- `spotsReserved`
- `spotsSold`
- `spotsLeft = spotsTotal - spotsReserved - spotsSold`

MVP galima dar naudoti `spotsLeft`, bet reikia saugaus mažinimo per backend.

## `sp-admin`

Pridėti prie workshop lentelės:

- kiek registracijų;
- kiek patvirtinta;
- kiek laukia mokėjimo;
- laisvos vietos.

Pridėti booking sąrašą konkrečiam workshopui.

---

# Modulis 2: Viešas Checkout Flow

Tikslas: vartotojas iš event sąrašo gali pradėti pirkimą.

Būsena: įgyvendinta.

## `sp-ceramics` ir `sp-yoga`

Pakeisti CTA:

- vietoje `Registruotis per Facebook` / email rodyti:
  - `Pirkti bilietą`
  - jei vietų nėra: `Grupė pilna`

Vieningas užsiėmimo ir checkout puslapis:

- `/[locale]/workshops/[workshopId]`
- registracijos būsena: `?view=booking`

Checkout forma:

- vardas;
- email;
- telefonas;
- dalyvių kiekis;
- komentaras;
- sutikimas su sąlygomis.

Po formos submit:

- kviečia `POST /api/bookings`;
- jei sėkminga, inicijuoja Stripe Checkout session;
- jei Stripe redirect nepavyksta, booking lieka sukurtas ir checkout puslapyje galima bandyti mokėti dar kartą;
- po grįžimo iš Stripe naudojamas tas pats route su `booking` ir `payment` query parametrais.

---

# Modulis 3: Mokėjimai

Tikslas: booking tampa realiu pirkimu.

Būsena: backend ir frontend flow įgyvendintas, liko produkcinė Stripe konfigūracija ir live testavimas.

Rekomenduojamas MVP provideris: Stripe Checkout.
Vėliau galima pridėti Paysera.

## `sp-api`

Naujas modelis `Payment`:

- `bookingId`
- `provider`: `stripe | paysera | manual`
- `providerSessionId`
- `providerPaymentId`
- `status`: `pending | paid | failed | refunded`
- `amount`
- `currency`
- `rawPayload`
- `createdAt`
- `updatedAt`

API:

- `POST /api/payments/create-checkout-session`
  - gauna booking ID;
  - sukuria Stripe Checkout Session;
  - grąžina redirect URL.

- `POST /api/webhooks/stripe`
  - gauna Stripe webhook;
  - patvirtina mokėjimą;
  - pakeičia booking statusą į `confirmed`;
  - sukuria bilietus;
  - sumažina/patvirtina vietas.

Po apmokėjimo:

- redirect atgal į `/{locale}/checkout/{workshopId}?booking=...&payment=success`
- jei nutraukta/nepavyko: `/{locale}/checkout/{workshopId}?booking=...&payment=cancelled`

---

# Modulis 4: Bilietai

Tikslas: po apmokėjimo sugeneruojami bilietai.

Būsena: ticketų MVP įgyvendintas, check-in admin dalis dar nepadaryta.

## `sp-api`

Naujas modelis `Ticket`:

- `bookingId`
- `workshopId`
- `site`
- `holderName`
- `holderEmail`
- `code`
- `qrToken`
- `status`: `valid | checked_in | cancelled`
- `checkedInAt`
- `createdAt`
- `updatedAt`

Jei pirkta 2 vietos, kuriami 2 bilietai arba vienas booking su `participantsCount=2`. MVP paprasčiau: vienas booking, vienas QR, dalyvių kiekis booking’e.

API:

- `GET /api/tickets/:code`

Dabartinis MVP elgesys:

- po `booking.status = confirmed` webhook/service sluoksnis užtikrina, kad egzistuoja vienas ticket į vieną booking;
- jei Stripe webhook dubliuojasi, ticket kūrimas išlieka idempotentiškas;
- jei trūksta ticket/email artefaktų, `GET /api/bookings/:id` juos gali susigydyti;
- bilieto QR veda į viešą `/{locale}/tickets/{code}` puslapį;
- bilieto puslapį jau rodo tiek `sp-ceramics`, tiek `sp-yoga`.

## El. laiškai

Po mokėjimo siųsti:

- pirkėjui patvirtinimą;
- bilietą / QR kodą;
- renginio datą, vietą, laiką;
- atšaukimo sąlygas.

Dabartinis MVP elgesys:

- email siuntimas turi `EmailDelivery` outbox įrašą;
- jei `SMTP_*` sukonfigūruota, `sp-api` bando išsiųsti laišką iškart po ticket sugeneravimo;
- jei SMTP dar nesukonfigūruotas arba siuntimas nepavyksta, būsena lieka `pending` arba `failed`, o checkout puslapis rodo realų delivery statusą;
- laiške yra ticket nuoroda ir QR paveikslėlis.

---

# Modulis 5: Dovanų Kuponai

Tikslas: žmogus gali nupirkti vardinį dovanų kuponą.

Yra du kupono tipai:

1. Kuponas į konkretų užsiėmimą.
2. Atviras kuponas be konkretaus užsiėmimo.

## Kupono tipai

### A. Kuponas į konkretų užsiėmimą

Pirkėjas pasirenka konkretų workshopą ir perka dovanų kuponą.

Reikia nuspręsti verslo taisyklę:

- Variant A1: kuponas iškart rezervuoja vietą konkrečiame užsiėmime.
  - Tada gavėjas jau turi vietą.
  - Geriausia, jei data aiški ir dovana yra “bilietas dovanai”.

- Variant A2: kuponas skirtas konkrečiam workshopui, bet vieta rezervuojama tik kai gavėjas aktyvuoja kodą.
  - Rizika: kol gavėjas aktyvuos, vietų gali nebelikti.
  - Tada reikia aiškiai rodyti, kad kuponas negarantuoja vietos.

Rekomendacija MVP: jei kuponas perkamas konkrečiam užsiėmimui, jis iškart rezervuoja/parduoda vietą.

### B. Atviras kuponas

Pirkėjas perka kuponą be datos.

Kuponas turi:

- vertę eurais, pvz. 50 EUR;
- arba konkrečią paslaugą, pvz. “vienas keramikos užsiėmimas”;
- galiojimo datą, pvz. 12 mėn.;
- unikalų kodą;
- QR kodą.

Gavėjas vėliau eina į svetainę, pasirenka tinkamą užsiėmimą ir registracijos metu įveda kupono kodą.

QR kodas gali vesti į:
`/[locale]/gift/redeem?code=KODAS`

Ten svetainė parodo:

- kupono vardą;
- galiojimą;
- kokiems užsiėmimams galima naudoti;
- galimus artimiausius užsiėmimus;
- registracijos formą.

## `sp-api` modelis `GiftVoucher`

Laukai:

- `site`: `ceramics | yoga`
- `code`
- `qrToken`
- `status`: `draft | pending_payment | active | redeemed | partially_redeemed | expired | cancelled`
- `type`: `specific_workshop | open_amount | open_service`
- `workshopId`
- `serviceType`: `ceramics | yoga`
- `amount`
- `remainingAmount`
- `currency`: `EUR`
- `purchaserName`
- `purchaserEmail`
- `recipientName`
- `recipientEmail`
- `message`
- `expiresAt`
- `paymentId`
- `bookingId`
- `createdAt`
- `updatedAt`

## `sp-api` modelis `GiftVoucherRedemption`

- `voucherId`
- `bookingId`
- `workshopId`
- `amountUsed`
- `redeemedAt`
- `status`: `reserved | completed | cancelled`

## Kupono pirkimo API

- `POST /api/gift-vouchers`
  - sukuria kupono orderį;
  - jei konkretus workshopas, patikrina vietas;
  - sukuria payment checkout;
  - po mokėjimo aktyvuoja kuponą.

- `GET /api/gift-vouchers/:code`
  - patikrina kuponą;
  - rodo ar galioja;
  - rodo kam galima panaudoti.

- `POST /api/gift-vouchers/:code/redeem`
  - panaudoja kuponą registracijai;
  - sukuria booking;
  - jei kuponas padengia visą sumą, booking tampa `confirmed`;
  - jei nepadengia, reikia primokėti.

## `sp-ceramics` ir `sp-yoga`

Nauji puslapiai:

- `/[locale]/gift`
  - dovanų kupono pirkimas.

- `/[locale]/gift/redeem`
  - kupono panaudojimas.

- `/[locale]/gift/success`
  - kuponas nupirktas, rodomas kodas / siunčiamas email.

UI turi leisti pasirinkti:

- “Dovanoti konkretų užsiėmimą”
- “Dovanoti sumą”
- “Dovanoti patirtį be datos”

Forma:

- pirkėjo vardas;
- pirkėjo email;
- gavėjo vardas;
- gavėjo email;
- žinutė;
- kupono tipas;
- suma arba workshopas.

## Vardinis PDF / vizualus kuponas

Po apmokėjimo sugeneruoti:

- kupono kodą;
- QR kodą;
- gavėjo vardą;
- pirkėjo vardą;
- žinutę;
- galiojimo datą;
- panaudojimo instrukciją.

MVP galima generuoti HTML puslapį spausdinimui.
Vėliau galima PDF.

---

# Modulis 6: Admin Dovanų Kuponai

`sp-admin` pridėti puslapį:

- `/admin/gift-vouchers`

Funkcijos:

- kuponų sąrašas;
- filtrai pagal site/status/type;
- paieška pagal kodą, pirkėją, gavėją;
- kupono detalės;
- rankinis kupono sukūrimas;
- kupono atšaukimas;
- kupono panaudojimo istorija;
- persiųsti kuponą email;
- pažymėti kaip panaudotą rankiniu būdu.

Workshop admin’e prie dalyvių rodyti, ar registracija apmokėta:

- kortele;
- kuponu;
- rankiniu būdu.

---

# Modulis 7: Check-in

Tikslas: renginio dieną galima patikrinti bilietą arba kuponą.

## `sp-admin`

Naujas puslapis:

- `/admin/check-in`

Funkcijos:

- įvesti bilieto/kupono kodą;
- skanuoti QR;
- pamatyti booking;
- pažymėti `checked_in`.

QR kodas bilietui veda į admin check-in URL arba viešą validacijos URL.

---

# Rekomenduojama įgyvendinimo tvarka

1. Booking modelis ir vietų rezervavimas.
2. Viešas checkout puslapis be mokėjimų.
3. Stripe/Paysera mokėjimai.
4. Bilietų generavimas ir email.
5. Dovanų kuponų modelis.
6. Kupono pirkimo flow.
7. Kupono redeem flow.
8. Admin kuponų valdymas.
9. QR/check-in.
10. FB event nuorodos į pirkimo puslapius.

---

# MVP prioritetas

Pirmas realiai naudingas MVP:

- žmogus gali nusipirkti bilietą į konkretų užsiėmimą;
- vietos automatiškai sumažėja;
- admin mato dalyvį;
- žmogus gauna email patvirtinimą;
- galima nupirkti dovanų kuponą į konkretų užsiėmimą;
- gavėjas gauna vardinį kuponą su QR.

Atviri kuponai be konkretaus užsiėmimo gali būti antras etapas, nes jiems reikia daugiau logikos: galiojimas, dalinis panaudojimas, tinkamų renginių filtravimas, primokėjimas.
