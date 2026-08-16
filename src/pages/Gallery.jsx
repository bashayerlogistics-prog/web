import GalleryHero from '../components/gallery/GalleryHero';
import GalleryCoverflow from '../components/gallery/GalleryCoverflow';
import GalleryCollage from '../components/gallery/GalleryCollage';

export default function Gallery() {
  return (
    <main className="gallery-page">
      <GalleryHero />
      <GalleryCoverflow />
      <GalleryCollage />
    </main>
  );
}
