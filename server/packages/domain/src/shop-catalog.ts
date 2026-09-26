/** Shop sections from the meble.pl materials menu. Only płyty meblowe is ingested today. */
export interface ShopSubtype {
  slug: string;
  label: string;
  path: string;
}

export interface ShopSection {
  slug: string;
  label: string;
  path: string;
  subtypes: readonly ShopSubtype[];
}

export const SHOP_SECTIONS = [
  {
    slug: "plyty-meblowe",
    label: "Płyty meblowe",
    path: "/plyty-meblowe/",
    subtypes: [
      { slug: "bialy", label: "Białe", path: "/plyty-meblowe/bialy/" },
      { slug: "drewnopodobne", label: "Reprodukcje drewna", path: "/plyty-meblowe/drewnopodobne/" },
      { slug: "fantazyjne", label: "Reprodukcje materiałów", path: "/plyty-meblowe/fantazyjne/" },
      { slug: "uni", label: "Jednokolorowe (Uni)", path: "/plyty-meblowe/uni/" },
      { slug: "swisscdf-surowe", label: "Surowe", path: "/plyty-meblowe/swisscdf-surowe/" },
      { slug: "wysoki-polysk", label: "Wysoki połysk", path: "/plyty-wysoki-polysk/" },
      { slug: "gleboki-mat", label: "Głęboki mat", path: "/plyty-gleboki-mat/" },
      { slug: "rauvisio-crystal", label: "RAUVISIO Crystal", path: "/plyty-crystal/" },
      { slug: "rauvisio-grip", label: "RAUVISIO Grip", path: "/plyty/plyty-specjalne/" },
      { slug: "cleaf", label: "CLEAF", path: "/plyty-tss-cleaf/" },
    ],
  },
  {
    slug: "sklejki",
    label: "Sklejki",
    path: "/sklejka/",
    subtypes: [
      { slug: "sklejka-antyposlizgowa", label: "Antypoślizgowa", path: "/sklejka/sklejka-antyposlizgowa/" },
      { slug: "sklejka-do-ciecia-laserem", label: "Do cięcia laserem", path: "/sklejka/sklejka-do-ciecia-laserem/" },
      { slug: "sklejka-elastyczna", label: "Elastyczna", path: "/sklejka/sklejka-elastyczna/" },
      { slug: "sklejka-jednorodna", label: "Jednorodna", path: "/sklejka/sklejka-jednorodna/" },
      { slug: "modelarska", label: "Modelarska", path: "/sklejka/modelarska/" },
      { slug: "sloje-wzdluzne", label: "Słoje wzdłużne", path: "/sklejka/sloje-wzdluzne/" },
      { slug: "surowa", label: "Surowa", path: "/sklejka/surowa/" },
      { slug: "sklejka-szalunkowa", label: "Szalunkowa", path: "/sklejka/sklejka-szalunkowa/" },
      { slug: "sklejka-szkutnicza", label: "Szkutnicza", path: "/sklejka/sklejka-szkutnicza/" },
    ],
  },
  {
    slug: "obrzeza",
    label: "Obrzeża",
    path: "/obrzeza/",
    subtypes: [
      { slug: "bialy", label: "Białe", path: "/obrzeza/bialy/" },
      { slug: "drewnopodobne", label: "Reprodukcje drewna", path: "/obrzeza/drewnopodobne/" },
      { slug: "fantazyjne", label: "Reprodukcje materiałów", path: "/obrzeza/fantazyjne/" },
      { slug: "uni", label: "Jednokolorowe (Uni)", path: "/obrzeza/uni/" },
    ],
  },
  {
    slug: "plyty-budowlane",
    label: "Płyty budowlane",
    path: "/plyty/",
    subtypes: [
      { slug: "plyta-hdf", label: "Płyta HDF", path: "/plyty/plyta-hdf/" },
      { slug: "plyta-mdf", label: "Płyta MDF", path: "/plyty/plyta-mdf/" },
      { slug: "plyta-osb-3", label: "Płyta OSB-3", path: "/plyty/plyta-osb-3/" },
      { slug: "plyta-pilsniowa", label: "Płyta pilśniowa", path: "/plyty/plyta-pilsniowa/" },
      { slug: "plyta-stolarska", label: "Płyta stolarska", path: "/plyty/plyta-stolarska/" },
      { slug: "plyta-wiorowa", label: "Płyta wiórowa", path: "/plyty/plyta-wiorowa/" },
    ],
  },
  {
    slug: "laminaty",
    label: "Laminaty",
    path: "/laminaty/",
    subtypes: [
      { slug: "bialy", label: "Białe", path: "/laminaty/bialy/" },
      { slug: "drewnopodobne", label: "Reprodukcje drewna", path: "/laminaty/drewnopodobne/" },
      { slug: "fantazyjne", label: "Reprodukcje materiałów", path: "/laminaty/fantazyjne/" },
      { slug: "uni", label: "Jednokolorowe (Uni)", path: "/laminaty/uni/" },
    ],
  },
  {
    slug: "plyty-akrylowe",
    label: "Płyty akrylowe",
    path: "/plyty-akrylowe/",
    subtypes: [{ slug: "uni", label: "Jednokolorowe (Uni)", path: "/plyty-akrylowe/uni/" }],
  },
  {
    slug: "blaty",
    label: "Blaty",
    path: "/blaty/",
    subtypes: [
      { slug: "postforming", label: "Postforming", path: "/blaty/postforming/" },
      { slug: "prosta-krawedz", label: "Prosta krawędź (Feelwood)", path: "/blaty/prosta-krawedz/" },
      { slug: "perfectsense-topmatt", label: "PerfectSense Topmatt", path: "/blaty/perfectsense-topmatt/" },
      { slug: "laminat-kompaktowy", label: "Laminat kompaktowy", path: "/blaty/laminat-kompaktowy/" },
    ],
  },
  {
    slug: "panele-wnekowe",
    label: "Panele wnękowe",
    path: "/panele-wnekowe/",
    subtypes: [],
  },
] as const satisfies readonly ShopSection[];

export type ShopSectionSlug = (typeof SHOP_SECTIONS)[number]["slug"];

export const SHOP_SECTION_SLUGS: readonly ShopSectionSlug[] = SHOP_SECTIONS.map((section) => section.slug);

export function isShopSection(value: string): value is ShopSectionSlug {
  return (SHOP_SECTION_SLUGS as readonly string[]).includes(value);
}

export function sectionLabel(slug: ShopSectionSlug): string {
  const section = SHOP_SECTIONS.find((item) => item.slug === slug);
  if (!section) return slug;
  return section.label;
}
