import React, { useState, useCallback, useRef } from "react";
import { Bug, Download, Upload, Play, ChevronLeft, ChevronRight, Crosshair, FileText } from "lucide-react";
import CodePanel from "@/components/CodePanel";
import HuntResults from "@/components/HuntResults";
import { BugPattern, sampleBugs } from "@/data/bugPatterns";
import { parseInputCSV, exportResultsToCSV, downloadCSV } from "@/lib/csvUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Index = () => {
  const [currentBugIndex, setCurrentBugIndex] = useState(0);
  const [activeBug, setActiveBug] = useState<BugPattern | null>(null);
  const [isHunting, setIsHunting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [analyzedBugs, setAnalyzedBugs] = useState<BugPattern[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allBugs = analyzedBugs.length > 0 ? analyzedBugs : sampleBugs;
  const currentSample = allBugs[currentBugIndex] ?? allBugs[0];

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseInputCSV(text);
      if (parsed.length === 0) {
        toast.error("Invalid CSV format. Expected columns: ID, BuggyCode");
        setUploadedFileName(null);
        return;
      }

      // Convert parsed rows into BugPattern stubs (pre-analysis)
      const stubs: BugPattern[] = parsed.map((row) => ({
        id: row.id,
        buggyCode: row.buggyCode,
        correctedCode: "// Awaiting LLM analysis...",
        explanation: "Upload complete. Click 'Start Hunting' to analyze with AI.",
        bugType: "Logic" as const,
        apiContext: "",
        trustScore: 0,
      }));

      setAnalyzedBugs(stubs);
      setCurrentBugIndex(0);
      setActiveBug(null);
      toast.success(`Loaded ${parsed.length} code samples from ${file.name}`);
    };
    reader.readAsText(file);

    // Reset input so same file can be re-uploaded
    e.target.value = "";
  }, []);

  const startHunting = useCallback(async () => {
    setIsHunting(true);
    setIsAnimating(true);
    setActiveBug(null);

    try {
      // Build CSV content from current bugs to send to LLM
      const csvRows = allBugs.map((b) => {
        const escCode = b.buggyCode.includes(",") || b.buggyCode.includes('"') || b.buggyCode.includes("\n")
          ? `"${b.buggyCode.replace(/"/g, '""')}"` : b.buggyCode;
        return `${b.id},${escCode}`;
      });
      const csvContent = `ID,BuggyCode\n${csvRows.join("\n")}`;

      const { data, error } = await supabase.functions.invoke("analyze-rdi", {
        body: { csvContent },
      });

      if (error) {
        throw new Error(error.message || "Analysis failed");
      }

      if (data?.results && Array.isArray(data.results)) {
        const results: BugPattern[] = data.results.map((r: any) => ({
          id: r.id || "UNKNOWN",
          buggyCode: r.buggyCode || "",
          correctedCode: r.correctedCode || "",
          explanation: r.explanation || "",
          bugType: r.bugType || "Logic",
          apiContext: r.apiContext || "",
          trustScore: typeof r.trustScore === "number" ? r.trustScore : 80,
        }));

        setAnalyzedBugs(results);
        setCurrentBugIndex(0);
        setActiveBug(results[0]);
        toast.success(`AI analyzed ${results.length} bugs successfully`);
      } else {
        throw new Error("Unexpected response format");
      }
    } catch (err: any) {
      console.error("Hunt error:", err);
      toast.error(err.message || "Analysis failed. Please try again.");
      // Fallback: show current sample as-is
      if (allBugs[currentBugIndex]) {
        setActiveBug(allBugs[currentBugIndex]);
      }
    } finally {
      setIsAnimating(false);
      setIsHunting(false);
    }
  }, [allBugs, currentBugIndex]);

  const goToBug = (direction: "prev" | "next") => {
    const newIndex =
      direction === "prev"
        ? currentBugIndex > 0 ? currentBugIndex - 1 : allBugs.length - 1
        : currentBugIndex < allBugs.length - 1 ? currentBugIndex + 1 : 0;

    setCurrentBugIndex(newIndex);
    // Show already-analyzed result if available
    const bug = allBugs[newIndex];
    if (bug && bug.trustScore > 0) {
      setActiveBug(bug);
    } else {
      setActiveBug(null);
    }
  };

  const handleExport = () => {
    const bugsToExport = analyzedBugs.length > 0 ? analyzedBugs : sampleBugs;
    const csv = exportResultsToCSV(bugsToExport);
    downloadCSV(csv, `abh-results-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success("Results exported as CSV");
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
          <span className="font-mono text-xs text-muted-foreground ml-1">LLM-Powered RDI Analysis</span>
          {uploadedFileName && (
            <span className="flex items-center gap-1 ml-2 px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-xs">
              <FileText className="w-3 h-3" />
              {uploadedFileName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Upload CSV */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border border-border text-foreground font-mono text-sm rounded-md hover:bg-secondary transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload CSV
          </button>

          {/* Bug Navigator */}
          <div className="flex items-center gap-1 border border-border rounded-md px-1">
            <button
              onClick={() => goToBug("prev")}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs text-muted-foreground px-2">
              {currentBugIndex + 1} / {allBugs.length}
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

          {/* Export CSV */}
          <button
            onClick={handleExport}
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
              title={`buggy.rdi — ${currentSample.id}`}
              code={currentSample.buggyCode}
              variant="buggy"
              isAnimating={isAnimating}
            />
          </div>
          <div className="p-3 min-h-0">
            <CodePanel
              title={`corrected.rdi — ${currentSample.id}`}
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
