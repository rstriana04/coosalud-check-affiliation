async function testPdfDownload() {
  const tipoDocumento = 'CC';
  const numeroDocumento = '29152567';
  const url = `https://portal.coosalud.com/AffiliateManager/GetCertificate?DocumentType=${tipoDocumento}&DocumentNumber=${numeroDocumento}`;

  console.log('Testing PDF download with headers...');
  console.log('URL:', url);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      }
    });

    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('Size:', buffer.length, 'bytes');
    console.log('First 100 chars:', buffer.toString('utf8', 0, Math.min(100, buffer.length)));
    console.log('First 4 bytes (should be "%PDF"):', buffer.slice(0, 4).toString());
    
    const isPdf = buffer.slice(0, 4).toString() === '%PDF';
    console.log('\n✅ Is PDF?', isPdf ? 'YES' : 'NO');

    if (isPdf) {
      const fs = await import('fs/promises');
      await fs.writeFile('test-download-result.pdf', buffer);
      console.log('✅ PDF saved to test-download-result.pdf');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testPdfDownload();

