import { useParams } from 'react-router';
import { findSection } from '../data/home';
import { BRAND } from '../config/brand';
import { MediaCard } from '../components/media/MediaCard';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ComingSoon } from './ComingSoon';

/** "Show all" view: every item of a home shelf in a responsive grid. */
export function SectionPage() {
  const { id } = useParams();
  const section = findSection(id);
  useDocumentTitle(section ? `${section.title} | ${BRAND.name}` : BRAND.name);

  if (!section) return <ComingSoon />;

  return (
    <div className="px-4 pb-6 pt-6 sm:px-7">
      <h1 className="mb-4 px-3 text-[32px] font-bold tracking-tight">{section.title}</h1>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
        {section.items.map((item) => (
          <MediaCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
