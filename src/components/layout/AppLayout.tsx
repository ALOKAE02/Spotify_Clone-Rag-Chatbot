import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { readStored, writeStored } from '../../lib/storage';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { ResizeHandle } from './ResizeHandle';
import { NowPlayingPanel } from './NowPlayingPanel';
import { PreviewBanner } from './PreviewBanner';
import { Footer } from './Footer';
import { Assistant } from '../assistant/Assistant';

const SIDEBAR_MIN = 280;
const SIDEBAR_MAX = 420;
const SIDEBAR_DEFAULT = 340;
const SIDEBAR_KEY = 'sc-sidebar-width';

function initialSidebarWidth() {
  const stored = Number(readStored(SIDEBAR_KEY));
  return stored >= SIDEBAR_MIN && stored <= SIDEBAR_MAX ? stored : SIDEBAR_DEFAULT;
}

/** Player shell: top bar, library | main | now-playing panels, and the preview banner. */
export function AppLayout() {
  const [sidebarWidth, setSidebarWidth] = useState(initialSidebarWidth);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    writeStored(SIDEBAR_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  // Each page starts at the top of the main view.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-black text-white">
      <TopBar />
      <div className="flex min-h-0 flex-1 px-2">
        <Sidebar width={sidebarWidth} />
        <ResizeHandle width={sidebarWidth} min={SIDEBAR_MIN} max={SIDEBAR_MAX} onResize={setSidebarWidth} />
        <main className="relative min-w-0 flex-1 overflow-hidden rounded-lg bg-surface">
          <div ref={scrollRef} className="scroll-area h-full overflow-y-auto">
            <Outlet />
            <Footer />
          </div>
          <Assistant />
        </main>
        <NowPlayingPanel />
      </div>
      <PreviewBanner />
    </div>
  );
}
