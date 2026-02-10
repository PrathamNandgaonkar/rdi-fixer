import React from "react";
import { BugPattern } from "@/data/bugPatterns";
import { AlertTriangle, BookOpen, Shield } from "lucide-react";

interface HuntResultsProps {
  bug: BugPattern | null;
  isHunting: boolean;
}

const HuntResults: React.FC<HuntResultsProps> = ({ bug, isHunting }) => {
  if (isHunting) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-sm text-primary animate-pulse-glow">
            Analyzing RDI patterns...
          </span>
        </div>
      </div>
    );
  }

  if (!bug) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <span className="font-mono text-sm">Click "Start Hunting" to analyze code</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full p-4 overflow-auto">
      {/* Trust Score */}
      <div className="lg:col-span-3 flex items-center gap-3">
        <TrustBadge score={bug.trustScore} />
        <div>
          <span className="font-mono text-xs text-muted-foreground">Bug Type</span>
          <span className={`ml-2 px-2 py-0.5 rounded text-xs font-mono font-semibold ${
            bug.bugType === "Lifecycle" || bug.bugType === "Logic"
              ? "bg-terminal-red/15 text-terminal-red"
              : bug.bugType === "Hardware Constraints"
              ? "bg-terminal-amber/15 text-terminal-amber"
              : "bg-terminal-blue/15 text-terminal-blue"
          }`}>
            {bug.bugType}
          </span>
        </div>
      </div>

      {/* Explanation */}
      <div className="lg:col-span-2 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-terminal-amber" />
          <h3 className="font-mono text-sm font-semibold text-foreground">Explanation</h3>
        </div>
        <div className="font-mono text-xs leading-5 text-secondary-foreground whitespace-pre-wrap">
          {renderMarkdown(bug.explanation)}
        </div>
      </div>

      {/* API Context */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-terminal-blue" />
          <h3 className="font-mono text-sm font-semibold text-foreground">API Context</h3>
        </div>
        <div className="font-mono text-xs leading-5 text-secondary-foreground whitespace-pre-wrap">
          {renderMarkdown(bug.apiContext)}
        </div>
      </div>
    </div>
  );
};

function TrustBadge({ score }: { score: number }) {
  const color =
    score >= 90
      ? "text-terminal-green border-terminal-green/30 bg-terminal-green/10"
      : score >= 75
      ? "text-terminal-amber border-terminal-amber/30 bg-terminal-amber/10"
      : "text-terminal-red border-terminal-red/30 bg-terminal-red/10";

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${color}`}>
      <Shield className="w-4 h-4" />
      <span className="font-mono text-sm font-bold">{score}%</span>
      <span className="font-mono text-xs opacity-70">Trust</span>
    </div>
  );
}

function renderMarkdown(text: string): React.ReactNode {
  // Very simple bold markdown rendering
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="text-foreground">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default HuntResults;
