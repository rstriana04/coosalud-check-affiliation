import { AdresScraper } from './src/utils/scraper.js';
import { logger } from './src/utils/logger.js';

async function testScraper() {
  console.log('🧪 Testing ADRES Scraper Configuration...\n');
  
  const scraper = new AdresScraper();
  
  try {
    console.log('1️⃣  Initializing browser...');
    await scraper.initialize();
    console.log('✅ Browser initialized\n');

    console.log('2️⃣  Navigating to ADRES website...');
    await scraper.page.goto('https://www.adres.gov.co/consulte-su-eps', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    console.log('✅ Page loaded\n');

    console.log('3️⃣  Switching to iframe...');
    try {
      const iframeElement = await scraper.page.waitForSelector('iframe[name="MSOPageViewerWebPart_WebPartWPQ3"]', { 
        timeout: 15000 
      });
      const iframe = await iframeElement.contentFrame();
      
      if (iframe) {
        await iframe.waitForLoadState('networkidle', { timeout: 10000 });
        scraper.page = iframe;
        console.log('✅ Successfully switched to iframe\n');
      } else {
        console.log('❌ Could not access iframe content\n');
      }
    } catch (error) {
      console.log('❌ Error switching to iframe:', error.message, '\n');
    }

    console.log('4️⃣  Testing ADRES-specific selectors...');
    
    const tipoDocSelector = '#tipoDoc';
    const numeroDocSelector = '#txtNumDoc';
    const captchaSelector = '#Capcha_CaptchaTextBox';
    const submitButtonSelector = '#btnConsultar';
    
    try {
      await scraper.page.waitForSelector(tipoDocSelector, { timeout: 5000 });
      console.log('✅ Document type selector found:', tipoDocSelector);
    } catch (error) {
      console.log('❌ Document type selector NOT found:', tipoDocSelector);
      console.log('   Current selector may be incorrect!\n');
    }

    try {
      await scraper.page.waitForSelector(numeroDocSelector, { timeout: 5000 });
      console.log('✅ ID number selector found:', numeroDocSelector);
    } catch (error) {
      console.log('❌ ID number selector NOT found:', numeroDocSelector);
      console.log('   Current selector may be incorrect!\n');
    }

    try {
      await scraper.page.waitForSelector(captchaSelector, { timeout: 5000 });
      console.log('✅ Captcha input selector found:', captchaSelector);
    } catch (error) {
      console.log('❌ Captcha input selector NOT found:', captchaSelector);
      console.log('   Current selector may be incorrect!\n');
    }

    try {
      await scraper.page.waitForSelector(submitButtonSelector, { timeout: 5000 });
      console.log('✅ Submit button selector found:', submitButtonSelector);
    } catch (error) {
      console.log('❌ Submit button selector NOT found:', submitButtonSelector);
      console.log('   Current selector may be incorrect!\n');
    }

    console.log('\n5️⃣  Taking screenshot for manual inspection...');
    await scraper.page.screenshot({ 
      path: 'adres-screenshot.png',
      fullPage: true 
    });
    console.log('✅ Screenshot saved: adres-screenshot.png\n');

    console.log('5️⃣  Extracting page structure...');
    const formElements = await scraper.page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      
      return forms.map(form => ({
        selects: Array.from(form.querySelectorAll('select')).map(el => ({
          tag: 'select',
          name: el.name,
          id: el.id,
          class: el.className
        })),
        inputs: Array.from(form.querySelectorAll('input')).map(el => ({
          tag: 'input',
          type: el.type,
          name: el.name,
          id: el.id,
          class: el.className,
          placeholder: el.placeholder
        })),
        buttons: Array.from(form.querySelectorAll('button, input[type="submit"]')).map(el => ({
          tag: el.tagName.toLowerCase(),
          type: el.type,
          text: el.textContent?.trim(),
          id: el.id,
          class: el.className
        }))
      }));
    });

    console.log('\n📋 Found form elements:');
    console.log(JSON.stringify(formElements, null, 2));
    
    console.log('\n💡 Suggested selectors based on page inspection:');
    
    if (formElements[0]?.selects?.length > 0) {
      const select = formElements[0].selects[0];
      if (select.name) {
        console.log(`   Document Type: 'select[name="${select.name}"]'`);
      } else if (select.id) {
        console.log(`   Document Type: '#${select.id}'`);
      }
    }
    
    if (formElements[0]?.inputs?.length > 0) {
      const input = formElements[0].inputs.find(i => i.type === 'text' || i.type === 'number');
      if (input?.name) {
        console.log(`   ID Number: 'input[name="${input.name}"]'`);
      } else if (input?.id) {
        console.log(`   ID Number: '#${input.id}'`);
      }
    }
    
    if (formElements[0]?.buttons?.length > 0) {
      const button = formElements[0].buttons[0];
      if (button.id) {
        console.log(`   Submit Button: '#${button.id}'`);
      } else if (button.text) {
        console.log(`   Submit Button: 'button:has-text("${button.text}")'`);
      }
    }

    console.log('\n\n7️⃣  Optional: Test with sample data (uncomment below to test full flow)');
    console.log('   WARNING: This will submit a real query to ADRES!\n');

    console.log('\n✅ Test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Check adres-screenshot.png to see the form');
    console.log('   2. Use the suggested selectors above');
    console.log('   3. Update backend/src/utils/scraper.js with correct selectors');
    console.log('   4. See backend/SCRAPER_CONFIG.md for detailed configuration guide\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await scraper.close();
    console.log('\n🔒 Browser closed');
  }
}

console.log('═══════════════════════════════════════════════════════');
console.log('   ADRES Scraper Configuration Test');
console.log('═══════════════════════════════════════════════════════\n');

testScraper().catch(console.error);

