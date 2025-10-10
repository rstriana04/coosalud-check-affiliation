import { AdresScraper } from './src/utils/scraper.js';
import { logger } from './src/utils/logger.js';

async function testSubmit() {
  console.log('🧪 Testing form submission behavior...\n');
  
  const scraper = new AdresScraper();
  
  try {
    await scraper.initialize();
    console.log('✅ Browser initialized\n');

    await scraper.page.goto('https://www.adres.gov.co/consulte-su-eps', { 
      waitUntil: 'networkidle' 
    });
    console.log('✅ Page loaded\n');

    await scraper.switchToIframe();
    console.log('✅ Switched to iframe\n');

    console.log('📝 Filling form with test data...');
    await scraper.page.selectOption('#tipoDoc', 'CC');
    await scraper.page.fill('#txtNumDoc', '29152567');
    console.log('✅ Form filled\n');

    console.log('🔍 Taking screenshot BEFORE submit...');
    await scraper.page.screenshot({ path: 'before-submit.png' });

    console.log('🖱️  Clicking submit button...');
    await scraper.page.click('#btnConsultar');
    
    console.log('⏰ Waiting 10 seconds to see what happens...\n');
    await scraper.page.waitForTimeout(10000);

    console.log('🔍 Taking screenshot AFTER submit...');
    await scraper.page.screenshot({ path: 'after-submit.png' });

    console.log('📊 Checking current page state...');
    const url = scraper.page.url();
    console.log('   Current URL:', url);

    const pageTitle = await scraper.page.title();
    console.log('   Page title:', pageTitle);

    const hasResultTable = await scraper.page.locator('#GridViewAfiliacion').count();
    console.log('   Has result table:', hasResultTable > 0 ? 'YES' : 'NO');

    if (hasResultTable > 0) {
      console.log('\n✅ Results appeared on SAME PAGE (not new tab!)');
      const dateSelector = '#GridViewAfiliacion > tbody > tr.DataGrid_Item > td:nth-child(4)';
      const dateElement = await scraper.page.locator(dateSelector).first();
      if (await dateElement.count() > 0) {
        const date = await dateElement.textContent();
        console.log('   📅 Found date:', date.trim());
      }
    } else {
      console.log('\n❌ No results table found');
      console.log('   Check after-submit.png to see what actually happened');
    }

    console.log('\n⏰ Keeping browser open for 30 seconds for manual inspection...');
    await scraper.page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await scraper.close();
    console.log('\n✅ Done! Check screenshots:');
    console.log('   - before-submit.png');
    console.log('   - after-submit.png');
  }
}

testSubmit().catch(console.error);

