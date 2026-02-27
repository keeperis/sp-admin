export interface FAQ {
  id: string;
  qLt: string;
  qEn: string;
  aLt: string;
  aEn: string;
}

export const faq: FAQ[] = [
  {
    id: '1',
    qLt: 'Ar reikia patirties?',
    qEn: 'Do I need experience?',
    aLt: 'Ne, visi užsiėmimai tinka pradedantiesiems. Mūsų instruktoriai padės jums nuo pat pradžių.',
    aEn: 'No, all workshops are suitable for beginners. Our instructors will help you from the start.',
  },
  {
    id: '2',
    qLt: 'Ką reikia atsinešti / kokį drabužį?',
    qEn: 'What to bring / clothing?',
    aLt: 'Atsineškite aprangą, kurią galite užteršti. Visi įrankiai ir medžiagos pateikiami.',
    aEn: 'Bring clothes you can get dirty. All tools and materials are provided.',
  },
  {
    id: '3',
    qLt: 'Kokio dydžio grupės?',
    qEn: 'Group size?',
    aLt: 'Maksimaliai 8-10 žmonių, kad kiekvienas gautų pakankamai dėmesio.',
    aEn: 'Maximum 8-10 people so everyone gets enough attention.',
  },
  {
    id: '4',
    qLt: 'Ar galima atšaukti / perplanuoti?',
    qEn: 'Cancellation / reschedule?',
    aLt: 'Taip, galite atšaukti iki 48 valandų prieš užsiėmimą. Perplanavimas galimas pagal galimybes.',
    aEn: 'Yes, you can cancel up to 48 hours before the workshop. Rescheduling is possible based on availability.',
  },
  {
    id: '5',
    qLt: 'Kada galima paimti darbus?',
    qEn: 'When can I pick up works?',
    aLt: 'Darbai bus paruošti po 2-3 savaičių. Jus informuosime, kai jie bus paruošti.',
    aEn: 'Works will be ready after 2-3 weeks. We will inform you when they are ready.',
  },
  {
    id: '6',
    qLt: 'Kaip veikia dovanų kuponas?',
    qEn: 'How does gift voucher work?',
    aLt: 'Pirkite dovanų kuponą, kuris galioja 12 mėnesių. Gavėjas gali pasirinkti bet kurį užsiėmimą.',
    aEn: 'Purchase a gift voucher valid for 12 months. The recipient can choose any workshop.',
  },
];
