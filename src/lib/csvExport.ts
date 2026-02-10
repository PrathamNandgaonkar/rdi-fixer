import { BugPattern } from "@/data/bugPatterns";

export function exportSessionToCSV(bugs: BugPattern[]) {
  const escapeCSV = (str: string) => {
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = ["ID", "Explanation", "Context", "Original Code", "Corrected Code"];
  const rows = bugs.map((bug) => [
    escapeCSV(bug.id),
    escapeCSV(bug.explanation),
    escapeCSV(bug.apiContext),
    escapeCSV(bug.buggyCode),
    escapeCSV(bug.correctedCode),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `abh-session-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
