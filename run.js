const { chromium } = require('playwright');
const fs = require('fs');

// =========================
// CONFIG
// =========================
const TARGET_URL = 'https://www.hhtm.cc/xem-phim/the-gioi-hoan-my/tap-250';

// =========================
// AGENT PROFILES BY COUNTRY
// =========================
const PROFILES = {
  VN: [
    {
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      w: 1366, h: 768,
      locale: 'vi-VN',
      tz: 'Asia/Ho_Chi_Minh'
    },
    {
      ua: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      w: 412, h: 915,
      locale: 'vi-VN',
      tz: 'Asia/Ho_Chi_Minh',
      m: true
    }
  ],

  JP: [
    {
      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      w: 1440, h: 900,
      locale: 'ja-JP',
      tz: 'Asia/Tokyo'
    },
    {
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      w: 390, h: 844,
      locale: 'ja-JP',
      tz: 'Asia/Tokyo',
      m: true
    }
  ],

  US: [
    {
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      w: 1920, h: 1080,
      locale: 'en-US',
      tz: 'America/New_York'
    },
    {
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      w: 390, h: 844,
      locale: 'en-US',
      tz: 'America/New_York',
      m: true
    }
  ]
};

// fallback nếu geo không xác định
const DEFAULT_COUNTRY = 'US';

// =========================
// MAIN
// =========================
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  // Context tạm để lấy IP + GEO
  const tempContext = await browser.newContext();
  const tempPage = await tempContext.newPage();

  // 1️⃣ Lấy IP public
  await tempPage.goto('https://api.ipify.org?format=json');
  const ip = await tempPage.evaluate(() =>
    JSON.parse(document.body.innerText).ip
  );

  // 2️⃣ Lấy GEO từ IP
  await tempPage.goto(`https://ipapi.co/${ip}/json/`);
  const geo = await tempPage.evaluate(() =>
    JSON.parse(document.body.innerText)
  );

  const country = geo.country || DEFAULT_COUNTRY;

  await tempContext.close();

  // 3️⃣ Chọn profile theo quốc gia
  const profiles = PROFILES[country] || PROFILES[DEFAULT_COUNTRY];
  const pick = profiles[Math.floor(Math.random() * profiles.length)];

  // 4️⃣ Tạo context chính (đồng bộ IP / locale / timezone)
  const context = await browser.newContext({
    userAgent: pick.ua,
    viewport: { width: pick.w, height: pick.h },
    isMobile: pick.m || false,
    locale: pick.locale,
    timezoneId: pick.tz,
    javaScriptEnabled: true
  });

  const page = await context.newPage();

  // LOG
  fs.appendFileSync(
    'access.log',
    `TIME: ${new Date().toISOString()}
IP: ${ip}
COUNTRY: ${country}
UA: ${pick.ua}
LOCALE: ${pick.locale}
TIMEZONE: ${pick.tz}
------------------------
`
  );

  // 5️⃣ Truy cập website
  await page.goto(TARGET_URL, {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  // Scroll để trigger lazy-load / ads / video
  await page.evaluate(async () => {
    for (let i = 0; i < 8; i++) {
      window.scrollBy(0, window.innerHeight);
      await new Promise(r => setTimeout(r, 1500));
    }
  });

  // Screenshot
  const file = 'screenshot-' + Date.now() + '.png';
  await page.screenshot({ path: file, fullPage: true });

  fs.writeFileSync(
    'latest.txt',
    `IP: ${ip}
COUNTRY: ${country}
UA: ${pick.ua}
LOCALE: ${pick.locale}
TIMEZONE: ${pick.tz}
SCREEN: ${file}
`
  );

  await browser.close();
})();
