async function analyzeHtml() {
  const tipoDocumento = 'CC';
  const numeroDocumento = '29152567';
  const url = `https://portal.coosalud.com/AffiliateManager/GetCertificate?DocumentType=${tipoDocumento}&DocumentNumber=${numeroDocumento}`;

  console.log('Analyzing HTML response...\n');

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });

    const html = await response.text();
    
    console.log('=== FULL HTML ===');
    console.log(html);
    console.log('\n=== END HTML ===\n');

    // Look for PDF URLs
    const pdfUrlRegex = /https?:\/\/[^"'\s]+\.pdf/gi;
    const pdfMatches = html.match(pdfUrlRegex);
    
    if (pdfMatches) {
      console.log('Found PDF URLs:');
      pdfMatches.forEach(url => console.log('  -', url));
    }

    // Look for any /GetCertificate or similar
    const certRegex = /\/[^"'\s]*[Cc]ertificat[^"'\s]*/gi;
    const certMatches = html.match(certRegex);
    
    if (certMatches) {
      console.log('\nFound Certificate endpoints:');
      certMatches.forEach(url => console.log('  -', url));
    }

    // Look for window.location or meta refresh
    const redirectRegex = /(window\.location|content=['"].*url=)/gi;
    const redirectMatches = html.match(redirectRegex);
    
    if (redirectMatches) {
      console.log('\nFound redirects:');
      redirectMatches.forEach(match => console.log('  -', match));
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

analyzeHtml();

