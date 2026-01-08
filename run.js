const { chromium } = require('playwright');
const fs = require('fs');

const agents = [
  { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', w: 1366, h: 768, tz: 'Asia/Ho_Chi_Minh' },
  { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15', w: 1440, h: 900, tz: 'Asia/Tokyo' },
  { ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', w: 390, h: 844, tz: 'Asia/Ho_Chi_Minh', m: true },
  { ua: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36', w: 412, h: 915, tz: 'Asia/Bangkok', m: true }
];

const pick = agents[Math.floor(Math.random() * agents.length)];

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--disable-dev-shm-usage'] });
  const ctx = await browser.newContext({
    userAgent: pick.ua,
    viewport: { width: pick.w, height: pick.h },
    isMobile: pick.m || false,
    locale: 'vi-VN',
    timezoneId: pick.tz
  });

  const page = await ctx.newPage();

  await page.goto('https://api.ipify.org?format=json');
  const ip = await page.evaluate(() => JSON.parse(document.body.innerText).ip);

  fs.appendFileSync('access.log', 'IP: ' + ip + '\nUA: ' + pick.ua + '\n----\n');

  await page.goto('https://www.hhtm.cc/xem-phim/the-gioi-hoan-my/tap-250', { waitUntil: 'networkidle', timeout: 60000 });

  await page.evaluate(async () => {
    for (let i = 0; i < 8; i++) {
      window.scrollBy(0, window.innerHeight);
      await new Promise(r => setTimeout(r, 1500));
    }
  });

  const file = 'screenshot-' + Date.now() + '.png';
  await page.screenshot({ path: file, fullPage: true });

  fs.writeFileSync('latest.txt', 'IP: ' + ip + '\nUA: ' + pick.ua + '\nSCREEN: ' + file);

  await browser.close();
})();
