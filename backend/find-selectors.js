import { chromium } from 'playwright';

console.log('🔍 ADRES Selector Finder - Interactive Mode\n');
console.log('This will open a browser window and wait for you to navigate to the correct page.\n');

async function findSelectors() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  console.log('📋 Instructions:');
  console.log('1. A browser window will open');
  console.log('2. Navigate to the ACTUAL page with the form');
  console.log('3. Wait 30 seconds for inspection...\n');

  await page.goto('https://www.adres.gov.co', {
    waitUntil: 'networkidle'
  });

  console.log('✅ Browser opened. Please navigate to the form page manually...');
  console.log('⏰ Waiting 30 seconds for you to find the form...\n');

  await page.waitForTimeout(30000);

  console.log('🔍 Current URL:', page.url());
  console.log('\n📊 Analyzing page structure...\n');

  const formElements = await page.evaluate(() => {
    const allSelects = Array.from(document.querySelectorAll('select'));
    const allInputs = Array.from(document.querySelectorAll('input[type="text"], input[type="number"], input[id*="apcha"], input[id*="APCHA"]'));
    const allButtons = Array.from(document.querySelectorAll('button, input[type="submit"]'));

    return {
      selects: allSelects.map(el => ({
        name: el.name,
        id: el.id,
        className: el.className,
        options: Array.from(el.options).slice(0, 3).map(opt => opt.value)
      })),
      inputs: allInputs.map(el => ({
        type: el.type,
        name: el.name,
        id: el.id,
        className: el.className,
        placeholder: el.placeholder
      })),
      buttons: allButtons.map(el => ({
        tag: el.tagName.toLowerCase(),
        type: el.type,
        text: el.textContent?.trim().substring(0, 50),
        id: el.id,
        className: el.className
      }))
    };
  });

  console.log('📋 SELECT ELEMENTS (Document Type dropdown):');
  formElements.selects.forEach((select, i) => {
    console.log(`\n  [${i + 1}]`);
    if (select.id) console.log(`      ID: #${select.id}`);
    if (select.name) console.log(`      Name: [name="${select.name}"]`);
    if (select.className) console.log(`      Class: .${select.className.split(' ')[0]}`);
    console.log(`      Options: ${select.options.join(', ')}`);
  });

  console.log('\n\n📋 INPUT ELEMENTS (ID Number / Captcha):');
  formElements.inputs.forEach((input, i) => {
    console.log(`\n  [${i + 1}] Type: ${input.type}`);
    if (input.id) console.log(`      ID: #${input.id}`);
    if (input.name) console.log(`      Name: [name="${input.name}"]`);
    if (input.placeholder) console.log(`      Placeholder: "${input.placeholder}"`);
    if (input.className) console.log(`      Class: .${input.className.split(' ')[0]}`);
  });

  console.log('\n\n📋 BUTTONS (Submit):');
  formElements.buttons.forEach((button, i) => {
    console.log(`\n  [${i + 1}]`);
    if (button.id) console.log(`      ID: #${button.id}`);
    console.log(`      Tag: ${button.tag}`);
    if (button.text) console.log(`      Text: "${button.text}"`);
    if (button.className) console.log(`      Class: .${button.className.split(' ')[0]}`);
  });

  await page.screenshot({ path: 'actual-form-screenshot.png', fullPage: true });
  console.log('\n\n📸 Screenshot saved: actual-form-screenshot.png');

  console.log('\n⏰ Keeping browser open for 60 more seconds for you to inspect...');
  await page.waitForTimeout(60000);

  await browser.close();
  console.log('\n✅ Done! Check the console output above for selectors.');
}

findSelectors().catch(console.error);

