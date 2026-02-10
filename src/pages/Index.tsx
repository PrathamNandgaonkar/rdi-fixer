import React, { useState, useCallback } from "react";
import { Bug, Download, Play, ChevronLeft, ChevronRight, Crosshair } from "lucide-react";
import CodePanel from "@/components/CodePanel";
import HuntResults from "@/components/HuntResults";
import { sampleBugs, BugPattern } from "@/data/bugPatterns";
import { exportSessionToCSV } from "@/lib/csvExport";

const Index = () => {
  const [currentBugIndex, setCurrentBugIndex] = useState(0);
  const [activeBug, setActiveBug] = useState<BugPattern | null>(null);
  const [isHunting, setIsHunting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [huntedBugs, setHuntedBugs] = useState<BugPattern[]>([]);

  const currentSample = sampleBugs[currentBugIndex];

  const startHunting = useCallback(() => {
    setIsHunting(true);
    setIsAnimating(true);
    setActiveBug(null);

    // Simulate agentic analysis
    setTimeout(() => {
      setIsAnimating(false);
      setIsHunting(false);
      setActiveBug(currentSample);
      setHuntedBugs((prev) => {
        if (!prev.find((b) => b.id === currentSample.id)) {
          return [...prev, currentSample];
        }
        return prev;
      });
    }, 2000);
  }, [currentSample]);

  const goToBug = (direction: "prev" | "next") => {
    setActiveBug(null);
    setCurrentBugIndex((i) => {
      if (direction === "prev") return i > 0 ? i - 1 : sampleBugs.length - 1;
      return i < sampleBugs.length - 1 ? i + 1 : 0;
    });
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-primary/10 glow-green">
            <Bug className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-mono text-lg font-bold text-foreground tracking-tight">
            Agentic Bug Hunter
          </h1>
          <span className="font-mono text-xs text-muted-foreground ml-1">RDI Analysis</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Bug Navigator */}
          <div className="flex items-center gap-1 border border-border rounded-md px-1">
            <button
              onClick={() => goToBug("prev")}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs text-muted-foreground px-2">
              {currentBugIndex + 1} / {sampleBugs.length}
            </span>
            <button
              onClick={() => goToBug("next")}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Start Hunting */}
          <button
            onClick={startHunting}
            disabled={isHunting}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-mono text-sm font-semibold rounded-md hover:bg-primary/90 disabled:opacity-50 transition-all glow-green-strong"
          >
            {isHunting ? (
              <Crosshair className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isHunting ? "Hunting..." : "Start Hunting"}
          </button>

          {/* Export */}
          <button
            onClick={() => exportSessionToCSV(huntedBugs.length > 0 ? huntedBugs : sampleBugs)}
            className="flex items-center gap-2 px-4 py-2 border border-border text-foreground font-mono text-sm rounded-md hover:bg-secondary transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Code Editors */}
        <div className="flex-1 grid grid-cols-2 gap-px bg-border min-h-0">
          <div className="p-3 min-h-0">
            <CodePanel
              title="buggy.rdi — Buggy RDI Code"
              code={currentSample.buggyCode}
              variant="buggy"
              isAnimating={isAnimating}
            />
          </div>
          <div className="p-3 min-h-0">
            <CodePanel
              title="corrected.rdi — Corrected RDI Code"
              code={activeBug ? activeBug.correctedCode : "// Run analysis to see corrected code..."}
              variant="corrected"
              isAnimating={false}
            />
          </div>
        </div>

        {/* Hunt Results Panel */}
        <div className="h-[280px] border-t border-border bg-card flex flex-col">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-panel-header">
            <Crosshair className="w-3.5 h-3.5 text-primary" />
            <span className="font-mono text-xs font-semibold text-foreground">Hunt Results</span>
            {activeBug && (
              <span className="font-mono text-xs text-muted-foreground ml-2">
                — {activeBug.id}
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0">
            <HuntResults bug={activeBug} isHunting={isHunting} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
