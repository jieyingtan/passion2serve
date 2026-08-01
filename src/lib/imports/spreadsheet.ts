import { parse } from "csv-parse/sync";
import { readSheet } from "read-excel-file/node";

const MAX_IMPORT_BYTES = 3 * 1024 * 1024;

function headerKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function cellText(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

export async function parseSpreadsheet(file: File): Promise<Record<string, string>[]> {
  if (!file.size) throw new Error("Choose a spreadsheet to import.");
  if (file.size > MAX_IMPORT_BYTES) throw new Error("The spreadsheet must be smaller than 3 MB.");
  const extension = file.name.toLowerCase().split(".").pop();
  if (!extension || !["csv", "xlsx"].includes(extension)) throw new Error("Upload a .csv or .xlsx file.");

  const arrayBuffer = await file.arrayBuffer();
  const sheetRows: unknown[][] = extension === "csv"
    ? parse(Buffer.from(arrayBuffer), { bom: true, relax_column_count: true, skip_empty_lines: true })
    : await readSheet(Buffer.from(arrayBuffer));
  if (sheetRows.length < 2) throw new Error("The spreadsheet must contain a header row and at least one data row.");
  if (sheetRows.length - 1 > 1000) throw new Error("Import up to 1,000 rows at a time.");

  const headers = sheetRows[0].map((value) => headerKey(cellText(value)));
  const rows = sheetRows.slice(1).flatMap((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => { if (header) record[header] = cellText(row[index]); });
    return Object.values(record).some(Boolean) ? [record] : [];
  });
  return rows;
}

export function splitList(value: string) {
  return value.split(/[;,|]/).map((item) => item.trim()).filter(Boolean);
}
