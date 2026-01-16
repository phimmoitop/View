const { chromium } = require('playwright');

// =========================
// CONFIG
// =========================
const TARGET_URLS = [
  'https://zuighe.top/pham-nhan-tu-tien/chuong-1/',
  'https://zuighe.top/linh-vu-thien-ha/chuong-1/',
  'https://zuighe.top/the-gioi-hoan-my/chuong-1/',
  'https://zuighe.top/co-vo-ngot-ngao-co-chut-bat-luong-vo-moi-bat-luong-co-chut-ngot/chuong-1/'
];

const VIEW_TIME_PER_CHAPTER = 30 * 1000; // 30 giây
const MAX_TOTAL_TIME = 60 * 60 * 1000;  // 1 tiếng
const DEFAULT_COUNTRY = 'US';

// =========================
// PROFILES
// =========================
const PROFILES = {
  VN: [
    {
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      w: 1366, h: 768,
      locale: 'vi-VN',
      tz: 'Asia/Ho_Chi_Minh'
    }
  ],
  US: [
    {
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      w: 1920, h: 1080,
      locale: 'en-US',
      tz: 'America/New_York'
    }
  ]
};

// =========================
// MAIN
// =========================
(async () => {
  console.log('🚀 Starting viewer bot...');

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

  console.log(`🌍 IP: ${ip} | Country: ${country}`);

  // ===== PICK PROFILE =====
  const profiles = PROFILES[country] || PROFILES[DEFAULT_COUNTRY];
  const pick = profiles[Math.floor(Math.random() * profiles.length)];

  console.log(`🧭 UA: ${pick.ua}`);
  console.log(`🕒 Timezone: ${pick.tz}`);
  console.log(`🌐 Locale: ${pick.locale}`);

  const context = await browser.newContext({
    userAgent: pick.ua,
    viewport: { width: pick.w, height: pick.h },
    locale: pick.locale,
    timezoneId: pick.tz
  });

  const page = await context.newPage();

  // ===== PICK START URL =====
  const startUrl = TARGET_URLS[Math.floor(Math.random() * TARGET_URLS.length)];
  console.log(`📌 Start URL: ${startUrl}`);

  const startTime = Date.now();

  await page.goto(startUrl, {
    waitUntil: 'networkidle',
    timeout: 120000
  });

  let chapterCount = 1;

  while (Date.now() - startTime < MAX_TOTAL_TIME) {
    console.log(`📖 [${chapterCount}] Viewing: ${page.url()}`);

    // Scroll giống người đọc
    await page.evaluate(async () => {
      for (let i = 0; i < 5; i++) {
        window.scrollBy(0, window.innerHeight / 2);
        await new Promise(r => setTimeout(r, 1000));
      }
    });

    console.log('⏳ Reading for 30 seconds...');
    await page.waitForTimeout(VIEW_TIME_PER_CHAPTER);

    // Tìm link chương tiếp theo
    const nextLink = await page.evaluate(() => {
      const el = document.querySelector('a.btn.btn-success.btn-chapter-nav');
      return el ? el.href : null;
    });

    if (!nextLink) {
      console.log('🛑 No next chapter found. Stop.');
      break;
    }

    console.log(`➡️ Go to next chapter: ${nextLink}`);

    await page.goto(nextLink, {
      waitUntil: 'networkidle',
      timeout: 120000
    });

    chapterCount++;
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.log(`✅ Finished. Total view time: ${totalTime}s`);

  await browser.close();
})();
