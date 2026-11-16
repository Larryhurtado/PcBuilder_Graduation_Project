import BrandStrip from './BrandStrip.jsx';
import CategoriesSection from './CategoriesSection.jsx';
import FeaturedOffers from './FeaturedOffers.jsx';
import Hero from './Hero.jsx';
import VerifiedStores from './VerifiedStores.jsx';

/** Inicio (/): acceso al asistente, categorías, ofertas destacadas y comercios verificados. */
export default function HomePage() {
  return (
    <>
      <Hero />
      <BrandStrip />
      <CategoriesSection />
      <FeaturedOffers />
      <VerifiedStores />
    </>
  );
}
