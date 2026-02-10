import { BugPattern } from "@/data/bugPatterns";

export function parseInputCSV(csvText: string): { id: string; buggyCode: string }[] {
  const lines = csvText.split("\n");
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = parseCSVRow(headerLine).map((h) => h.trim().toLowerCase());

  const idIdx = headers.findIndex((h) => h === "id");
  const codeIdx = headers.findIndex(
    (h) => h === "buggycode" || h === "buggy code" || h === "code" || h === "original code"
  );

  if (idIdx === -1 || codeIdx === -1) return [];

  const results: { id: string; buggyCode: string }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseCSVRow(line);
    if (cols[idIdx] && cols[codeIdx]) {
      results.push({ id: cols[idIdx].trim(), buggyCode: cols[codeIdx].trim() });
    }
  }
  return results;
}

function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (inQuotes) {
      if (ch === '"') {
        if (row[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

export function exportResultsToCSV(bugs: BugPattern[]): string {
  const escapeCSV = (str: string) => {
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = ["ID", "BugType", "TrustScore", "Explanation", "APIContext", "BuggyCode", "CorrectedCode"];
  const rows = bugs.map((bug) => [
    escapeCSV(bug.id),
    escapeCSV(bug.bugType),
    String(bug.trustScore),
    escapeCSV(bug.explanation),
    escapeCSV(bug.apiContext),
    escapeCSV(bug.buggyCode),
    escapeCSV(bug.correctedCode),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
