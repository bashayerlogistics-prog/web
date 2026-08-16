export const DEFAULT_HOME_SECTIONS = {
  hero: { active: true, order: 0 },
  booking: { active: true, order: 1 },
  instantPrice: { active: true, order: 2 },
  religiousTours: { active: true, order: 3 },
  routes: { active: true, order: 4 },
  fleet: { active: true, order: 5 },
  servicesCatalog: { active: true, order: 6 },
  faq: { active: true, order: 7 },
  stats: { active: true, order: 8 },
  services: { active: true, order: 9 },
  about: { active: true, order: 10 },
  blog: { active: true, order: 11 },
};

export const HOME_SECTION_LIST = [
  { id: 'hero', labelKey: 'admin.sections.hero', descKey: 'admin.sections.heroDesc' },
  { id: 'booking', labelKey: 'admin.sections.booking', descKey: 'admin.sections.bookingDesc' },
  { id: 'instantPrice', labelKey: 'admin.sections.instantPrice', descKey: 'admin.sections.instantPriceDesc' },
  { id: 'religiousTours', labelKey: 'admin.sections.religiousTours', descKey: 'admin.sections.religiousToursDesc' },
  { id: 'routes', labelKey: 'admin.sections.routes', descKey: 'admin.sections.routesDesc' },
  { id: 'fleet', labelKey: 'admin.sections.fleet', descKey: 'admin.sections.fleetDesc' },
  { id: 'servicesCatalog', labelKey: 'admin.sections.servicesCatalog', descKey: 'admin.sections.servicesCatalogDesc' },
  { id: 'faq', labelKey: 'admin.sections.faq', descKey: 'admin.sections.faqDesc' },
  { id: 'stats', labelKey: 'admin.sections.stats', descKey: 'admin.sections.statsDesc' },
  { id: 'services', labelKey: 'admin.sections.services', descKey: 'admin.sections.servicesDesc' },
  { id: 'about', labelKey: 'admin.sections.about', descKey: 'admin.sections.aboutDesc' },
  { id: 'blog', labelKey: 'admin.sections.blog', descKey: 'admin.sections.blogDesc' },
];

export function mergeHomeSections(firestoreSections = {}) {
  const merged = { ...DEFAULT_HOME_SECTIONS };
  for (const [key, value] of Object.entries(firestoreSections)) {
    if (merged[key]) {
      merged[key] = { ...merged[key], ...value };
    }
  }
  return merged;
}

export function isSectionActive(sections, sectionId) {
  return sections?.[sectionId]?.active ?? DEFAULT_HOME_SECTIONS[sectionId]?.active ?? true;
}
