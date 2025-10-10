# ADRES Scraper Configuration Guide

## How to Configure Selectors

### Step 1: Visit the ADRES Website
Open: https://adres.gov.co/consulte-su-eps

### Step 2: Inspect Each Form Element

#### Document Type Dropdown
1. Right-click the document type field → Inspect
2. Find the `<select>` element
3. Copy the `name` or `id` attribute
4. Update in `backend/src/utils/scraper.js` line 77:

```javascript
// Example configurations (choose the one that matches):

// If the select has name="tipoDocumento"
const tipoDocSelector = 'select[name="tipoDocumento"]';

// If the select has id="selectTipo"
const tipoDocSelector = '#selectTipo';

// If the select has class="tipo-doc"
const tipoDocSelector = 'select.tipo-doc';

// Multiple fallbacks (current default)
const tipoDocSelector = 'select[name*="tipo"], select[id*="tipo"], select[name*="Tipo"]';
```

#### ID Number Input Field
1. Right-click the ID number field → Inspect
2. Find the `<input>` element
3. Copy the `name` or `id` attribute
4. Update in `backend/src/utils/scraper.js` line 81:

```javascript
// Example configurations:

// If the input has name="numeroDocumento"
const numeroDocSelector = 'input[name="numeroDocumento"]';

// If the input has id="inputNumero"
const numeroDocSelector = '#inputNumero';

// Multiple fallbacks (current default)
const numeroDocSelector = 'input[name*="numero"], input[name*="documento"], input[id*="numero"]';
```

#### Submit Button
1. Right-click the submit/query button → Inspect
2. Find the `<button>` element
3. Update in `backend/src/utils/scraper.js` line 139:

```javascript
// Example configurations:

// If the button has id="btnConsultar"
const submitButtonSelector = '#btnConsultar';

// If the button has class="btn-primary"
const submitButtonSelector = 'button.btn-primary';

// If the button text is "Consultar"
const submitButtonSelector = 'button:has-text("Consultar")';

// Multiple fallbacks (current default)
const submitButtonSelector = 'button[type="submit"], input[type="submit"], button:has-text("Consultar")';
```

### Step 3: Find the Result Date Selector

After submitting the form, the page shows results:

1. Inspect the element that contains the affiliation date
2. Look for unique classes, IDs, or text patterns
3. Update in `backend/src/utils/scraper.js` line 154:

```javascript
// Example configurations:

const possibleSelectors = [
  // If date is in a div with class="fecha-afiliacion"
  '.fecha-afiliacion',
  
  // If date is in a span with id="fechaResult"
  '#fechaResult',
  
  // If date is in a table cell
  'td.fecha-columna',
  
  // If date is near text "Fecha de afiliación:"
  'div:has-text("Fecha de afiliación:") span',
  
  // Generic fallbacks
  '[class*="fecha"]',
  '[class*="afiliacion"]',
  'td:has-text("Fecha")',
  'div:has-text("Fecha de afiliación")',
  'span:has-text("Fecha")'
];
```

### Step 4: Verify Date Format

Check what date format ADRES uses:

```javascript
// If format is DD/MM/YYYY (e.g., 15/03/2020)
const dateMatch = text.match(/\d{2}\/\d{2}\/\d{4}/);

// If format is YYYY-MM-DD (e.g., 2020-03-15)
const dateMatch = text.match(/\d{4}-\d{2}-\d{2}/);

// If format is DD-MM-YYYY (e.g., 15-03-2020)
const dateMatch = text.match(/\d{2}-\d{2}-\d{4}/);

// Current default (accepts multiple formats)
const dateMatch = text.match(/\d{2}[-\/]\d{2}[-\/]\d{4}|\d{4}[-\/]\d{2}[-\/]\d{2}/);
```

---

## Testing Your Configuration

### Option 1: Run Test Script

Create a test file to verify selectors:

```javascript
// backend/test-scraper.js
import { AdresScraper } from './src/utils/scraper.js';

async function testScrapers() {
  const scraper = new AdresScraper();
  
  try {
    await scraper.initialize();
    
    // Test with sample data
    const result = await scraper.queryAffiliationDate('CC', '1234567890');
    
    console.log('✅ Success! Found date:', result);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await scraper.close();
  }
}

testScrapers();
```

Run: `node backend/test-scraper.js`

### Option 2: Use Non-Headless Mode

Temporarily change in `.env`:
```env
HEADLESS_MODE=false
```

This will show the browser window so you can see what's happening.

---

## Common Selector Patterns

### By Attribute
```javascript
'input[name="fieldName"]'     // Exact match
'input[name*="field"]'         // Contains
'input[name^="field"]'         // Starts with
'input[name$="field"]'         // Ends with
```

### By ID/Class
```javascript
'#elementId'                   // By ID
'.className'                   // By class
'div.className'                // Element + class
```

### By Text Content
```javascript
'button:has-text("Submit")'    // Contains text
'div:text("Exact Text")'       // Exact text
```

### By Position
```javascript
'input:nth-child(2)'           // 2nd child
'input:first-child'            // First child
'input:last-child'             // Last child
```

### Combining Selectors
```javascript
'form#myForm input[name="doc"]'  // Nested
'input.required, input.optional' // Multiple (OR)
```

---

## Troubleshooting

### Selector Not Found
- Element might load dynamically (increase timeout)
- Check for iframes (may need to switch context)
- Try less specific selectors

### Wrong Element Selected
- Add more specific parent context
- Use multiple attributes to narrow down
- Check for duplicate elements

### Date Not Extracted
- Verify the date format regex
- Check if date is in an iframe or shadow DOM
- Try extracting full page text as fallback

---

## Need Help?

1. Enable debug logging in `.env`:
   ```env
   NODE_ENV=development
   ```

2. Check logs in `backend/logs/combined.log`

3. Run with `HEADLESS_MODE=false` to watch the browser

