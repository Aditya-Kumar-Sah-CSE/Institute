const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('BROWSER ERROR:', msg.text());
      }
    });

    page.on('pageerror', err => {
      console.log('PAGE ERROR:', err.message);
    });

    await page.goto('http://localhost:3002', { waitUntil: 'networkidle0' });
    
    await new Promise(r => setTimeout(r, 2000));
    
    await browser.close();
  } catch (err) {
    console.error('Script Error:', err);
  }
})();
