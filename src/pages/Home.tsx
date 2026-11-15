import { homeSections } from '../data/home';
import { BRAND } from '../config/brand';
import { Shelf } from '../components/media/Shelf';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function Home() {
  useDocumentTitle(`${BRAND.name} – Web Player: Music for everyone`);

  return (
    <div className="flex flex-col gap-10 px-4 pb-6 pt-6 sm:px-7">
      {homeSections.map((section) => (
        <Shelf key={section.id} section={section} />
      ))}
    </div>
  );
}
