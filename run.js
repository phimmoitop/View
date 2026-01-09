const { chromium } = require('playwright');
const fs = require('fs');

// =========================
// CONFIG
// =========================
// Khai báo nhiều URL
const TARGET_URLS = [
  'https://www.hhtm.cc/xem-phim/cuoc-song-thuong-ngay-cua-mot-mao-hiem-gia-29-tuoi/tap-1',
  'https://www.hhtm.cc/xem-phim/ky-nghi-cua-mot-quy-toc-lich-lam/tap-1',
  'https://www.hhtm.cc/xem-phim/chen-thanh-cua-eris/tap-1',
  'https://www.hhtm.cc/xem-phim/nguoi-dan-ong-vo-hinh-va-vo-sap-cuoi-cua-anh-ta/tap-1'
];

// =========================
// AGENT PROFILES BY COUNTRY
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

  // Chọn URL ngẫu nhiên
  const targetUrl = TARGET_URLS[Math.floor(Math.random() * TARGET_URLS.length)];

  // LOG
  fs.appendFileSync(
    'access.log',
    `TIME: ${new Date().toISOString()}
IP: ${ip}
COUNTRY: ${country}
UA: ${pick.ua}
LOCALE: ${pick.locale}
TIMEZONE: ${pick.tz}
URL: ${targetUrl}
------------------------
`
  );

  // 5️⃣ Truy cập website
  await page.goto(targetUrl, {
    waitUntil: 'networkidle',
    timeout: 120000
  });

  // Scroll để trigger lazy-load / ads / video
  await page.evaluate(async () => {
    for (let i = 0; i < 8; i++) {
      window.scrollBy(0, window.innerHeight);
      await new Promise(r => setTimeout(r, 1500));
    }
  });

  // Không chụp ảnh nữa, chỉ ghi log
  fs.writeFileSync(
    'latest.txt',
    `IP: ${ip}
COUNTRY: ${country}
UA: ${pick.ua}
LOCALE: ${pick.locale}
TIMEZONE: ${pick.tz}
URL: ${targetUrl}
`
  );

  await browser.close();
})();
