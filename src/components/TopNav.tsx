import React from 'react';

export type AppRoute = '/' | '/generate' | '/docs';

interface TopNavProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute, hash?: string) => void;
}

export const TopNav: React.FC<TopNavProps> = ({ currentRoute, onNavigate }) => {
  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    route: AppRoute,
    hash?: string,
  ) => {
    e.preventDefault();
    onNavigate(route, hash);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/95 dark:bg-[#0B0C0F]/95">
      <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element brand wordmark */}
        <a
          href="/"
          onClick={(e) => handleLinkClick(e, '/')}
          className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
        >
          SpecForge
        </a>

        {/* Zone 2: 4 single-line navigation links */}
        <nav
          aria-label="Primary"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          <a
            href="/"
            onClick={(e) => handleLinkClick(e, '/')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 dark:hover:text-white underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm ${
              currentRoute === '/' ? 'text-slate-900 dark:text-white underline' : ''
            }`}
          >
            Overview
          </a>
          <a
            href="/generate"
            onClick={(e) => handleLinkClick(e, '/generate')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 dark:hover:text-white underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm ${
              currentRoute === '/generate' ? 'text-slate-900 dark:text-white underline' : ''
            }`}
          >
            Workspace
          </a>
          <a
            href="/#presets"
            onClick={(e) => handleLinkClick(e, '/', '#presets')}
            className="whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 dark:hover:text-white underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
          >
            Presets
          </a>
          <a
            href="/docs"
            onClick={(e) => handleLinkClick(e, '/docs')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 dark:hover:text-white underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm ${
              currentRoute === '/docs' ? 'text-slate-900 dark:text-white underline' : ''
            }`}
          >
            Guide
          </a>
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center shrink-0">
          {currentRoute === '/generate' ? (
            <button
              type="button"
              onClick={() => onNavigate('/docs')}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#151821] text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#1C202B] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
            >
              Read Guide
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('/generate')}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
            >
              Open Generator
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
