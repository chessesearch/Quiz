"use client";

import { memo } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/themes/prism-tomorrow.css";
import { DisplayBlock } from "@/lib/parser";

function detectLanguage(code: string): string {
  const pythonKeywords = ["def ", "elif ", "import math", "print(", "len(", "range("];
  const jsKeywords = ["const ", "let ", "var ", "function ", "console.log", "=>"];
  
  let pyCount = 0;
  let jsCount = 0;
  
  pythonKeywords.forEach(k => {
    if (code.includes(k)) pyCount++;
  });
  jsKeywords.forEach(k => {
    if (code.includes(k)) jsCount++;
  });
  
  return pyCount >= jsCount ? "python" : "javascript";
}

function highlightCode(content: string): string[] {
  const lang = detectLanguage(content);
  const grammar = Prism.languages[lang] || Prism.languages.javascript;
  
  return content.split("\n").map(line => {
    if (!line) return "";
    return Prism.highlight(line, grammar, lang);
  });
}

export const CodeBlock = memo(({ content }: { content: string }) => {
  const lines = content.split('\n');
  const highlightedLines = highlightCode(content);

  return (
    <div className="my-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 font-mono text-xs md:text-sm overflow-hidden transition-colors duration-300 shadow-inner flex flex-col max-h-[320px] md:max-h-[450px]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700/50 bg-slate-100/50 dark:bg-slate-900/50 text-[10px] md:text-xs font-sans text-slate-400 select-none shrink-0">
        <span>Code Block</span>
        <span className="text-[9px] uppercase tracking-wider bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-semibold">Read Only</span>
      </div>
      <div className="overflow-auto p-4 flex flex-1">
        <div className="text-right text-slate-400 select-none pr-4 border-r border-slate-200 dark:border-slate-700/50 mr-4 font-mono text-xs md:text-sm shrink-0">
          {lines.map((_, i) => (
            <div key={i} className="leading-relaxed h-5">{i + 1}</div>
          ))}
        </div>
        <pre className="flex-1 text-slate-800 dark:text-slate-200 leading-relaxed font-mono text-xs md:text-sm overflow-visible whitespace-pre" style={{ tabSize: 4 }}>
          {highlightedLines.map((line, i) => (
            <div key={i} className="h-5" dangerouslySetInnerHTML={{ __html: line || ' ' }} />
          ))}
        </pre>
      </div>
    </div>
  );
});
CodeBlock.displayName = "CodeBlock";

export const ImageBlock = memo(({ src }: { src: string }) => {
  return (
    <div className="my-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-900 transition-colors duration-300 flex justify-center items-center p-4 max-w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Display Block Content"
        className="max-h-[300px] md:max-h-[400px] object-contain rounded-lg w-auto"
      />
    </div>
  );
});
ImageBlock.displayName = "ImageBlock";

interface DisplayBlockRendererProps {
  block: DisplayBlock;
}

export const DisplayBlockRenderer = memo(function DisplayBlockRenderer({ block }: DisplayBlockRendererProps) {
  if (block.type === "code") {
    return <CodeBlock content={block.content} />;
  }
  if (block.type === "image") {
    return <ImageBlock src={block.content} />;
  }
  // Fallback for other block types
  return (
    <div className="my-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs md:text-sm whitespace-pre-wrap leading-relaxed">
      {block.content}
    </div>
  );
});
DisplayBlockRenderer.displayName = "DisplayBlockRenderer";
