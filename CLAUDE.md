# ADRES Automation — Development Rules

## 1. Project Overview

Healthcare automation platform for Colombian IPS (Tu Salud en Nuestras Manos). Scrapes clinical data from `tusaludennuestrasmanos.macaw.com.co`, extracts patient records from PDFs, and generates regulatory compliance reports (Resolution 202/2021).

## 2. Architecture

Monorepo with 3 workspaces:

| Workspace | Tech | Purpose |
|-----------|------|---------|
| `backend/` | Node.js + Express | API, Playwright scraping, PDF processing, Excel generation |
| `frontend/` | React 19 + Vite | SPA dashboard, file upload, real-time progress |
| `shared/` | JS | Type definitions |

## 3. Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (ESM modules, `"type": "module"`) |
| API | Express 4 |
| Browser Automation | Playwright 1.40.1 (Firefox, headless) |
| CAPTCHA | 2captcha |
| PDF Processing | pdf2json |
| Excel Generation | ExcelJS |
| Excel Reading | xlsx (legacy), ExcelJS |
| Queue | BullMQ + Redis |
| Real-time | Socket.IO |
| Email | Resend |
| Frontend | React 19, Vite 6, Tailwind CSS, shadcn/ui |
| Validation | Zod |
| Logging | Winston |

## 4. Project Structure

```
backend/
├── src/
│   ├── server.js                  # Express entry point + Socket.IO
│   ├── config/config.js           # Environment configuration
│   ├── routes/                    # API route handlers
│   ├── services/                  # Business logic & orchestration
│   │   ├── rcbMonthlyService.js   # Macaw scraper (login, search, download)
│   │   ├── rcvReportService.js    # RCV report orchestration
│   │   ├── queueService.js        # BullMQ job queue
│   │   └── socketService.js       # Socket.IO events
│   ├── utils/                     # Data processing utilities
│   │   ├── rcvDataExtractor.js    # RCV-specific PDF data extraction
│   │   ├── rcvExcelGenerator.js   # 48-column RCV Excel generation
│   │   ├── inputExcelReader.js    # Input Excel validation & reading
│   │   ├── patientDataStore.js    # Patient history JSON store
│   │   ├── emailService.js        # Resend email integration
│   │   ├── pdfProcessor.js        # pdf2json text extraction
│   │   └── logger.js              # Winston logger
│   ├── workers/                   # BullMQ background workers
│   └── middleware/                # Express middleware
├── data/                          # Patient data store (JSON, gitignored)
├── downloads/                     # Temporary scraping downloads
├── pdfs/                          # Downloaded clinical history PDFs
├── processed/                     # Generated reports and ZIPs
├── uploads/                       # User-uploaded Excel files
└── config/                        # Diagnostic codes config
frontend/
├── src/
│   ├── components/                # React components + shadcn/ui
│   ├── hooks/                     # Custom React hooks
│   ├── services/                  # API client (Axios)
│   └── lib/                       # Utilities
docs/
├── programas/                     # Program templates (RCV, citologias, etc.)
├── resolucion/                    # Resolution 202/2021 reference docs
└── historiaclinica-rcv.pdf        # Sample clinical history PDF
```

## 5. Key Conventions

- **ESM Only**: All files use `import/export`. Never `require()`.
- **No comments in code**: Code must be self-documenting through clear naming.
- **Logging**: Use Winston logger (`import { logger } from './logger.js'`). Reserve `console.log` only for CLI scripts.
- **Error handling**: Always throw with context. Never swallow errors silently.
- **File naming**: camelCase for JS files (`rcvDataExtractor.js`).
- **Dates**: `YYYY-MM-DD` internally. Colombian lab dates come as `DD/MM/YY`.
- **Methods**: Max 25 lines, single responsibility, max 3 parameters.
- **Files**: Max 300 lines. Split if exceeding.

## 6. Scraping Flow (Macaw Platform)

1. Login to `tusaludennuestrasmanos.macaw.com.co` with credentials + 2captcha reCAPTCHA
2. Navigate via iframe-based menu (`#menu2` → `contenido` iframe)
3. Patient search via jQuery autocomplete (`#txt1pacienteno`)
4. Get `codCita` from history table by matching `fecha_atencion`
5. Download PDF via direct URL: `imprimePaginaHistoria_convert.php?codcita={}&codpaciente={}`
6. Browser config: Firefox headless, viewport 1920x1080, downloads enabled

## 7. Data Extraction Strategy

**Rule-based only. No LLM required.**

All clinical histories come from the same Macaw software with consistent formatting. Data extraction uses regex patterns against pdf2json text output.

Key extraction areas:
- Demographics: name, ID, address, phone, birth date, sex
- Vital signs: weight, height, IMC, blood pressure, heart rate
- Chronic conditions: HT, DM, ERC, DISLIPIDEMIA (text + inference from labs)
- Lab results with dates: HDL, LDL, CT, TG, glucosa, creatinina, uroanalisis, PSA, sangre oculta, hemograma, HbA1c
- Perimetro abdominal

**Chronic condition inference**: When lab values contradict the clinical text, lab values prevail:
- Colesterol Total > 200 OR LDL > 130 OR TG > 150 → DISLIPIDEMIA
- Glucosa >= 126 OR HbA1c >= 6.5 → DM
- PA >= 140/90 → HT

## 8. RCV Report Format

48-column Excel matching `docs/programas/riesgo-cardiovascular.xlsx`:
- Row 1: Group headers (cols 1-18 labeled, cols 19-48 empty)
- Row 2: Sub-headers (all 48 columns labeled)
- Row 3+: Patient data
- "Tipo de inscripcion" uses 2 columns (C: 1° VEZ, D: CONTROL) marked with "X"
- Lab values have paired columns: FECHA LABORATORIO + VALOR
- File name from `programa` column or `{YYYY-MM-DD}-202-informe.xlsx`

## 9. Input Excel Format

User uploads Excel with columns:
- `identipac` (required): Patient document number
- `fecha_atencion` (required): Consultation date in YYYY-MM-DD
- `nombremedico` (required): Doctor name (reference only)
- `programa` (optional): Program name for output file naming

## 10. Patient Data Storage

JSON file at `backend/data/patients.json`. Per-patient storage:
- Last blood pressure (feeds "PA Control Anterior" in future runs)
- Visit history (last 10 entries with labs and vitals)
- Updated automatically on each report generation

## 11. Colombian Name Parsing

PDF format: `"Nombre del paciente: {FullName} - {ID}"`

Parsing rules:
1. Group Spanish prepositions with next word: "de", "del", "de la"
2. Last 2 groups = apellidos, remaining = nombres
3. Uppercase all components for output

## 12. Environment Variables

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
REDIS_URL=redis://localhost:6379
RCB_USERNAME=...
RCB_PASSWORD=...
CAPTCHA_API_KEY=...
HEADLESS_MODE=true
RESEND_API_KEY=...
EMAIL_FROM=noreply@yourdomain.com
```

## 13. Commands

```bash
npm run dev              # Concurrent: backend + frontend + worker
npm start                # Production backend
npm run worker           # Background job processor
```

## 14. Program Report Module Pattern

Each healthcare program report follows a **5-layer backend architecture** plus frontend integration. Use this pattern when building new program report modules.

### 14.1 Layer Architecture

```
ExtractionHelpers → DataExtractor → ExcelColumns → ExcelGenerator → ReportService
```

| Layer | File naming | Responsibility |
|-------|------------|----------------|
| ExtractionHelpers | `{module}ExtractionHelpers.js` | Pure functions: regex extractors, classifiers, formatters |
| DataExtractor | `{module}DataExtractor.js` | Class: orchestrates PDF→structured data. Uses `PDFProcessor`, `parseColombianName`, `matchNumber` |
| ExcelColumns | `{module}ExcelColumns.js` | Column definitions, group headers, merges, row mappers per program |
| ExcelGenerator | `{module}ExcelGenerator.js` | Creates ExcelJS workbook with banner, headers, styling, freeze panes |
| ReportService | `{module}ReportService.js` | Orchestration: scrape → download PDF → extract → collect → generate Excel → ZIP → email |

### 14.2 Existing Modules

| Module | Programs | JobId prefix | Column counts |
|--------|----------|-------------|---------------|
| RCV | riesgo-cardiovascular | `rcv-` | 48 |
| Pediatric | primera-infancia, infancia, adolescencia | `pediatric-` | 44, 44, 44 |
| Lifecycle | juventud, adultez, vejez | `lifecycle-` | 51, 58, 57 |
| PlanificacionFamiliar | planificacion-familiar | `planfamiliar-` | 33 |
| Citologias | citologias | `citologias-` | 53 |
| Gestantes | seguimiento-gestantes | `gestantes-` | 279 |

### 14.3 File Creation Checklist

For a new module `{mod}` with programs `[prog1, prog2, ...]`:

1. **Backend utils** (4 files):
   - `backend/src/utils/{mod}ExtractionHelpers.js` — regex helpers
   - `backend/src/utils/{mod}DataExtractor.js` — `{Mod}DataExtractor` class
   - `backend/src/utils/{mod}ExcelColumns.js` — column defs + row mappers
   - `backend/src/utils/{mod}ExcelGenerator.js` — `generate{Mod}Excel(dataByProgram, outputPath)`

2. **Backend service** (1 file):
   - `backend/src/services/{mod}ReportService.js` — `{Mod}ReportService` class

3. **Backend route** (modify existing):
   - `backend/src/routes/rcbMonthly.js` — add `POST /generate-{mod}` endpoint + `process{Mod}InBackground` function

4. **Frontend** (1 new + 2 modified):
   - `frontend/src/components/{Mod}ReportTab.jsx` — new tab component
   - `frontend/src/components/RCBMonthly.jsx` — add tab trigger + content
   - `frontend/src/services/api.js` — add `generate{Mod}Report`, `get{Mod}JobStatus`, `get{Mod}DownloadUrl`

### 14.4 Excel Structure Convention

```
Row 1-3: Banner (IPS name, NIT, VERSION, FECHA merged cells)
Row 4:   Spacer
Row 5:   Merged title row ("CONSULTA POR MEDICINA GENERAL")
Row 6:   Group headers (IDENTIFICACION DEL USUARIO, SITUACION PERSONAL, EXAMEN FISICO, LABORATORIOS)
Row 7:   Column headers (individual column names)
Row 8+:  Patient data
```

- Freeze panes at the column header row (row 7)
- Lab values always use paired columns: `FECHA LABORATORIO` + `VALOR`
- Static values per row: DEPARTAMENTO=VALLE, MUNICIPIO=CARTAGO, IPS=TU SALUD EN NUESTRAS MANOS
- Styling: gray background (`FFD3D3D3`) for headers, thin borders, size 9 font, center alignment

### 14.5 Column Definition Pattern

Use shared helper functions to avoid duplication across programs:

```js
commonHeaders()          // demographics + situacion personal + examen fisico (shared)
labHeaders()             // standard lab columns (hemograma through VIH)
extendedLabHeaders()     // adds PSA, sangre oculta for adult programs
buildMerges(totalCols)   // generates merge ranges from column count
```

Each program needs its own `map{Program}Row(data, index)` function returning an array matching its column count exactly.

### 14.6 Shared Resources

Reuse across all modules:
- `parseColombianName` from `rcvDataExtractor.js`
- `matchNumber` from `pediatricExtractionHelpers.js`
- `PDFProcessor` from `pdfProcessor.js`
- `inputExcelReader.js` for input Excel validation
- `rcbMonthlyService.js` for Macaw scraping (login, search, download)
- Status/download endpoints shared via `activeJobs` Map, differentiated by jobId prefix

### 14.7 pdf2json Known Quirks

- **Page headers/footers injected mid-text**: breaks label-value proximity. Use fallback regex patterns (e.g., match `(\d{2,3}\/\d{2,3})\s*MMHG` directly when PA label is separated).
- **Semicolons instead of colons**: pdf2json sometimes renders `:` as `;` (e.g., `HDL;70.9`). Include `;` in character classes: `HDL[;:\s]*`.
- **Garbled special characters**: bullet points render as `àÂÃ−ÂÃ•`. Don't rely on these for extraction.
- **Lab date formats vary**: RCV uses `--DD/MM/YY` (2-digit year), lifecycle uses `PARACLÍNICOS DEL: DD/MM/YYYY` (4-digit year). Always handle both.

### 14.8 Frontend Tab Pattern

- Job persistence: IndexedDB via `db.saveJob`/`db.getJob` with key `current_{mod}_job`
- WebSocket events filtered by jobId prefix (`{mod}-`)
- Polling fallback: check job status every 10 seconds when processing
- Session restoration on mount: check IndexedDB → verify with server → handle completed/failed/lost states

### 14.9 Template & Sample Files

Place in `docs/` before starting implementation:
- `docs/programas/{program-name}.xlsx` — Excel template with headers and sample data row
- `docs/historiaclinica-{program}.pdf` — sample clinical history PDF for regex development

## 15. Testing

- Integration tests mock Playwright browser and external APIs
- Test PDF extraction against sample PDFs in `docs/`
- Validate Excel output structure against templates in `docs/programas/`
- For new modules: verify column counts match template, row mapper array length matches column count
