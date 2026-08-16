import { getDocs, getCountFromServer, collection, limit, query } from 'firebase/firestore';
import { db } from './db';
import {
  seedDefaultProducts,
  seedDefaultServices,
  seedDefaultBlogs,
  seedDefaultRouteCards,
  seedDefaultFaqs,
  seedDefaultSocialLinks,
  seedDefaultGalleryItems,
  seedDefaultCars,
  replaceDefaultBlogs,
  getAllBlogs,
} from './admin';
import { getAllDefaultProducts, getDefaultServices, getDefaultBlogs, getDefaultRouteCards, getDefaultFaqs, getDefaultSocialLinks, getDefaultGalleryItems } from '../data/contentSeeds';
import { getDefaultCarCatalog } from '../data/staticData';

let seedPromise = null;

async function safeCollectionSize(collectionName) {
  try {
    const snap = await getCountFromServer(collection(db, collectionName));
    return snap.data().count;
  } catch (err) {
    console.warn(`Failed to read ${collectionName}:`, err.code || err.message);
    return -1;
  }
}

async function safeCollectionEmpty(collectionName) {
  try {
    const snap = await getDocs(query(collection(db, collectionName), limit(1)));
    return snap.empty;
  } catch (err) {
    console.warn(`Failed to check ${collectionName}:`, err.code || err.message);
    return false;
  }
}

export async function getContentCounts() {
  const [products, services, blogs, routeCards, faqs, socialLinks, gallery] = await Promise.all([
    safeCollectionSize('packages'),
    safeCollectionSize('services'),
    safeCollectionSize('blogs'),
    safeCollectionSize('routeCards'),
    safeCollectionSize('faqs'),
    safeCollectionSize('socialLinks'),
    safeCollectionSize('gallery'),
  ]);
  return {
    products: products < 0 ? 0 : products,
    services: services < 0 ? 0 : services,
    blogs: blogs < 0 ? 0 : blogs,
    routeCards: routeCards < 0 ? 0 : routeCards,
    faqs: faqs < 0 ? 0 : faqs,
    socialLinks: socialLinks < 0 ? 0 : socialLinks,
    gallery: gallery < 0 ? 0 : gallery,
  };
}

export async function seedAllSiteContent() {
  const [products, services, blogs, routeCards, faqs, socialLinks, gallery] = await Promise.all([
    seedDefaultProducts(getAllDefaultProducts()),
    seedDefaultServices(getDefaultServices()),
    seedDefaultBlogs(getDefaultBlogs()),
    seedDefaultRouteCards(getDefaultRouteCards()),
    seedDefaultFaqs(getDefaultFaqs()),
    seedDefaultSocialLinks(getDefaultSocialLinks()),
    seedDefaultGalleryItems(getDefaultGalleryItems()),
  ]);
  return {
    products: products.imported,
    services: services.imported,
    blogs: blogs.imported,
    routeCards: routeCards.imported,
    faqs: faqs.imported,
    socialLinks: socialLinks.imported,
    gallery: gallery.imported,
    alreadyExists: products.alreadyExists && services.alreadyExists && blogs.alreadyExists
      && routeCards.alreadyExists && faqs.alreadyExists && socialLinks.alreadyExists
      && gallery.alreadyExists,
  };
}

async function seedIfEmpty(collectionName, seedFn, getDefaultsFn) {
  try {
    if (!await safeCollectionEmpty(collectionName)) return 0;
    const seeded = await seedFn(getDefaultsFn());
    return seeded.imported;
  } catch (err) {
    console.warn(`Seed failed for ${collectionName}:`, err.code || err.message);
    return 0;
  }
}

/** Upgrade / refresh blogs to the 6 SuperAdmin service-guide headings. */
async function ensureServiceBlogs() {
  try {
    const existing = await getAllBlogs();
    const defaults = getDefaultBlogs();
    if (existing.length === 0) {
      const seeded = await seedDefaultBlogs(defaults);
      return seeded.imported;
    }

    const byService = new Map(
      existing.filter((blog) => blog.serviceId).map((blog) => [blog.serviceId, blog]),
    );
    const hasAllServices = defaults.every((def) => {
      const blog = byService.get(def.serviceId);
      return blog && blog.active !== false;
    });
    const titlesMatch = defaults.every((def) => {
      const blog = byService.get(def.serviceId);
      return blog?.titleEn === def.titleEn && blog?.titleAr === def.titleAr;
    });

    if (hasAllServices && titlesMatch && existing.length >= defaults.length) return 0;
    return await replaceDefaultBlogs(defaults);
  } catch (err) {
    console.warn('Blog service upgrade skipped:', err.code || err.message);
    return 0;
  }
}

export async function ensureDefaultSiteContent() {
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    const result = { products: 0, services: 0, blogs: 0, routeCards: 0, faqs: 0, socialLinks: 0, gallery: 0, cars: 0 };

    result.products = await seedIfEmpty('packages', seedDefaultProducts, getAllDefaultProducts);
    result.services = await seedIfEmpty('services', seedDefaultServices, getDefaultServices);
    result.blogs = await ensureServiceBlogs();
    result.routeCards = await seedIfEmpty('routeCards', seedDefaultRouteCards, getDefaultRouteCards);
    result.faqs = await seedIfEmpty('faqs', seedDefaultFaqs, getDefaultFaqs);
    result.socialLinks = await seedIfEmpty('socialLinks', seedDefaultSocialLinks, getDefaultSocialLinks);
    result.gallery = await seedIfEmpty('gallery', seedDefaultGalleryItems, getDefaultGalleryItems);
    result.cars = await seedIfEmpty('vehicles', seedDefaultCars, getDefaultCarCatalog);

    return result;
  })();

  return seedPromise;
}
