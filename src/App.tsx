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

const ROUTE_METADATA: Record<AppRoute, { title: string; description: string }> = {
  '/': {
    title: 'SpecForge — AI API Generator for OpenAPI 3.x',
    description:
      'Transform OpenAPI 3.x JSON or YAML specs into typed TypeScript SDKs, Markdown API docs, unit tests, Postman collections, and cURL examples via streaming AI.',
  },
  '/generate': {
    title: 'Workspace — SpecForge AI API Generator',
    description:
      'Validate OpenAPI 3.x JSON or YAML contracts, pick your LLM provider and model with BYOK, and stream downloadable SDKs, docs, tests, and Postman collections.',
  },
  '/docs': {
    title: 'Guide — SpecForge AI API Generator',
    description:
      'Learn how SpecForge validates OpenAPI schemas, streams five developer artifacts, and works with your own Gemini, OpenAI, or Anthropic API keys.',
  },
};

function upsertMetaTag(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonicalLink(href: string): void {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
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
    const meta = ROUTE_METADATA[route];
    const canonicalUrl = `${window.location.origin}${window.location.pathname}`;
    document.title = meta.title;
    upsertMetaTag('name', 'description', meta.description);
    upsertMetaTag('property', 'og:title', meta.title);
    upsertMetaTag('property', 'og:description', meta.description);
    upsertMetaTag('property', 'og:url', canonicalUrl);
    upsertMetaTag('name', 'twitter:title', meta.title);
    upsertMetaTag('name', 'twitter:description', meta.description);
    upsertCanonicalLink(canonicalUrl);
  }, [route]);

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
