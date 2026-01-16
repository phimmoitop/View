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

const VIEW_TIME_PER_CHAPTER = 30 * 1000;
const MAX_TOTAL_TIME = 60 * 60 * 1000;
const DEFAULT_COUNTRY = 'US';

// =========================
// PROFILES
// =========================
const PROFILES = {
  US: [{
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
    w: 1920, h: 1080,
    locale: 'en-US',
    tz: 'America/New_York'
  }]
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

  // ===== IP + GEO =====
  const tmp = await browser.newContext();
  const tmpPage = await tmp.newPage();

  await tmpPage.goto('https://api.ipify.org?format=json');
  const ip = await tmpPage.evaluate(() => JSON.parse(document.body.innerText).ip);

  await tmpPage.goto(`https://ipapi.co/${ip}/json/`);
  const geo = await tmpPage.evaluate(() => JSON.parse(document.body.innerText));
  const country = geo.country || DEFAULT_COUNTRY;

  await tmp.close();

  console.log(`🌍 IP: ${ip} | Country: ${country}`);

  const profile = PROFILES[country] || PROFILES[DEFAULT_COUNTRY];
  const pick = profile[0];

  const context = await browser.newContext({
    userAgent: pick.ua,
    viewport: { width: pick.w, height: pick.h },
    locale: pick.locale,
    timezoneId: pick.tz
  });

  const page = await context.newPage();

  const startUrl = TARGET_URLS[Math.floor(Math.random() * TARGET_URLS.length)];
  console.log(`📌 Start URL: ${startUrl}`);

  const startTime = Date.now();
  await page.goto(startUrl, { waitUntil: 'networkidle', timeout: 120000 });

  let chapter = 1;

  while (Date.now() - startTime < MAX_TOTAL_TIME) {
    const currentUrl = page.url();
    console.log(`📖 [${chapter}] Viewing: ${currentUrl}`);

    // Scroll
    await page.evaluate(async () => {
      for (let i = 0; i < 5; i++) {
        window.scrollBy(0, window.innerHeight / 2);
        await new Promise(r => setTimeout(r, 1000));
      }
    });

    console.log('⏳ Reading 30s...');
    await page.waitForTimeout(VIEW_TIME_PER_CHAPTER);

    // ===== FIND REAL NEXT CHAPTER LINK =====
    const nextLink = await page.evaluate((current) => {
      const links = Array.from(
        document.querySelectorAll('a.btn.btn-success.btn-chapter-nav')
      );

      const valid = links
        .map(a => a.href)
        .filter(href =>
          href &&
          href.startsWith('http') &&
          href !== current
        );

      return valid.length ? valid[0] : null;
    }, currentUrl);

    if (!nextLink) {
      console.log('🛑 No valid next chapter. Stop.');
      break;
    }

    console.log(`➡️ Next chapter: ${nextLink}`);

    await page.goto(nextLink, {
      waitUntil: 'networkidle',
      timeout: 120000
    });

    chapter++;
  }

  console.log(`✅ Finished after ${Math.round((Date.now() - startTime) / 1000)}s`);
  await browser.close();
})();
