import React from 'react';
import { ArrowRight, Moon, Sun } from 'lucide-react';
import { ARTIFACT_META, ARTIFACT_ORDER } from '../lib/artifacts.ts';
import { SAMPLE_SPECS } from '../lib/sample-specs.ts';
import { SpecPipelineVisual } from './SpecPipelineVisual.tsx';
import type { AppRoute } from './TopNav.tsx';
import type { ArtifactType } from '../types/index.ts';

interface LandingPageProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onNavigate: (route: AppRoute, hash?: string) => void;
  onLaunchWithSpec: (spec: string) => void;
}

const ARTIFACT_PREVIEWS: Record<ArtifactType, string> = {
  sdk: `export class MeridianLedgerClient {
  async listAccounts(query?: { currency?: string; limit?: number }) {
    return this.request<PaginatedAccounts>("GET", "/accounts", { query });
  }
}`,
  docs: `## POST /transfers
Execute an atomic ledger transfer between two accounts.

| Field | Type | Required |
|---|---|---|
| sourceAccountId | string | Yes |
| amountCents | integer | Yes |`,
  tests: `describe("MeridianLedgerClient", () => {
  it("creates an atomic transfer and returns 201", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(201, transferFixture));
    const res = await client.createTransfer(validPayload);
    expect(res.amountCents).toBe(12500);
  });
});`,
  postman: `{
  "info": {
    "name": "Meridian Ledger API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [{ "key": "baseUrl", "value": "https://api.meridianledger.dev/v2" }]
}`,
  examples: `curl -X POST "{{baseUrl}}/transfers" \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"sourceAccountId":"acc_01","destinationAccountId":"acc_02","amountCents":12500}'`,
};

export const LandingPage: React.FC<LandingPageProps> = ({
  isDark,
  onToggleTheme,
  onNavigate,
  onLaunchWithSpec,
}) => {
  return (
    <div className="max-w-[1440px] mx-auto px-6">
      {/* Hero Split */}
      <section className="py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
        <div className="lg:col-span-5 flex flex-col justify-between py-2">
          <div>
            <p className="text-xs font-mono text-blue-600 dark:text-blue-400">
              OpenAPI 3.0 &amp; 3.1 · JSON &amp; YAML · Streaming Output
            </p>
            <h1
              style={{ textWrap: 'balance' }}
              className="mt-4 font-display text-[clamp(2.25rem,3.8vw,3.5rem)] font-bold tracking-tight leading-[1.08] text-slate-900 dark:text-white"
            >
              Turn one OpenAPI spec into five production dev artifacts.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-slate-600 dark:text-slate-400 max-w-xl">
              Validate and dereference JSON or YAML contracts with swagger-parser, then stream typed
              TypeScript SDKs, Markdown reference docs, Vitest or Jest suites, Postman v2.1
              collections, and cURL examples in parallel.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('/generate')}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Open Generator Workspace
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/docs')}
                className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white underline-offset-4 hover:underline transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Read Pipeline Guide
              </button>
            </div>
          </div>

          {/* Grounded Pipeline Summary Row */}
          <div className="mt-12 pt-6 border-t border-slate-200 dark:border-white/[0.08] grid grid-cols-3 gap-6">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Output Targets</div>
              <div className="mt-1 font-mono text-lg font-semibold text-slate-900 dark:text-white tabular-nums">
                5 Artifacts
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Spec Formats</div>
              <div className="mt-1 font-mono text-lg font-semibold text-slate-900 dark:text-white">
                JSON / YAML
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Export Format</div>
              <div className="mt-1 font-mono text-lg font-semibold text-slate-900 dark:text-white">
                Files &amp; ZIP
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <SpecPipelineVisual isDark={isDark} />
        </div>
      </section>

      {/* Capabilities Asymmetric Bento Grid */}
      <section className="py-12 border-t border-slate-200 dark:border-white/[0.08]">
        <div className="max-w-2xl mb-8">
          <h2
            style={{ textWrap: 'balance' }}
            className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white"
          >
            Focused prompts per artifact, grounded in your dereferenced schema.
          </h2>
          <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Every artifact runs through a dedicated system instruction tailored to its target format,
            streaming directly to downloadable files without manual cleanup.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {ARTIFACT_ORDER.map((id, idx) => {
            const meta = ARTIFACT_META[id];
            const spanClass =
              idx === 0 || idx === 3 ? 'lg:col-span-7' : 'lg:col-span-5';

            return (
              <article
                key={id}
                className={`${spanClass} rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#13151A] p-5 flex flex-col justify-between gap-4`}
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                      0{idx + 1}. {meta.label}
                    </h3>
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      *.{meta.extension}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {meta.description}
                  </p>
                </div>

                <pre className="p-3.5 rounded-lg bg-[#0D0F14] text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto border border-white/[0.06]">
                  <code>{ARTIFACT_PREVIEWS[id]}</code>
                </pre>
              </article>
            );
          })}
        </div>
      </section>

      {/* Preset Spec Launcher */}
      <section
        id="presets"
        className="py-12 border-t border-slate-200 dark:border-white/[0.08]"
      >
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Launch directly from an OpenAPI 3.x preset
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
              Test JSON and YAML validation, endpoint inspection, and multi-artifact streaming in one
              click.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {SAMPLE_SPECS.map((preset) => (
            <div
              key={preset.id}
              className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#13151A] p-5 flex flex-col justify-between gap-5"
            >
              <div>
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {preset.format.toUpperCase()} · {preset.summary}
                </div>
                <h3 className="mt-2 font-display text-base font-semibold text-slate-900 dark:text-white">
                  {preset.name}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => onLaunchWithSpec(preset.spec)}
                className="inline-flex items-center justify-between px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0E1015] text-slate-900 dark:text-white hover:border-blue-500/60 hover:bg-blue-500/5 transition-colors cursor-pointer"
              >
                <span>Load in Workspace</span>
                <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="py-8 border-t border-slate-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <span className="font-display font-semibold text-slate-900 dark:text-white">
            SpecForge
          </span>
          <span aria-hidden="true">·</span>
          <span>OpenAPI 3.x Artifact Compiler</span>
        </div>

        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => onNavigate('/generate')}
            className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Workspace
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/docs')}
            className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Guide
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {isDark ? 'Light Theme' : 'Dark Theme'}
          </button>
        </div>
      </footer>
    </div>
  );
};
