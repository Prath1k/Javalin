import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
        
        await page.goto('https://eon.prathik.me', {waitUntil: 'networkidle2'});
        await browser.close();
    } catch(err) {
        console.error(err);
    }
})();