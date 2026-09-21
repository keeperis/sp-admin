// Canonical shop contract; mirrored in sp-admin/lib/shop and sp-shop/lib/shop.
export type ShopImage = { url: string; alt: string };
export type ShopCategory = {
  id: string;
  slug: string;
  label: string;
  description: string;
  active: boolean;
  order: number;
  image: ShopImage | null;
};
export type ShopProduct = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  category: string;
  price: number;
  stock: number;
  images: ShopImage[];
  color: string;
  colorHex: string;
  size: string;
  material: string;
  description: string;
  ritual: string;
  care: string;
  delivery: string;
  badge: string;
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  order: number;
};
export const contentFields = [
  ['announcement', 'Viršutinės juostos tekstas', 'Bendra'],
  ['headerNote', 'Viršutinės juostos dešinysis tekstas', 'Bendra'],
  ['brandTagline', 'Tekstas po logotipu', 'Bendra'],
  ['footerTagline', 'Poraštės šūkis', 'Bendra'],
  ['footerClosing', 'Poraštės palinkėjimas', 'Bendra'],
  ['ceramicsUrl', 'Keramikos studijos nuoroda', 'Bendra'],
  ['yogaUrl', 'Jogos svetainės nuoroda', 'Bendra'],
  ['heroEyebrow', 'Įžangos maža antraštė', 'Pradinis puslapis'],
  ['heroTitle', 'Pagrindinės antraštės pirma eilutė', 'Pradinis puslapis'],
  ['heroAccent', 'Antros eilutės pasvirasis tekstas', 'Pradinis puslapis'],
  ['heroEnding', 'Antros eilutės pabaiga', 'Pradinis puslapis'],
  ['heroDescription', 'Pagrindinis aprašymas', 'Pradinis puslapis'],
  ['heroButton', 'Pagrindinio mygtuko tekstas', 'Pradinis puslapis'],
  ['heroBottom', 'Mažas tekstas po įžanga', 'Pradinis puslapis'],
  ['heroImageNote', 'Tekstas ant pagrindinės nuotraukos', 'Pradinis puslapis'],
  ['valueOne', 'Pirma vertybė', 'Pradinis puslapis'],
  ['valueTwo', 'Antra vertybė', 'Pradinis puslapis'],
  ['valueThree', 'Trečia vertybė', 'Pradinis puslapis'],
  ['valueFour', 'Ketvirta vertybė', 'Pradinis puslapis'],
  ['collectionEyebrow', 'Kolekcijos maža antraštė', 'Kolekcija'],
  ['collectionTitle', 'Kolekcijos antraštė', 'Kolekcija'],
  ['collectionAccent', 'Kolekcijos pasvirasis tekstas', 'Kolekcija'],
  ['catalogEyebrow', 'Katalogo maža antraštė', 'Kolekcija'],
  ['catalogTitle', 'Katalogo antraštė', 'Kolekcija'],
  ['catalogAccent', 'Katalogo pasvirasis tekstas', 'Kolekcija'],
  ['catalogDescription', 'Katalogo aprašymas', 'Kolekcija'],
  ['catalogClosing', 'Katalogo palinkėjimas', 'Kolekcija'],
  ['storyEyebrow', 'Istorijos maža antraštė', 'Mūsų istorija'],
  ['storyTitle', 'Istorijos pirma eilutė', 'Mūsų istorija'],
  ['storySecondLine', 'Istorijos antros eilutės pradžia', 'Mūsų istorija'],
  ['storyAccent', 'Istorijos pasvirasis tekstas', 'Mūsų istorija'],
  ['storyParagraphOne', 'Istorijos pirma pastraipa', 'Mūsų istorija'],
  ['storyParagraphTwo', 'Istorijos antra pastraipa', 'Mūsų istorija'],
  ['storyImageNote', 'Tekstas ant studijos nuotraukos', 'Mūsų istorija'],
  ['storyButton', 'Studijos nuorodos tekstas', 'Mūsų istorija'],
  ['ritualEyebrow', 'Ritualų maža antraštė', 'Ritualai'],
  ['ritualTitle', 'Ritualų pirma eilutė', 'Ritualai'],
  ['ritualSecondLine', 'Ritualų antros eilutės pradžia', 'Ritualai'],
  ['ritualAccent', 'Ritualų pasvirasis tekstas', 'Ritualai'],
  ['ritualButton', 'Ritualų mygtuko tekstas', 'Ritualai'],
  ['defaultCare', 'Numatytoji produkto priežiūra', 'Produktų informacija'],
  ['defaultDelivery', 'Numatytoji pristatymo informacija', 'Produktų informacija'],
] as const;
export type ContentKey = (typeof contentFields)[number][0];
export type ShopContent = {
  text: Record<ContentKey, string>;
  heroImage: ShopImage;
  storyImage: ShopImage;
  heroProductId: string;
  ritualCategoryId: string;
  heroImagePosition: number;
};
export type ShopData = {
  products: ShopProduct[];
  categories: ShopCategory[];
  content: ShopContent;
};
export type ShopSnapshot = { revision: number; updatedAt: string | null; data: ShopData };
