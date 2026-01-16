const { chromium } = require('playwright');
const fs = require('fs');

// =========================
// CONFIG
// =========================
const TARGET_URLS = [
  'https://zuighe.top/pham-nhan-tu-tien/chuong-1/',
  'https://zuighe.top/linh-vu-thien-ha/chuong-1/',
  'https://zuighe.top/the-gioi-hoan-my/chuong-1/',
  'https://zuighe.top/co-vo-ngot-ngao-co-chut-bat-luong-vo-moi-bat-luong-co-chut-ngot/chuong-1/'
];

const VIEW_TIME_PER_CHAPTER = 30 * 1000; // 30s
const MAX_TOTAL_TIME = 60 * 60 * 1000;  // 1 hour
const DEFAULT_COUNTRY = 'US';

// =========================
// PROFILES
// =========================
const PROFILES = {
  VN: [
    // Desktop
    {
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      w: 1366, h: 768,
      locale: 'vi-VN',
      tz: 'Asia/Ho_Chi_Minh'
    },
    // Mobile Android
    {
      ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      w: 412, h: 915,
      locale: 'vi-VN',
      tz: 'Asia/Ho_Chi_Minh',
      m: true
    },
    {
      ua: 'Mozilla/5.0 (Linux; Android 12; Samsung Galaxy S21) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
      w: 360, h: 800,
      locale: 'vi-VN',
      tz: 'Asia/Ho_Chi_Minh',
      m: true
    },
    // Mobile iPhone
    {
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      w: 390, h: 844,
      locale: 'vi-VN',
      tz: 'Asia/Ho_Chi_Minh',
      m: true
    },
    {
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      w: 375, h: 812,
      locale: 'vi-VN',
      tz: 'Asia/Ho_Chi_Minh',
      m: true
    }
  ],

  JP: [
    // Desktop
    {
      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      w: 1440, h: 900,
      locale: 'ja-JP',
      tz: 'Asia/Tokyo'
    },
    // Mobile Android
    {
      ua: 'Mozilla/5.0 (Linux; Android 13; Sony Xperia 1 IV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      w: 412, h: 915,
      locale: 'ja-JP',
      tz: 'Asia/Tokyo',
      m: true
    },
    // Mobile iPhone
    {
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      w: 390, h: 844,
      locale: 'ja-JP',
      tz: 'Asia/Tokyo',
      m: true
    }
  ],

  US: [
    // Desktop
    {
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      w: 1920, h: 1080,
      locale: 'en-US',
      tz: 'America/New_York'
    },
    // Mobile Android
    {
      ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      w: 412, h: 915,
      locale: 'en-US',
      tz: 'America/New_York',
      m: true
    },
    {
      ua: 'Mozilla/5.0 (Linux; Android 13; OnePlus 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
      w: 412, h: 915,
      locale: 'en-US',
      tz: 'America/New_York',
      m: true
    },
    // Mobile iPhone
    {
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      w: 390, h: 844,
      locale: 'en-US',
      tz: 'America/New_York',
      m: true
    }
  ]
};

// =========================
// MAIN
// =========================
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  // ===== GET IP + GEO =====
  const tempContext = await browser.newContext();
  const tempPage = await tempContext.newPage();

  await tempPage.goto('https://api.ipify.org?format=json');
  const ip = await tempPage.evaluate(() => JSON.parse(document.body.innerText).ip);

  await tempPage.goto(`https://ipapi.co/${ip}/json/`);
  const geo = await tempPage.evaluate(() => JSON.parse(document.body.innerText));
  const country = geo.country || DEFAULT_COUNTRY;

  await tempContext.close();

  // ===== PICK PROFILE =====
  const profiles = PROFILES[country] || PROFILES[DEFAULT_COUNTRY];
  const pick = profiles[Math.floor(Math.random() * profiles.length)];

  const context = await browser.newContext({
    userAgent: pick.ua,
    viewport: { width: pick.w, height: pick.h },
    locale: pick.locale,
    timezoneId: pick.tz
  });

  const page = await context.newPage();

  // ===== PICK START URL =====
  const startUrl = TARGET_URLS[Math.floor(Math.random() * TARGET_URLS.length)];

  const startTime = Date.now();

  // ===== VISIT FIRST CHAPTER =====
  await page.goto(startUrl, { waitUntil: 'networkidle', timeout: 120000 });

  while (Date.now() - startTime < MAX_TOTAL_TIME) {
    console.log('📖 Reading:', page.url());

    // Scroll giống người đọc
    await page.evaluate(async () => {
      for (let i = 0; i < 6; i++) {
        window.scrollBy(0, window.innerHeight / 2);
        await new Promise(r => setTimeout(r, 1000));
      }
    });

    // Ở lại đọc
    await page.waitForTimeout(VIEW_TIME_PER_CHAPTER);

    // Tìm link chương tiếp theo
    const nextLink = await page.evaluate(() => {
      const el = document.querySelector('a.btn.btn-success.btn-chapter-nav');
      return el ? el.href : null;
    });

    if (!nextLink) {
      console.log('❌ Hết chương, dừng.');
      break;
    }

    console.log('➡️ Next:', nextLink);

    await page.goto(nextLink, {
      waitUntil: 'networkidle',
      timeout: 120000
    });
  }

  // ===== SAVE LOG =====
  fs.appendFileSync(
    'access.log',
    `TIME: ${new Date().toISOString()}
IP: ${ip}
COUNTRY: ${country}
UA: ${pick.ua}
LAST_URL: ${page.url()}
DURATION: ${Math.round((Date.now() - startTime) / 1000)}s
--------------------------
`
  );

  await browser.close();
})();
