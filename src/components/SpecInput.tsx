import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileCode2,
  Globe,
  Loader2,
  Upload,
} from 'lucide-react';
import type { ParsedSpecSummary } from '../types/index.ts';

interface SpecInputProps {
  specText: string;
  onSpecChange: (nextSpec: string) => void;
  parsedSummary: ParsedSpecSummary | null;
  validationError: string | null;
  isValidating: boolean;
  onValidate: (overrideSpec?: string) => Promise<void>;
  onFetchUrl: (url: string) => Promise<void>;
  isFetchingUrl: boolean;
}

const METHOD_STYLES: Record<string, string> = {
  GET: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  POST: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
  PUT: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
  PATCH: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
  DELETE: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20',
};

export const SpecInput: React.FC<SpecInputProps> = ({
  specText,
  onSpecChange,
  parsedSummary,
  validationError,
  isValidating,
  onValidate,
  onFetchUrl,
  isFetchingUrl,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showUrlBar, setShowUrlBar] = useState(false);
  const [specUrl, setSpecUrl] = useState('https://petstore3.swagger.io/api/v3/openapi.json');
  const [showEndpoints, setShowEndpoints] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const trimmed = specText.trim();
  const detectedFormat = trimmed.startsWith('{') || trimmed.startsWith('[') ? 'JSON' : 'YAML';
  const lineCount = specText ? specText.split(/\r?\n/).length : 0;

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onSpecChange(reader.result);
        void onValidate(reader.result);
      }
    };
    reader.readAsText(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specUrl.trim()) return;
    await onFetchUrl(specUrl.trim());
    setShowUrlBar(false);
  };

  return (
    <section
      aria-label="OpenAPI specification input"
      className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#13151A] overflow-hidden"
    >
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <FileCode2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">
            OpenAPI 3.x Specification
          </h2>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
            {detectedFormat} · {lineCount} lines
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.yaml,.yml,application/json,text/yaml"
            onChange={handleFileInput}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => setShowUrlBar((v) => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            Import URL
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload File
          </button>
        </div>
      </div>

      {/* Optional URL Fetch Drawer */}
      {showUrlBar && (
        <form
          onSubmit={handleUrlSubmit}
          className="px-4 py-3 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0E1015] flex items-center gap-2"
        >
          <input
            type="url"
            value={specUrl}
            onChange={(e) => setSpecUrl(e.target.value)}
            placeholder="https://petstore3.swagger.io/api/v3/openapi.json"
            className="flex-1 min-w-0 px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#13151A] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isFetchingUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isFetchingUrl && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Fetch & Validate
          </button>
        </form>
      )}

      {/* Textarea Editor with Drag-and-Drop */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative transition-colors ${
          isDragging ? 'bg-blue-500/10' : ''
        }`}
      >
        <textarea
          value={specText}
          onChange={(e) => onSpecChange(e.target.value)}
          spellCheck={false}
          aria-label="Paste OpenAPI 3.x JSON or YAML specification"
          placeholder="Paste your OpenAPI 3.0 or 3.1 JSON/YAML spec here, or drop a .json / .yaml file..."
          className="w-full h-64 p-4 font-mono text-xs leading-relaxed bg-[#0D0F14] text-slate-200 placeholder:text-slate-500 focus:outline-none resize-y border-0"
        />
        {isDragging && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-blue-950/75 text-blue-100 text-sm font-medium border-2 border-dashed border-blue-400">
            Drop OpenAPI JSON or YAML file to load
          </div>
        )}
      </div>

      {/* Validate Action Row */}
      <div className="px-4 py-3 border-t border-slate-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3 bg-slate-50/60 dark:bg-[#111318]">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Validated with <span className="font-mono">swagger-parser</span> before streaming
        </div>
        <button
          type="button"
          onClick={() => void onValidate()}
          disabled={isValidating || !trimmed}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#181B22] text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-[#1F242D] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {isValidating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
          )}
          Validate Spec
        </button>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div
          role="alert"
          className="px-4 py-3 border-t border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{validationError}</div>
        </div>
      )}

      {/* Parsed Spec Endpoint Summary */}
      {parsedSummary && !validationError && (
        <div className="border-t border-slate-200 dark:border-white/[0.08] px-4 py-3.5 bg-white dark:bg-[#13151A]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Valid OpenAPI {parsedSummary.specVersion}</span>
              </div>
              <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white mt-1 truncate">
                {parsedSummary.title}
              </h3>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono truncate">
                v{parsedSummary.version} · {parsedSummary.baseUrl}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowEndpoints((v) => !v)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors shrink-0 cursor-pointer"
            >
              <span>{showEndpoints ? 'Hide routes' : 'View routes'}</span>
              {showEndpoints ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Numeric Breakdown Row */}
          <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-200/80 dark:border-white/[0.06]">
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Endpoints</div>
              <div className="text-sm font-mono font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">
                {parsedSummary.endpointCount}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Tag Groups</div>
              <div className="text-sm font-mono font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">
                {parsedSummary.tagCount}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Schemas</div>
              <div className="text-sm font-mono font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">
                {parsedSummary.schemaCount}
              </div>
            </div>
          </div>

          {/* Compact Route Table */}
          {showEndpoints && (
            <div className="mt-3 max-h-44 overflow-y-auto divide-y divide-slate-100 dark:divide-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-lg">
              {parsedSummary.endpoints.map((ep, index) => (
                <div
                  key={`${ep.method}-${ep.path}-${index}`}
                  className="px-3 py-2 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`inline-block w-14 text-center py-0.5 text-[10px] font-mono font-semibold rounded border shrink-0 ${
                        METHOD_STYLES[ep.method] ||
                        'text-slate-600 dark:text-slate-300 bg-slate-500/10 border-slate-500/20'
                      }`}
                    >
                      {ep.method}
                    </span>
                    <span className="font-mono text-slate-800 dark:text-slate-200 truncate">
                      {ep.path}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[160px] shrink-0">
                    {ep.operationId}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
