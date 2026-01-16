const { chromium } = require('playwright');

// =========================
// CONFIG
// =========================
const TARGET_URLS = [
  'https://zuighe.top/pham-nhan-tu-tien/chuong-1/',
  'https://zuighe.top/linh-vu-thien-ha/chuong-1/',
  'https://zuighe.top/the-gioi-hoan-my/chuong-1/',
  'https://zuighe.top/trong-sinh-lien-hon-voi-dinh-cap-hao-mon/chuong-1/',
  'https://zuighe.top/man-cap-dai-lao-trong-sinh-hau/chuong-1/',
  'https://zuighe.top/xuyen-thanh-nam-phu-trong-truyen-nguoc-luyen-co-dai/chuong-1/',
  'https://zuighe.top/vo-goa-cua-ga-chan-lon/chuong-1/',
  'https://zuighe.top/co-vo-ngot-ngao-co-chut-bat-luong-vo-moi-bat-luong-co-chut-ngot/chuong-1/'
];

const VIEW_TIME_PER_CHAPTER = 30 * 1000; // 30s
const MAX_TOTAL_TIME = 60 * 60 * 1000 * 5;  // 1h

// =========================
// MOBILE AGENTS (RICH)
// =========================
const MOBILE_AGENTS = [
  // Android
  {
    name: 'Android Pixel 7',
    ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    w: 412, h: 915,
    locale: 'vi-VN',
    tz: 'Asia/Ho_Chi_Minh'
  },
  {
    name: 'Android Samsung S21',
    ua: 'Mozilla/5.0 (Linux; Android 12; Samsung Galaxy S21) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
    w: 360, h: 800,
    locale: 'vi-VN',
    tz: 'Asia/Ho_Chi_Minh'
  },
  {
    name: 'Android Pixel 8 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    w: 412, h: 915,
    locale: 'en-US',
    tz: 'America/New_York'
  },

  // iPhone
  {
    name: 'iPhone 14',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    w: 390, h: 844,
    locale: 'vi-VN',
    tz: 'Asia/Ho_Chi_Minh'
  },
  {
    name: 'iPhone 12',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    w: 375, h: 812,
    locale: 'en-US',
    tz: 'America/New_York'
  }
];

// =========================
// MAIN
// =========================
(async () => {
  console.log('🚀 Viewer bot started (MOBILE MODE)');

  // Random mobile agent
  const agent = MOBILE_AGENTS[Math.floor(Math.random() * MOBILE_AGENTS.length)];

  console.log(`📱 Agent: ${agent.name}`);
  console.log(`🧭 UA: ${agent.ua}`);
  console.log(`🌐 Locale: ${agent.locale}`);
  console.log(`🕒 TZ: ${agent.tz}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    userAgent: agent.ua,
    viewport: { width: agent.w, height: agent.h },
    isMobile: true,
    hasTouch: true,
    locale: agent.locale,
    timezoneId: agent.tz
  });

  const page = await context.newPage();

  const startUrl = TARGET_URLS[Math.floor(Math.random() * TARGET_URLS.length)];
  console.log(`📌 Start URL: ${startUrl}`);

  const startTime = Date.now();
  await page.goto(startUrl, { waitUntil: 'networkidle', timeout: 120000 });

  let viewCount = 1;

  while (Date.now() - startTime < MAX_TOTAL_TIME) {
    const currentUrl = page.url();
    console.log(`📖 [${viewCount}] Viewing: ${currentUrl}`);

    // Scroll giống người đọc mobile
    await page.evaluate(async () => {
      for (let i = 0; i < 6; i++) {
        window.scrollBy(0, window.innerHeight * 0.6);
        await new Promise(r => setTimeout(r, 900));
      }
    });

    console.log('⏳ Reading 30s...');
    await page.waitForTimeout(VIEW_TIME_PER_CHAPTER);

    // ===== NEXT CHAPTER (ANTI LOOP) =====
    const match = currentUrl.match(/chuong-(\d+)\//);

    if (!match) {
      console.log('🛑 Không nhận diện được chương.');
      break;
    }

    const nextChapter = parseInt(match[1], 10) + 1;
    const nextUrl = currentUrl.replace(/chuong-\d+\//, `chuong-${nextChapter}/`);

    console.log(`➡️ Next chapter: ${nextUrl}`);

    try {
      const res = await page.goto(nextUrl, {
        waitUntil: 'networkidle',
        timeout: 120000
      });

      if (!res || res.status() >= 400) {
        console.log('🛑 Chương tiếp không tồn tại.');
        break;
      }
    } catch {
      console.log('🛑 Lỗi load chương tiếp.');
      break;
    }

    viewCount++;
  }

  console.log(`✅ Finished after ${Math.round((Date.now() - startTime) / 1000)}s`);
  await browser.close();
})();
