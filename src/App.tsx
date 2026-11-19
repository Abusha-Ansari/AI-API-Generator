import { useCallback, useEffect, useState } from 'react';
import { DocsPage } from './components/DocsPage.tsx';
import { GeneratorWorkspace } from './components/GeneratorWorkspace.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { TopNav, type AppRoute } from './components/TopNav.tsx';

function resolveRouteFromPath(pathname: string): AppRoute {
  if (pathname.startsWith('/generate')) return '/generate';
  if (pathname.startsWith('/docs')) return '/docs';
  return '/';
}

function readSharedSpecFromHash(): string | undefined {
  try {
    const hash = window.location.hash;
    if (!hash.startsWith('#spec=')) return undefined;
    const encoded = hash.slice(6);
    if (!encoded) return undefined;
    return decodeURIComponent(escape(atob(encoded)));
  } catch {
    return undefined;
  }
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() =>
    resolveRouteFromPath(window.location.pathname),
  );
  const [launchedSpec, setLaunchedSpec] = useState<string | undefined>(() =>
    readSharedSpecFromHash(),
  );
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('specforge_theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('specforge_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    const onPopState = () => {
      setRoute(resolveRouteFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((nextRoute: AppRoute, hash?: string) => {
    const targetUrl = hash ? `${nextRoute}${hash}` : nextRoute;
    if (window.location.pathname + window.location.hash !== targetUrl) {
      window.history.pushState(null, '', targetUrl);
    }
    setRoute(nextRoute);

    if (hash) {
      requestAnimationFrame(() => {
        const el = document.querySelector(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      });
    } else {
      window.scrollTo({ top: 0 });
    }
  }, []);

  const handleLaunchWithSpec = useCallback(
    (spec: string) => {
      setLaunchedSpec(spec);
      navigate('/generate');
    },
    [navigate],
  );

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0C0F] text-slate-900 dark:text-slate-100 transition-colors">
      <TopNav currentRoute={route} onNavigate={navigate} />

      <main>
        {route === '/' && (
          <LandingPage
            isDark={isDark}
            onToggleTheme={toggleTheme}
            onNavigate={navigate}
            onLaunchWithSpec={handleLaunchWithSpec}
          />
        )}
        {route === '/generate' && (
          <GeneratorWorkspace
            initialSpec={launchedSpec}
            isDark={isDark}
            onToggleTheme={toggleTheme}
          />
        )}
        {route === '/docs' && (
          <DocsPage
            isDark={isDark}
            onToggleTheme={toggleTheme}
            onNavigate={navigate}
          />
        )}
      </main>
    </div>
  );
}
