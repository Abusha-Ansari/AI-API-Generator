import React, { useEffect, useMemo, useRef } from 'react';
import { extractDownloadableContent } from '../lib/artifacts.ts';
import type { ArtifactStreamStatus, ArtifactType } from '../types/index.ts';

interface StreamingCodeBlockProps {
  artifact: ArtifactType;
  content: string;
  status: ArtifactStreamStatus;
  autoScroll: boolean;
}

function tokenizeLine(line: string, artifact: ArtifactType): React.ReactNode {
  if (!line) return ' ';

  if (artifact === 'docs' || artifact === 'examples') {
    if (/^#{1,6}\s/.test(line)) {
      return <span className="text-blue-400 font-semibold">{line}</span>;
    }
    if (/^```/.test(line.trim())) {
      return <span className="text-slate-500">{line}</span>;
    }
    if (/^\s*[-*]\s/.test(line) || /^\s*\|/.test(line)) {
      return <span className="text-slate-300">{line}</span>;
    }
    return <span className="text-slate-200">{line}</span>;
  }

  if (artifact === 'postman') {
    const keyValMatch = line.match(/^(\s*)"([^"]+)"(\s*:\s*)(.*)$/);
    if (keyValMatch) {
      const [, indent, key, sep, rest] = keyValMatch;
      return (
        <>
          <span>{indent}</span>
          <span className="text-sky-300">&quot;{key}&quot;</span>
          <span className="text-slate-400">{sep}</span>
          <span className={rest.trim().startsWith('"') ? 'text-emerald-300' : 'text-amber-300'}>
            {rest}
          </span>
        </>
      );
    }
    return <span className="text-slate-300">{line}</span>;
  }

  // TypeScript / Test highlighting
  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
    return <span className="text-slate-500 italic">{line}</span>;
  }

  const parts = line.split(
    /(\b(?:export|import|from|interface|type|class|constructor|public|private|async|await|return|const|let|function|if|else|throw|new|try|catch|describe|it|expect|vi|jest|beforeEach)\b|"[^"]*"|'[^']*'|`[^`]*`)/g,
  );

  return parts.map((part, idx) => {
    if (!part) return null;
    if (
      /^(export|import|from|interface|type|class|constructor|public|private|async|await|return|const|let|function|if|else|throw|new|try|catch|describe|it|expect|vi|jest|beforeEach)$/.test(
        part,
      )
    ) {
      return (
        <span key={idx} className="text-blue-400">
          {part}
        </span>
      );
    }
    if (/^["'`]/.test(part)) {
      return (
        <span key={idx} className="text-emerald-300">
          {part}
        </span>
      );
    }
    return (
      <span key={idx} className="text-slate-200">
        {part}
      </span>
    );
  });
}

export const StreamingCodeBlock: React.FC<StreamingCodeBlockProps> = ({
  artifact,
  content,
  status,
  autoScroll,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const displayContent = useMemo(() => {
    if (!content) return '';
    return extractDownloadableContent(content, artifact).replace(/\n$/, '');
  }, [content, artifact]);

  const lines = useMemo(() => displayContent.split(/\r?\n/), [displayContent]);

  useEffect(() => {
    if (autoScroll && status === 'streaming' && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [displayContent, autoScroll, status]);

  return (
    <div
      ref={scrollContainerRef}
      className="h-[540px] lg:h-[620px] overflow-auto bg-[#0D0F14] text-slate-200 font-mono text-xs leading-6"
    >
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line, idx) => (
            <tr key={idx} className="hover:bg-white/[0.03]">
              <td className="select-none text-right pr-4 pl-4 py-0 text-slate-600 tabular-nums w-12 align-top border-r border-white/[0.06]">
                {idx + 1}
              </td>
              <td className="pl-4 pr-6 py-0 whitespace-pre align-top">
                {tokenizeLine(line, artifact)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
