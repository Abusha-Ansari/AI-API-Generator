import React from 'react';
import { ArrowRight, Moon, Sun } from 'lucide-react';
import type { AppRoute } from './TopNav.tsx';

interface DocsPageProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onNavigate: (route: AppRoute) => void;
}

export const DocsPage: React.FC<DocsPageProps> = ({
  isDark,
  onToggleTheme,
  onNavigate,
}) => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/[0.08]">
        <div>
          <p className="text-xs font-mono text-blue-600 dark:text-blue-400">
            Documentation · Pipeline Architecture
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Using SpecForge with OpenAPI 3.x
          </h1>
        </div>
        <button
          type="button"
          onClick={onToggleTheme}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#13151A] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
        >
          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          {isDark ? 'Light' : 'Dark'}
        </button>
      </div>

      <div className="mt-8 space-y-10 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <section>
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
            01. Validation &amp; Schema Dereferencing
          </h2>
          <p className="mt-2.5">
            Before any prompt is sent to an LLM, SpecForge validates your JSON or YAML specification
            on the server using <code className="font-mono text-xs">@apidevtools/swagger-parser</code>.
            Internal <code className="font-mono text-xs">$ref</code> component pointers are
            dereferenced so every endpoint prompt receives resolved request and response object
            shapes rather than disconnected references.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
            02. Artifact Formats &amp; Local Usage
          </h2>
          <div className="mt-4 border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-white/[0.08] bg-white dark:bg-[#13151A]">
            <div className="p-4">
              <div className="font-semibold text-slate-900 dark:text-white">
                TypeScript SDK (<code className="font-mono text-xs">*-sdk.ts</code>)
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Drop directly into <code className="font-mono">src/lib/</code>. Uses native{' '}
                <code className="font-mono">fetch</code> by default with zero runtime dependencies,
                or <code className="font-mono">axios</code> if toggled in the workspace.
              </p>
            </div>
            <div className="p-4">
              <div className="font-semibold text-slate-900 dark:text-white">
                API Documentation (<code className="font-mono text-xs">*-docs.md</code>)
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                GitHub-flavored Markdown tables for parameters, auth headers, and JSON payloads.
              </p>
            </div>
            <div className="p-4">
              <div className="font-semibold text-slate-900 dark:text-white">
                Unit Tests (<code className="font-mono text-xs">*.test.ts</code>)
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Includes mocked <code className="font-mono">fetch</code> assertions for both 2xx
                success and 4xx error responses per endpoint in Vitest or Jest syntax.
              </p>
            </div>
            <div className="p-4">
              <div className="font-semibold text-slate-900 dark:text-white">
                Postman Collection (<code className="font-mono text-xs">*.postman_collection.json</code>)
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Import directly in Postman via <strong>File → Import</strong>. Includes{' '}
                <code className="font-mono">{'{{baseUrl}}'}</code> and{' '}
                <code className="font-mono">{'{{bearerToken}}'}</code> collection variables.
              </p>
            </div>
            <div className="p-4">
              <div className="font-semibold text-slate-900 dark:text-white">
                Request Examples (<code className="font-mono text-xs">*-examples.md</code>)
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Copy-pasteable <code className="font-mono">cURL</code> commands and TypeScript{' '}
                <code className="font-mono">fetch</code> snippets for every operation.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
            03. Bring Your Own Key (BYOK) &amp; Model Selection
          </h2>
          <p className="mt-2.5">
            SpecForge works cleanly on self-hosted deployments with zero server-side API keys
            required. In the workspace, select <strong>Google Gemini</strong>,{' '}
            <strong>OpenAI</strong>, or <strong>Anthropic</strong>, paste your API key or load it
            from a local <code className="font-mono text-xs">.env</code>,{' '}
            <code className="font-mono text-xs">.txt</code>, or{' '}
            <code className="font-mono text-xs">.json</code> file, and pick a preset model, fetch
            your account&apos;s live model list via <code className="font-mono text-xs">Fetch live models</code>,
            or type any custom model ID.
          </p>
          <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400">
            Keys are kept in your browser (session-only by default, or persisted in{' '}
            <code className="font-mono">localStorage</code> when enabled) and forwarded per-request
            to <code className="font-mono">/api/generate</code> via the{' '}
            <code className="font-mono">x-provider-api-key</code> header without being stored on
            the server.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
            04. Keyboard Shortcuts
          </h2>
          <div className="mt-3 flex flex-wrap gap-6 text-xs font-mono">
            <div>
              <span className="text-slate-900 dark:text-white font-semibold">Cmd / Ctrl + Enter</span>
              <span className="text-slate-500 dark:text-slate-400"> — Stream selected artifacts</span>
            </div>
          </div>
        </section>

        <div className="pt-4">
          <button
            type="button"
            onClick={() => onNavigate('/generate')}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors cursor-pointer"
          >
            Open Generator Workspace
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
