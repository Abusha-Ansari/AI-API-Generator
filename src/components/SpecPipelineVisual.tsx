import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ARTIFACT_META, ARTIFACT_ORDER } from '../lib/artifacts.ts';
import type { ArtifactType } from '../types/index.ts';

interface SpecPipelineVisualProps {
  isDark: boolean;
  onSelectArtifact?: (artifact: ArtifactType) => void;
}

const STREAM_SNIPPETS: Record<ArtifactType, string[]> = {
  sdk: [
    'export class MeridianLedgerClient {',
    '  async createTransfer(input: CreateTransferInput): Promise<Transfer> {',
    '    return this.request<Transfer>("POST", "/transfers", { body: input });',
    '  }',
    '}',
  ],
  docs: [
    '## POST /transfers — Execute an atomic ledger transfer',
    '| Field | Type | Required | Constraint |',
    '| sourceAccountId | string | Yes | Valid account ID |',
    '| amountCents | integer | Yes | minimum: 1 |',
  ],
  tests: [
    'it("settles transfer and returns 201 payload", async () => {',
    '  fetchMock.mockResolvedValueOnce(okJson(201, transferFixture));',
    '  const result = await client.createTransfer(validInput);',
    '  expect(result.amountCents).toBe(12500);',
    '});',
  ],
  postman: [
    '{',
    '  "name": "Execute atomic ledger transfer",',
    '  "request": { "method": "POST", "url": "{{baseUrl}}/transfers" },',
    '  "event": [{ "listen": "test", "script": ["pm.response.to.have.status(201);"] }]',
    '}',
  ],
  examples: [
    'curl -X POST "https://api.meridianledger.dev/v2/transfers" \\',
    '  -H "Authorization: Bearer $API_TOKEN" \\',
    '  -H "Content-Type: application/json" \\',
    '  -d \'{"sourceAccountId":"acc_01","amountCents":12500}\'',
  ],
};

const SPEC_ROUTES = [
  { method: 'GET', path: '/accounts' },
  { method: 'POST', path: '/accounts' },
  { method: 'POST', path: '/transfers' },
  { method: 'GET', path: '/webhooks/deliveries' },
];

export const SpecPipelineVisual: React.FC<SpecPipelineVisualProps> = ({
  isDark,
  onSelectArtifact,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [activeArtifact, setActiveArtifact] = useState<ArtifactType>('sdk');
  const [isPaused, setIsPaused] = useState(false);

  // Gently cycle through the 5 artifacts until the user interacts or hovers
  useEffect(() => {
    if (prefersReducedMotion || isPaused) return;
    const timer = window.setInterval(() => {
      setActiveArtifact((current) => {
        const idx = ARTIFACT_ORDER.indexOf(current);
        return ARTIFACT_ORDER[(idx + 1) % ARTIFACT_ORDER.length];
      });
    }, 3800);
    return () => window.clearInterval(timer);
  }, [prefersReducedMotion, isPaused]);

  const handleSelect = (id: ArtifactType) => {
    setActiveArtifact(id);
    setIsPaused(true);
    onSelectArtifact?.(id);
  };

  const currentMeta = ARTIFACT_META[activeArtifact];
  const activeIndex = ARTIFACT_ORDER.indexOf(activeArtifact);
  const snippetLines = STREAM_SNIPPETS[activeArtifact];

  // SVG layout coordinates (viewBox 680 x 320)
  const sourceRightX = 212;
  const sourceCenterY = 160;
  const hubX = 336;
  const hubY = 160;
  const targetLeftX = 456;

  const getTargetY = (idx: number) => 44 + idx * 58;

  const strokeMuted = isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(100, 116, 139, 0.25)';
  const strokeActive = '#3B82F6';
  const cardBg = isDark ? '#141720' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : '#CBD5E1';
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const gridColor = isDark ? 'rgba(148, 163, 184, 0.06)' : 'rgba(15, 23, 42, 0.05)';

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative flex flex-col h-full min-h-[460px] lg:min-h-[520px] rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#0E1015] overflow-hidden"
    >
      {/* Top Interactive 2D Pipeline Schematic */}
      <div className="relative flex-1 flex items-center justify-center px-4 pt-5 pb-3 overflow-hidden">
        <svg
          viewBox="0 0 680 320"
          className="w-full h-auto max-h-[320px] select-none"
          role="img"
          aria-label="Animated pipeline transforming an OpenAPI 3.x specification into five developer artifacts"
        >
          <defs>
            <pattern
              id="specforge-drafting-grid"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 24 0 L 0 0 0 24"
                fill="none"
                stroke={gridColor}
                strokeWidth="1"
              />
            </pattern>
            <linearGradient id="specforge-pulse-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0" />
              <stop offset="50%" stopColor="#60A5FA" stopOpacity="1" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Architectural Grid Backdrop */}
          <rect width="680" height="320" fill="url(#specforge-drafting-grid)" />

          {/* Input Track: OpenAPI Card -> Parser Hub */}
          <path
            d={`M ${sourceRightX} ${sourceCenterY} L ${hubX - 44} ${hubY}`}
            fill="none"
            stroke={strokeActive}
            strokeWidth="1.5"
            strokeOpacity="0.45"
          />
          {!prefersReducedMotion && (
            <motion.path
              d={`M ${sourceRightX} ${sourceCenterY} L ${hubX - 44} ${hubY}`}
              fill="none"
              stroke="#60A5FA"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="18 70"
              initial={{ strokeDashoffset: 88 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          )}

          {/* Output Tracks: Parser Hub -> 5 Artifact Nodes */}
          {ARTIFACT_ORDER.map((id, idx) => {
            const targetY = getTargetY(idx);
            const isSelected = id === activeArtifact;
            const pathD = `M ${hubX + 44} ${hubY} C ${hubX + 94} ${hubY}, ${targetLeftX - 50} ${targetY}, ${targetLeftX} ${targetY}`;

            return (
              <g key={`track-${id}`}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={isSelected ? strokeActive : strokeMuted}
                  strokeWidth={isSelected ? 1.8 : 1.1}
                  strokeOpacity={isSelected ? 0.65 : 1}
                  style={{ transition: 'stroke 200ms ease, stroke-width 200ms ease' }}
                />

                {/* Animated streaming signal traveling down the active track */}
                {!prefersReducedMotion && isSelected && (
                  <motion.path
                    key={`signal-${id}`}
                    d={pathD}
                    fill="none"
                    stroke="#60A5FA"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeDasharray="24 140"
                    initial={{ strokeDashoffset: 164 }}
                    animate={{ strokeDashoffset: 0 }}
                    transition={{
                      duration: 1.25,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  />
                )}
              </g>
            );
          })}

          {/* Left Node: Source OpenAPI 3.x Spec */}
          <g>
            <rect
              x="20"
              y="62"
              width="192"
              height="196"
              rx="10"
              fill={cardBg}
              stroke={cardBorder}
              strokeWidth="1.2"
            />
            <rect x="34" y="78" width="32" height="3.5" rx="1.75" fill="#3B82F6" />
            <text
              x="34"
              y="102"
              fill={textPrimary}
              fontSize="13.5"
              fontWeight="700"
              fontFamily="Plus Jakarta Sans, sans-serif"
            >
              OpenAPI 3.x
            </text>
            <text
              x="34"
              y="119"
              fill={textSecondary}
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
            >
              meridian-ledger.yaml
            </text>

            {/* Route rows inside spec card with subtle active scan highlight */}
            {SPEC_ROUTES.map((route, idx) => {
              const rowY = 136 + idx * 27;
              const isHighlighted = activeIndex % SPEC_ROUTES.length === idx;
              return (
                <g key={`${route.method}-${route.path}`}>
                  <rect
                    x="32"
                    y={rowY}
                    width="168"
                    height="21"
                    rx="4"
                    fill={
                      isHighlighted
                        ? isDark
                          ? 'rgba(59, 130, 246, 0.14)'
                          : 'rgba(59, 130, 246, 0.1)'
                        : isDark
                          ? 'rgba(255, 255, 255, 0.03)'
                          : 'rgba(15, 23, 42, 0.03)'
                    }
                    style={{ transition: 'fill 200ms ease' }}
                  />
                  <text
                    x="39"
                    y={rowY + 13.5}
                    fill={route.method === 'POST' ? '#3B82F6' : '#10B981'}
                    fontSize="8.5"
                    fontWeight="600"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {route.method}
                  </text>
                  <text
                    x="72"
                    y={rowY + 13.5}
                    fill={isHighlighted ? textPrimary : textSecondary}
                    fontSize="9"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {route.path}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Center Compiler Bus Node */}
          <g>
            {/* Outer subtle rotating ring */}
            {!prefersReducedMotion && (
              <motion.rect
                x={hubX - 44}
                y={hubY - 44}
                width="88"
                height="88"
                rx="14"
                fill="none"
                stroke="#3B82F6"
                strokeOpacity="0.28"
                strokeWidth="1.2"
                strokeDasharray="6 6"
                animate={{ rotate: 360 }}
                style={{ originX: `${hubX}px`, originY: `${hubY}px` }}
                transition={{
                  duration: 28,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            )}

            <rect
              x={hubX - 42}
              y={hubY - 38}
              width="84"
              height="76"
              rx="10"
              fill={cardBg}
              stroke="#3B82F6"
              strokeWidth="1.5"
            />
            <text
              x={hubX}
              y={hubY - 8}
              textAnchor="middle"
              fill={textPrimary}
              fontSize="11"
              fontWeight="700"
              fontFamily="Plus Jakarta Sans, sans-serif"
            >
              SpecForge
            </text>
            <text
              x={hubX}
              y={hubY + 9}
              textAnchor="middle"
              fill={textSecondary}
              fontSize="8.5"
              fontFamily="JetBrains Mono, monospace"
            >
              dereference
            </text>
            <text
              x={hubX}
              y={hubY + 22}
              textAnchor="middle"
              fill="#3B82F6"
              fontSize="8.5"
              fontFamily="JetBrains Mono, monospace"
            >
              SSE stream
            </text>
          </g>

          {/* Right Column: 5 Interactive Artifact Nodes */}
          {ARTIFACT_ORDER.map((id, idx) => {
            const meta = ARTIFACT_META[id];
            const centerY = getTargetY(idx);
            const y = centerY - 22;
            const isSelected = id === activeArtifact;

            return (
              <g
                key={id}
                role="button"
                tabIndex={0}
                aria-label={`Preview ${meta.label}`}
                onClick={() => handleSelect(id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect(id);
                  }
                }}
                style={{ cursor: 'pointer', outline: 'none' }}
              >
                <motion.g
                  animate={{ x: isSelected && !prefersReducedMotion ? 4 : 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <rect
                    x={targetLeftX}
                    y={y}
                    width="202"
                    height="44"
                    rx="8"
                    fill={
                      isSelected
                        ? isDark
                          ? '#171E2E'
                          : '#EFF6FF'
                        : cardBg
                    }
                    stroke={isSelected ? '#3B82F6' : cardBorder}
                    strokeWidth={isSelected ? 1.6 : 1}
                    style={{ transition: 'fill 180ms ease, stroke 180ms ease' }}
                  />
                  <text
                    x={targetLeftX + 14}
                    y={y + 19}
                    fill={textPrimary}
                    fontSize="11.5"
                    fontWeight="600"
                    fontFamily="Plus Jakarta Sans, sans-serif"
                  >
                    0{idx + 1}. {meta.label}
                  </text>
                  <text
                    x={targetLeftX + 14}
                    y={y + 34}
                    fill={isSelected ? '#3B82F6' : textSecondary}
                    fontSize="9.5"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    *.{meta.extension}
                  </text>
                </motion.g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Live Animated Output Preview Strip */}
      <div className="border-t border-slate-200 dark:border-white/[0.08] bg-[#0D0F14] px-4 py-3.5 min-h-[124px]">
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="font-mono text-[11px] text-blue-400">
            meridian-ledger{currentMeta.defaultFileSuffix}
          </span>
          <span className="font-mono text-[11px] text-slate-500">
            {currentMeta.language}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeArtifact}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="font-mono text-[11px] leading-5 text-slate-300 overflow-x-auto"
          >
            {snippetLines.map((line, i) => (
              <motion.div
                key={`${activeArtifact}-${i}`}
                initial={prefersReducedMotion ? false : { opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.16,
                  delay: prefersReducedMotion ? 0 : i * 0.045,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="whitespace-pre"
              >
                <span className="inline-block w-5 text-slate-600 select-none tabular-nums">
                  {i + 1}
                </span>
                <span>{line}</span>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Solid Bottom Selector Strip */}
      <div className="border-t border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#13161E] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-mono text-blue-600 dark:text-blue-400">
            {currentMeta.label} · .{currentMeta.extension}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
            {currentMeta.description}
          </div>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0B0C0F] p-1 rounded-lg">
          {ARTIFACT_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => handleSelect(id)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeArtifact === id
                  ? 'bg-white dark:bg-[#1D2230] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {ARTIFACT_META[id].shortLabel}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
