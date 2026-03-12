const XLSX = require("xlsx");
const wb = XLSX.readFile("docs/resolucion/example-202-completo.xlsx");
const ws = wb.Sheets["Hoja 1"];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

// Age distribution
console.log("=== AGE COLUMN (DQ) VALUES ===");
data.slice(1).forEach((row, i) => {
  console.log("Row " + (i+2) + ": Edad=" + row[120] + " CUPS=" + row[119] + " Sexo=" + row[10]);
});

// Check if same patient appears in multiple rows
console.log();
console.log("=== DUPLICATE PATIENT IDs ===");
const idCounts = {};
data.slice(1).forEach((row, i) => {
  const id = row[4];
  if (!idCounts[id]) idCounts[id] = [];
  idCounts[id].push({ row: i+2, cups: row[119] });
});
Object.entries(idCounts).filter(([k, v]) => v.length > 1).forEach(([id, entries]) => {
  console.log("  ID " + id + ": " + entries.map(e => "Row " + e.row + " (" + e.cups + ")").join(", "));
});

// Vaccine columns
console.log();
console.log("=== VACCINE COLUMNS (AN=DPT col39, AP=Neumococo col41) ===");
data.slice(1).forEach((row, i) => {
  if (row[39] != 0 || row[41] != 0) {
    console.log("Row " + (i+2) + " (CUPS=" + row[119] + "): DPT=" + row[39] + " Neumococo=" + row[41]);
  }
});

// Identify which date columns use serial numbers vs string dates
console.log();
console.log("=== DATE FORMAT ANALYSIS ===");
const headers = data[0];
const dateColIndices = [];
headers.forEach((h, c) => {
  if (h.toLowerCase().includes("fecha")) dateColIndices.push(c);
});

dateColIndices.forEach(c => {
  const types = new Set();
  data.slice(1).forEach(row => {
    const val = row[c];
    if (val === "" || val === null || val === undefined) return;
    if (typeof val === "number") types.add("serial(" + val + ")");
    else if (typeof val === "string") types.add("string(" + val + ")");
  });
  const sampleTypes = [...types].slice(0, 3);
  console.log(XLSX.utils.encode_col(c) + " (" + headers[c].substring(0, 45) + "): " + sampleTypes.join(", "));
});

// Check COP values
console.log();
console.log("=== COP POR PERSONA (CY col102) ===");
data.slice(1).forEach((row, i) => {
  const val = row[102];
  if (val != 0 && val != 21) {
    console.log("Row " + (i+2) + " (CUPS=" + row[119] + "): COP=" + val);
  }
});
