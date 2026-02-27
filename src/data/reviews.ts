export interface Review {
  id: string;
  name: string;
  textLt: string;
  textEn: string;
  rating?: number;
}

export const reviews: Review[] = [
  {
    id: '1',
    name: 'Agnė',
    textLt: 'Puiki patirtis! Instruktoriai labai pagalba ir atmosfera nuostabi.',
    textEn: 'Great experience! Instructors are very helpful and the atmosphere is wonderful.',
    rating: 5,
  },
  {
    id: '2',
    name: 'Jonas',
    textLt: 'Mano pirmas keramikos užsiėmimas buvo nepamirštamas. Tikrai rekomenduoju!',
    textEn: 'My first ceramics workshop was unforgettable. Highly recommend!',
    rating: 5,
  },
  {
    id: '3',
    name: 'Marta',
    textLt: 'Puikus būdas praleisti savaitgalį. Sukūriau gražų indą.',
    textEn: 'Great way to spend a weekend. Created a beautiful piece.',
    rating: 4,
  },
  {
    id: '4',
    name: 'Tomas',
    textLt: 'Profesionalūs instruktoriai, viskas aiškiai paaiškinta. Grįžsiu dar!',
    textEn: 'Professional instructors, everything clearly explained. Will come back!',
    rating: 5,
  },
  {
    id: '5',
    name: 'Laura',
    textLt: 'Relaksuojanti patirtis. Labai patiko mažos grupės formatas.',
    textEn: 'Relaxing experience. Really liked the small group format.',
    rating: 5,
  },
  {
    id: '6',
    name: 'Petras',
    textLt: 'Nepaprasta studija ir puikūs žmonės. Dovanų kuponas buvo puiki idėja!',
    textEn: 'Amazing studio and great people. Gift voucher was a great idea!',
    rating: 5,
  },
];
