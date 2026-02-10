import React from "react";

interface CodePanelProps {
  title: string;
  code: string;
  variant: "buggy" | "corrected";
  isAnimating?: boolean;
}

const CodePanel: React.FC<CodePanelProps> = ({ title, code, variant, isAnimating }) => {
  const lines = code.split("\n");

  return (
    <div className="flex flex-col h-full rounded-lg border border-border overflow-hidden bg-card">
      {/* Panel Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-panel-header border-b border-border">
        <div className="flex gap-1.5">
          <span className={`w-3 h-3 rounded-full ${variant === "buggy" ? "bg-terminal-red" : "bg-terminal-green"}`} />
          <span className="w-3 h-3 rounded-full bg-terminal-amber" />
          <span className="w-3 h-3 rounded-full bg-muted-foreground/30" />
        </div>
        <span className="font-mono text-xs text-muted-foreground ml-2">{title}</span>
      </div>

      {/* Code Area */}
      <div className="flex-1 overflow-auto bg-code-bg p-0 relative">
        {isAnimating && (
          <div className="absolute inset-0 bg-primary/5 animate-scan pointer-events-none z-10" />
        )}
        <pre className="font-mono text-sm leading-6">
          {lines.map((line, i) => {
            const isComment = line.trim().startsWith("//");
            const lineClass =
              variant === "buggy" && !isComment && line.trim().length > 0
                ? "code-line-bug"
                : variant === "corrected" && !isComment && line.trim().length > 0
                ? "code-line-fix"
                : "code-line-normal";

            return (
              <div key={i} className={`flex ${lineClass} px-2`}>
                <span className="w-8 text-right pr-3 text-muted-foreground/40 select-none text-xs leading-6">
                  {i + 1}
                </span>
                <span
                  className={`flex-1 ${
                    isComment ? "text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {highlightSyntax(line)}
                </span>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
};

function highlightSyntax(line: string): React.ReactNode {
  // Simple syntax highlighting
  const parts: React.ReactNode[] = [];
  let remaining = line;
  let key = 0;

  const keywords = /\b(RDI_BEGIN|RDI_END|measure|iClamp|connect|setVoltage|smartVec|burstUpload|applyResult|HIGH|LOW|BOTH)\b/g;
  const strings = /(["'])(?:(?=(\\?))\2.)*?\1/g;
  const numbers = /\b(\d+\.?\d*)\b/g;
  const comments = /(\/\/.*)/g;

  if (comments.test(remaining)) {
    return <span className="text-muted-foreground italic">{line}</span>;
  }

  // Simple keyword highlight
  const tokens = remaining.split(/(\b(?:RDI_BEGIN|RDI_END|measure|iClamp|connect|setVoltage|smartVec|burstUpload|applyResult|HIGH|LOW|BOTH)\b|\d+\.?\d*)/g);

  return tokens.map((token, i) => {
    if (/^(RDI_BEGIN|RDI_END|measure|iClamp|connect|setVoltage|smartVec|burstUpload|applyResult)$/.test(token)) {
      return <span key={i} className="text-terminal-blue font-semibold">{token}</span>;
    }
    if (/^(HIGH|LOW|BOTH)$/.test(token)) {
      return <span key={i} className="text-terminal-amber">{token}</span>;
    }
    if (/^\d+\.?\d*$/.test(token)) {
      return <span key={i} className="text-terminal-green">{token}</span>;
    }
    return <span key={i}>{token}</span>;
  });
}

export default CodePanel;
