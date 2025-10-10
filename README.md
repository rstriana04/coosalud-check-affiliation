# Coosalud Affiliation Automation

Full-stack web application for automating Coosalud affiliation date queries. This system reads Excel files with citizen identification data, automatically scrapes the Coosalud website to retrieve affiliation certificates (PDF), extracts the affiliation date, and generates an updated Excel file with the results.

## ✨ Features

- 📊 **Excel File Upload**: Drag & drop interface for uploading .xlsx files
- ⚡ **Direct API Integration**: Lightning-fast HTTP requests directly to Coosalud API (no browser needed!)
- 🔄 **Automatic Retries**: Smart retry logic for handling temporary API errors
- 📄 **PDF Processing**: Automatic PDF download and date extraction
- 📈 **Real-time Progress**: Live statistics and progress tracking via WebSockets
- 📋 **Interactive Table**: Sortable, filterable, paginated results table
- 📝 **Live Logs**: Real-time processing logs with level filtering
- ⬇️ **Download Results**: Export processed Excel with updated dates
- ⏸️ **Pause/Resume**: Control processing flow with pause/resume/cancel options
- 🗑️ **Auto Cleanup**: Automatic deletion of downloaded PDFs to save storage

## 🏗️ Architecture

### Backend Stack
- **Node.js + Express.js**: REST API server
- **BullMQ + Redis**: Job queue for background processing
- **Socket.io**: Real-time WebSocket communication
- **Native Fetch API**: Direct HTTP requests to Coosalud API
- **pdf-parse**: PDF text extraction for certificate processing
- **xlsx**: Excel file reading/writing
- **Multer**: File upload handling
- **Zod**: Schema validation
- **Winston**: Structured logging

### Frontend Stack
- **React 19**: Latest React with new features
- **Vite**: Lightning-fast build tool
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Accessible component library
- **Socket.io-client**: WebSocket client
- **Axios**: HTTP client
- **@tanstack/react-table**: Advanced table features
- **react-dropzone**: File upload component
- **Sonner**: Toast notifications
- **Lucide React**: Icon library

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** (recommended: 20.x LTS)
- **npm** or **yarn**
- **Redis** (via Docker or local installation)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd adres-automation
```

### 2. Install Dependencies

```bash
npm run install:all
```

This installs dependencies for:
- Root workspace
- Backend (`backend/`)
- Frontend (`frontend/`)

### 3. Setup Environment Variables

Create `.env` file in the root directory:

```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

    # Redis Configuration
    REDIS_URL=redis://localhost:6379

    # API Configuration
    COOSALUD_API_URL=https://portal.coosalud.com/AffiliateManager/GetCertificate
    TIMEOUT_MS=30000

    # Rate Limiting
    MIN_DELAY_MS=2000
    MAX_DELAY_MS=4000

    # Processing Configuration
    MAX_WORKERS=2
    BATCH_SIZE=10
    MAX_RETRIES=3
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
```

### 4. Start Redis

Using Docker Compose:

```bash
npm run redis
```

Or manually:

```bash
docker run -d -p 6379:6379 --name adres-redis redis:7-alpine
```

### 5. Install Playwright Browsers

```bash
cd backend
npx playwright install chromium
```

### 6. Start Development Servers

In the root directory:

```bash
npm run dev
```

This starts:
- **Backend API**: http://localhost:3000
- **Frontend**: http://localhost:5173

Open http://localhost:5173 in your browser.

## 📊 Excel File Format

Your Excel file must follow this structure:

### Column Mapping

| Column | Name | Description | Example |
|--------|------|-------------|---------|
| 5 | Tipo de Identificación | Document Type | CC, TI, CE, PA, etc. |
| 6 | Número de Identificación | ID Number | 1234567890 |
| 15 | Fecha de afiliación a la EPS | Affiliation Date (to be filled) | - |

### Important Notes

- **Headers**: Must be at row 3 (Excel rows 1-2 can contain metadata)
- **Document Type**: Will be read from Column 5 (not hardcoded)
- **ID Number**: Must be valid Colombian identification numbers
- **Output**: Column 15 will be filled with affiliation dates

### Example Structure

```
Row 1: [Metadata/Title]
Row 2: [Metadata/Description]
Row 3: [Headers...]  Col5: Tipo Doc | Col6: Número | ... | Col15: Fecha Afiliación
Row 4: [Data]        CC | 1234567890 | ... | [empty]
Row 5: [Data]        TI | 9876543210 | ... | [empty]
...
```

## 🎮 Usage Guide

### Step 1: Upload File

1. Open the application at http://localhost:5173
2. Drag and drop your Excel file or click to browse
3. Wait for validation and parsing
4. Review the total records count

### Step 2: Start Processing

1. Click **"Iniciar Procesamiento"** button
2. Monitor real-time statistics:
   - Total records
   - Processed count
   - Success/Failed/Skipped counts
   - Average processing time
   - Estimated remaining time

### Step 3: Monitor Progress

- **Progress Bar**: Visual indicator with percentage
- **Records Table**: View individual record status
  - Sort by any column
  - Filter by status (success, failed, pending, etc.)
  - Search by ID number
- **Logs Viewer**: Real-time processing logs
  - Filter by level (info, success, warning, error)
  - Auto-scroll toggle

### Step 4: Control Processing

- **Pause**: Temporarily stop processing
- **Resume**: Continue after pause
- **Cancel**: Stop and discard remaining jobs

### Step 5: Download Results

1. Wait for completion (processed = total)
2. Click **"Descargar Resultados"** button
3. Excel file downloads with Column 15 filled

## 🔌 API Reference

### Endpoints

#### Upload File

```http
POST /api/upload
Content-Type: multipart/form-data

Body: file (Excel file)

Response:
{
  "success": true,
  "jobId": "uuid",
  "filename": "example.xlsx",
  "totalRecords": 295,
  "message": "File uploaded successfully"
}
```

#### Get Job Status

```http
GET /api/jobs/:id

Response:
{
  "success": true,
  "job": {
    "jobId": "uuid",
    "status": "processing",
    "total": 295,
    "processed": 150,
    "success": 140,
    "failed": 10,
    "percentage": 51
  }
}
```

#### Start Processing

```http
POST /api/jobs/:id/start

Response:
{
  "success": true,
  "message": "Processing started",
  "jobId": "uuid",
  "totalRecords": 295
}
```

#### Pause Processing

```http
POST /api/jobs/:id/pause

Response:
{
  "success": true,
  "message": "Processing paused"
}
```

#### Resume Processing

```http
POST /api/jobs/:id/resume

Response:
{
  "success": true,
  "message": "Processing resumed"
}
```

#### Cancel Processing

```http
POST /api/jobs/:id/cancel

Response:
{
  "success": true,
  "message": "Processing cancelled"
}
```

#### Download Results

```http
GET /api/jobs/:id/download

Response: Excel file download
```

#### Get Statistics

```http
GET /api/stats

Response:
{
  "success": true,
  "stats": {
    "queue": {
      "waiting": 100,
      "active": 2,
      "completed": 50,
      "failed": 5
    }
  }
}
```

#### Health Check

```http
GET /health

Response:
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 12345
}
```

## 🔄 WebSocket Events

### Server → Client

| Event | Description | Payload |
|-------|-------------|---------|
| `job:started` | Job processing started | `{ jobId, record, timestamp }` |
| `job:progress` | Progress update | `{ jobId, processed, total, percentage, ... }` |
| `job:completed` | Record completed | `{ jobId, result, timestamp }` |
| `job:failed` | Record failed | `{ jobId, error, timestamp }` |
| `job:paused` | Processing paused | `{ jobId, timestamp }` |
| `job:cancelled` | Processing cancelled | `{ jobId, timestamp }` |
| `logs:new` | New log entry | `{ level, message, data, timestamp }` |

### Client → Server

| Event | Description | Payload |
|-------|-------------|---------|
| `processing:start` | Start processing | `{ fileId }` |
| `processing:pause` | Pause processing | `{ jobId }` |
| `processing:cancel` | Cancel processing | `{ jobId }` |

## 🚢 Deployment

### Deploy to Render.com

The application includes a `render.yaml` configuration for easy deployment.

#### Steps:

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

3. **Create New Web Service**
   - Click "New +" → "Blueprint"
   - Connect your repository
   - Render detects `render.yaml` automatically

4. **Configure Environment Variables**
   
   Add in Render Dashboard:
   - `FRONTEND_URL`: Your Render app URL (e.g., `https://adres-automation.onrender.com`)
   - `TWOCAPTCHA_API_KEY`: Your 2Captcha API key

5. **Deploy**
   - Click "Apply"
   - Wait for deployment (~5-10 minutes)

#### What Gets Deployed:

- **Redis**: Free Redis instance (managed by Render)
- **Web Service**: Node.js app with built frontend
- **Health Checks**: Automatic monitoring at `/health`
- **Auto-Deploy**: Pushes to `main` branch trigger deploys

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Backend server port | `3000` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `TWOCAPTCHA_API_KEY` | 2Captcha API key | - |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `ADRES_URL` | ADRES website URL | `https://adres.gov.co/consulte-su-eps` |
| `HEADLESS_MODE` | Run browser headless | `true` |
| `TIMEOUT_MS` | Page load timeout | `30000` |
| `MIN_DELAY_MS` | Minimum delay between requests | `3000` |
| `MAX_DELAY_MS` | Maximum delay between requests | `5000` |
| `MAX_WORKERS` | BullMQ worker concurrency | `2` |
| `BATCH_SIZE` | Records per batch | `10` |
| `MAX_RETRIES` | Retry attempts per record | `3` |

### Adjusting Performance

**For Faster Processing** (at risk of IP ban):
```env
MIN_DELAY_MS=1000
MAX_DELAY_MS=2000
MAX_WORKERS=4
```

**For Safer Processing** (recommended):
```env
MIN_DELAY_MS=5000
MAX_DELAY_MS=8000
MAX_WORKERS=1
```

## 💰 Cost Estimation

### 2Captcha Costs
- **Rate**: ~$1 per 1000 captchas
- **For 295 records**: ~$0.30
- **Top up**: https://2captcha.com

### Render.com (Production)
- **Free Tier**: Available for testing
- **Starter Plan**: $7/month (recommended)
- **Redis**: $7/month (or use external Redis)

### Processing Time
- **295 records**: ~10-15 hours
- **Per record**: ~2-3 minutes (including delays)
- **Factors**: Network speed, ADRES server response, captcha solving time

## 🐛 Troubleshooting

### Redis Connection Error

**Problem**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solutions**:
1. Ensure Redis is running:
   ```bash
   npm run redis
   ```
2. Check Redis status:
   ```bash
   docker ps | grep redis
   ```
3. Verify `REDIS_URL` in `.env`

### Playwright Browser Issues

**Problem**: `browserType.launch: Executable doesn't exist`

**Solution**:
```bash
cd backend
npx playwright install chromium
```

### Captcha Solving Failures

**Problem**: Jobs fail with captcha errors

**Solutions**:
1. Verify API key:
   ```bash
   echo $TWOCAPTCHA_API_KEY
   ```
2. Check account balance at [2captcha.com](https://2captcha.com)
3. Test API key:
   ```bash
   curl "http://2captcha.com/res.php?key=YOUR_API_KEY&action=getbalance"
   ```

### File Upload Fails

**Problem**: "Invalid file type" or upload timeout

**Solutions**:
1. Ensure file is `.xlsx` format (not `.xls`)
2. Check file size < 10MB
3. Verify columns 5, 6, and 15 exist
4. Check that row 3 contains headers

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

### Worker Not Processing

**Problem**: Jobs stuck in "waiting" state

**Solutions**:
1. Check Redis connection
2. Restart worker:
   ```bash
   cd backend
   npm run worker
   ```
3. Check logs in `backend/logs/`

## 📁 Project Structure

```
adres-automation/
├── package.json                 # Root workspace config
├── .env                         # Environment variables
├── .gitignore                   # Git ignore rules
├── README.md                    # This file
├── render.yaml                  # Render.com deployment config
├── docker-compose.yml           # Docker services (Redis)
│
├── frontend/                    # React application
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx             # Entry point
│       ├── App.jsx              # Root component
│       ├── components/          # React components
│       │   ├── Dashboard.jsx    # Main dashboard
│       │   ├── FileUpload.jsx   # File upload component
│       │   ├── ProgressBar.jsx  # Progress visualization
│       │   ├── StatsCards.jsx   # Statistics cards
│       │   ├── RecordsTable.jsx # Interactive table
│       │   ├── LogsViewer.jsx   # Real-time logs
│       │   └── ui/              # UI primitives (shadcn/ui)
│       ├── hooks/               # Custom React hooks
│       │   ├── useWebSocket.js  # Socket.io hook
│       │   └── useProgress.js   # Progress tracking hook
│       ├── services/
│       │   └── api.js           # Axios API client
│       ├── lib/
│       │   └── utils.js         # Utility functions
│       └── styles/
│           └── globals.css      # Global styles
│
├── backend/                     # Node.js API server
│   ├── package.json
│   └── src/
│       ├── server.js            # Express + Socket.io setup
│       ├── config/
│       │   └── config.js        # Configuration management
│       ├── routes/
│       │   ├── upload.js        # File upload endpoint
│       │   ├── jobs.js          # Job management endpoints
│       │   └── stats.js         # Statistics endpoint
│       ├── workers/
│       │   └── scraper.worker.js # BullMQ worker
│       ├── services/
│       │   ├── queueService.js  # BullMQ queue management
│       │   ├── socketService.js # Socket.io events
│       │   └── progressService.js # Progress tracking
│       ├── utils/
│       │   ├── excelHandler.js  # Excel read/write
│       │   ├── captchaSolver.js # 2Captcha integration
│       │   ├── scraper.js       # Playwright scraping
│       │   └── logger.js        # Winston logging
│       └── middleware/
│           ├── errorHandler.js  # Error handling
│           └── validator.js     # Request validation
│
└── shared/                      # Shared types/constants
    └── types.js                 # Common type definitions
```

## 🤝 Contributing

This is a private project for automating ADRES queries. If you have suggestions or improvements:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/improvement`)
3. Commit your changes (`git commit -am 'Add improvement'`)
4. Push to the branch (`git push origin feature/improvement`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## ⚠️ Disclaimer

This tool is for educational and automation purposes only. Ensure you comply with ADRES website terms of service and Colombian data protection regulations (Ley 1581 de 2012). Use responsibly and respect rate limits to avoid IP bans.

## 📞 Support

For issues, questions, or feature requests:
1. Check this README
2. Review [Troubleshooting](#-troubleshooting) section
3. Open an issue on GitHub
4. Contact the development team

---

Built with ❤️ for automating ADRES affiliation date queries

