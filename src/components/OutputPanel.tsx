import React, { useState } from 'react';
import JSZip from 'jszip';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileArchive,
  Loader2,
  Terminal,
} from 'lucide-react';
import {
  ARTIFACT_META,
  extractDownloadableContent,
  getArtifactFilename,
} from '../lib/artifacts.ts';
import { StreamingCodeBlock } from './StreamingCodeBlock.tsx';
import type { ArtifactOutputState, ArtifactType } from '../types/index.ts';

interface OutputPanelProps {
  selectedArtifacts: ArtifactType[];
  activeTab: ArtifactType;
  onTabChange: (artifact: ArtifactType) => void;
  outputs: Partial<Record<ArtifactType, ArtifactOutputState>>;
  apiTitle: string;
}

export const OutputPanel: React.FC<OutputPanelProps> = ({
  selectedArtifacts,
  activeTab,
  onTabChange,
  outputs,
  apiTitle,
}) => {
  const [copiedTab, setCopiedTab] = useState<ArtifactType | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isZipping, setIsZipping] = useState(false);

  const visibleTabs = selectedArtifacts.length > 0 ? selectedArtifacts : (['sdk'] as ArtifactType[]);
  const currentTab = visibleTabs.includes(activeTab) ? activeTab : visibleTabs[0];
  const currentState = outputs[currentTab];
  const currentMeta = ARTIFACT_META[currentTab];

  const completedTabs = visibleTabs.filter(
    (id) => outputs[id]?.status === 'complete' && Boolean(outputs[id]?.content),
  );

  const handleCopy = async () => {
    if (!currentState?.content) return;
    const clean = extractDownloadableContent(currentState.content, currentTab);
    await navigator.clipboard.writeText(clean);
    setCopiedTab(currentTab);
    setTimeout(() => setCopiedTab(null), 1800);
  };

  const handleDownloadSingle = () => {
    if (!currentState?.content) return;
    const clean = extractDownloadableContent(currentState.content, currentTab);
    const filename = getArtifactFilename(apiTitle, currentTab);
    const blob = new Blob([clean], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllZip = async () => {
    if (completedTabs.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      for (const tabId of completedTabs) {
        const raw = outputs[tabId]?.content;
        if (!raw) continue;
        const clean = extractDownloadableContent(raw, tabId);
        zip.file(getArtifactFilename(apiTitle, tabId), clean);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${apiTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'specforge'}-artifacts.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsZipping(false);
    }
  };

  const renderStatusLabel = (state?: ArtifactOutputState) => {
    if (!state || state.status === 'idle') {
      return <span className="text-[11px] text-slate-400">Idle</span>;
    }
    if (state.status === 'streaming') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] text-blue-500">
          <Loader2 className="w-3 h-3 animate-spin" />
          Streaming
        </span>
      );
    }
    if (state.status === 'complete') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500">
          <CheckCircle2 className="w-3 h-3" />
          Ready
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-red-500">
        <AlertCircle className="w-3 h-3" />
        Error
      </span>
    );
  };

  const lineCount = currentState?.content
    ? extractDownloadableContent(currentState.content, currentTab).split(/\r?\n/).length
    : 0;

  const elapsedSeconds =
    currentState?.startedAt && currentState?.completedAt
      ? ((currentState.completedAt - currentState.startedAt) / 1000).toFixed(1)
      : null;

  return (
    <section
      aria-label="Generated output panel"
      className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#13151A] overflow-hidden flex flex-col"
    >
      {/* Artifact Tabs Header */}
      <div className="border-b border-slate-200 dark:border-white/[0.08] px-3 pt-2.5 flex items-center justify-between gap-4 overflow-x-auto bg-slate-50/70 dark:bg-[#111318]">
        <div role="tablist" className="flex items-center gap-1">
          {visibleTabs.map((tabId) => {
            const meta = ARTIFACT_META[tabId];
            const state = outputs[tabId];
            const active = tabId === currentTab;

            return (
              <button
                key={tabId}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => onTabChange(tabId)}
                className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'border-blue-600 text-slate-900 dark:text-white bg-white dark:bg-[#13151A]'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{meta.shortLabel}</span>
                {state?.status === 'streaming' && (
                  <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                )}
                {state?.status === 'complete' && (
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                )}
                {state?.status === 'error' && (
                  <AlertCircle className="w-3 h-3 text-red-500" />
                )}
              </button>
            );
          })}
        </div>

        {completedTabs.length > 1 && (
          <button
            type="button"
            disabled={isZipping}
            onClick={() => void handleDownloadAllZip()}
            className="mb-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181B22] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1F242D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileArchive className="w-3.5 h-3.5 text-blue-500" />
            Download All (.zip)
          </button>
        )}
      </div>

      {/* Active Tab Action Bar */}
      <div className="px-4 py-2.5 border-b border-slate-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#13151A]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
            {getArtifactFilename(apiTitle, currentTab)}
          </span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
            ·
          </span>
          {renderStatusLabel(currentState)}
          {lineCount > 0 && (
            <>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                ·
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                {lineCount} lines{elapsedSeconds ? ` · ${elapsedSeconds}s` : ''}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none mr-1">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-slate-300 dark:border-white/20 accent-blue-600"
            />
            Follow stream
          </label>

          <button
            type="button"
            disabled={!currentState?.content}
            onClick={() => void handleCopy()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copiedTab === currentTab ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>

          <button
            type="button"
            disabled={!currentState?.content}
            onClick={handleDownloadSingle}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download .{currentMeta.extension}
          </button>
        </div>
      </div>

      {/* Main Viewer Surface */}
      {currentState?.status === 'error' ? (
        <div className="h-[540px] lg:h-[620px] bg-[#0D0F14] flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
          <h3 className="font-display text-sm font-semibold text-white">
            Failed to generate {currentMeta.label}
          </h3>
          <p className="text-xs text-red-300/90 max-w-md mt-2 leading-relaxed">
            {currentState.error || 'An unexpected error occurred while streaming.'}
          </p>
        </div>
      ) : currentState?.content ? (
        <StreamingCodeBlock
          artifact={currentTab}
          content={currentState.content}
          status={currentState.status}
          autoScroll={autoScroll}
        />
      ) : currentState?.status === 'streaming' ? (
        <div className="h-[540px] lg:h-[620px] bg-[#0D0F14] flex flex-col items-center justify-center p-8 text-center">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-200">
            Streaming {currentMeta.label}...
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Waiting for first tokens from the server model stream.
          </p>
        </div>
      ) : (
        <div className="h-[540px] lg:h-[620px] bg-[#0D0F14] flex flex-col items-center justify-center p-8 text-center">
          <div className="w-10 h-10 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center mb-3">
            <Terminal className="w-5 h-5 text-slate-400" />
          </div>
          <h3 className="font-display text-sm font-semibold text-slate-200">
            {currentMeta.label} Ready to Generate
          </h3>
          <p className="text-xs text-slate-400 max-w-md mt-1.5 leading-relaxed">
            {currentMeta.description} Validate your OpenAPI 3.x specification on the left and select
            Generate to stream output here in real time.
          </p>
        </div>
      )}
    </section>
  );
};
