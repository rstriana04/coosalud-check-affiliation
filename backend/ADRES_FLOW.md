# ADRES Automation Flow

## Complete Process Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    1. INITIAL PAGE                              │
│           https://adres.gov.co/consulte-su-eps                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    2. FILL FORM                                 │
│                                                                 │
│   Select Document Type:  #tipoDoc                              │
│   Input ID Number:       #txtNumDoc                            │
│   Input Captcha:         #Capcha_CaptchaTextBox               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    3. SUBMIT FORM                               │
│                                                                 │
│   Click Button:          #btnConsultar                         │
│                                                                 │
│   ⚠️  IMPORTANT: This opens a NEW TAB                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    4. NEW TAB OPENS                             │
│                                                                 │
│   URL Pattern: https://aplicaciones.adres.gov.co/              │
│                bdua_internet/Pages/RespuestaConsulta.aspx      │
│                ?tokenId=XXXXX                                   │
│                                                                 │
│   Wait for page to load completely                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    5. EXTRACT DATE                              │
│                                                                 │
│   Selector: #GridViewAfiliacion > tbody >                     │
│             tr.DataGrid_Item > td:nth-child(4)                 │
│                                                                 │
│   This is the 4th column in the affiliation table             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    6. RETURN DATE                               │
│                                                                 │
│   Format: DD/MM/YYYY or DD-MM-YYYY or YYYY-MM-DD              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### 1. Form Filling (`fillForm()`)

```javascript
async fillForm(tipoDocumento, numeroDocumento) {
  // Select document type (CC, TI, CE, PA, etc.)
  await this.page.selectOption('#tipoDoc', tipoDocumento);
  
  // Fill ID number
  await this.page.fill('#txtNumDoc', numeroDocumento);
}
```

**Example:**
- `tipoDocumento`: "CC" (Cédula de Ciudadanía)
- `numeroDocumento`: "1234567890"

---

### 2. Captcha Solving (`solveCaptcha()`)

```javascript
async solveCaptcha(siteKey) {
  // Get captcha solution from 2Captcha API
  const solution = await captchaSolver.solveCaptcha(siteKey, this.page.url());
  
  // Enter solution in captcha input field
  await this.page.fill('#Capcha_CaptchaTextBox', solution);
}
```

**Notes:**
- 2Captcha solves the captcha remotely
- Solution is entered in the text input
- Wait 2 seconds for validation

---

### 3. Form Submission with New Tab Handling (`submitForm()`)

This is the **critical part** that handles the new tab:

```javascript
async submitForm() {
  // Set up listener for new tab BEFORE clicking
  const [newPage] = await Promise.all([
    this.context.waitForEvent('page', { timeout: 30000 }),
    this.page.click('#btnConsultar')
  ]);
  
  // Wait for new page to fully load
  await newPage.waitForLoadState('networkidle', { timeout: 30000 });
  
  // Switch context to the new tab
  this.page = newPage;
}
```

**Key Points:**
- Uses `Promise.all()` to wait for tab AND click simultaneously
- `context.waitForEvent('page')` listens for new browser tabs
- Automatically switches to the new tab
- Waits for page to be fully loaded before proceeding

---

### 4. Date Extraction (`extractAffiliationDate()`)

```javascript
async extractAffiliationDate() {
  // Wait for the results table to load
  const dateSelector = '#GridViewAfiliacion > tbody > tr.DataGrid_Item > td:nth-child(4)';
  await this.page.waitForSelector(dateSelector, { timeout: 15000 });
  
  // Get the date text from the 4th column
  const element = await this.page.locator(dateSelector).first();
  const text = await element.textContent();
  
  // Extract date using regex
  const dateMatch = text.trim().match(/\d{2}[-\/]\d{2}[-\/]\d{4}|\d{4}[-\/]\d{2}[-\/]\d{2}/);
  
  if (dateMatch) {
    return dateMatch[0]; // Returns the date string
  }
  
  // Fallback: return raw text if format is unexpected
  return text.trim();
}
```

**Table Structure:**
```html
<table id="GridViewAfiliacion">
  <tbody>
    <tr class="DataGrid_Item">
      <td>Column 1</td>
      <td>Column 2</td>
      <td>Column 3</td>
      <td>15/03/2020</td>  ← This is what we extract (4th column)
    </tr>
  </tbody>
</table>
```

---

## Expected Date Formats

The scraper can handle multiple date formats:

| Format | Example | Regex Match |
|--------|---------|-------------|
| DD/MM/YYYY | 15/03/2020 | ✅ |
| DD-MM-YYYY | 15-03-2020 | ✅ |
| YYYY-MM-DD | 2020-03-15 | ✅ |
| YYYY/MM/DD | 2020/03/15 | ✅ |

---

## Error Handling

### Timeout Scenarios

1. **Form elements not found** (10s timeout)
   - Logs error: "Failed to fill form"
   - Retries up to 3 times (configured in `MAX_RETRIES`)

2. **New tab doesn't open** (30s timeout)
   - Logs error: "Failed to submit form"
   - Possible causes: Button selector wrong, popup blocked

3. **Results table not found** (15s timeout)
   - Logs error: "Could not find affiliation date"
   - Possible causes: No results, wrong selector, different page structure

### Debug Mode

To see what's happening, set in `.env`:
```env
HEADLESS_MODE=false
```

This will:
- Show the browser window
- Let you see each step visually
- Help debug selector issues

---

## Testing the Flow

### Quick Test (Without 2Captcha)

```bash
cd backend
node test-scraper.js
```

This will:
1. Open the ADRES page
2. Verify all selectors exist
3. Take a screenshot
4. Show page structure

### Full Flow Test (With Real Data)

**⚠️ WARNING:** This will use your 2Captcha credits!

1. Ensure 2Captcha API key is set in `.env`
2. Create `backend/test-full-flow.js`:

```javascript
import { AdresScraper } from './src/utils/scraper.js';

async function testFullFlow() {
  const scraper = new AdresScraper();
  
  try {
    await scraper.initialize();
    
    // Test with real data
    const fecha = await scraper.queryAffiliationDate('CC', '1234567890');
    
    console.log('✅ Success! Date found:', fecha);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await scraper.close();
  }
}

testFullFlow();
```

3. Run: `node backend/test-full-flow.js`

---

## Troubleshooting

### Problem: New tab doesn't open

**Symptoms:**
- Error: "Failed to submit form"
- Timeout after 30 seconds

**Solutions:**
1. Verify button selector: `#btnConsultar`
2. Check if button requires human interaction delay
3. Ensure captcha was solved correctly

### Problem: Date not found in results

**Symptoms:**
- Error: "Could not find affiliation date"
- New tab opens but extraction fails

**Solutions:**
1. Verify the results page URL matches pattern
2. Check selector: `#GridViewAfiliacion > tbody > tr.DataGrid_Item > td:nth-child(4)`
3. Open results page manually and inspect table structure
4. Check if column order changed

### Problem: Wrong date extracted

**Symptoms:**
- Date is extracted but value is incorrect
- Getting data from wrong column

**Solutions:**
1. Inspect the table in browser DevTools
2. Count which column (1-indexed) has the date
3. Update `:nth-child(X)` in the selector
4. Verify the row class is `.DataGrid_Item`

---

## Performance Considerations

### Rate Limiting

Current delays (configured in `.env`):
- `MIN_DELAY_MS=3000` (3 seconds)
- `MAX_DELAY_MS=5000` (5 seconds)

**Random delay between requests prevents:**
- IP bans
- Rate limit errors
- Detection as bot

### Concurrent Processing

Current workers: `MAX_WORKERS=2`

**Why only 2 workers?**
- Reduces server load on ADRES
- Prevents IP bans
- More reliable captcha solving
- Lower chance of errors

### Processing Time Estimate

For **295 records**:
- Per record: ~2-3 minutes (captcha solving + delays)
- With 2 workers: ~10-15 hours total
- Night processing recommended

---

## Production Checklist

Before processing real data:

- [ ] 2Captcha API key configured and funded
- [ ] Redis running and connected
- [ ] All selectors tested with test-scraper.js
- [ ] Full flow tested with 1-2 sample records
- [ ] Rate limiting configured appropriately
- [ ] Error notifications set up
- [ ] Backup of original Excel file created

---

## Need Help?

1. Check logs in `backend/logs/combined.log`
2. Run with `HEADLESS_MODE=false` to watch
3. Use `test-scraper.js` to verify selectors
4. Review this document for flow understanding

