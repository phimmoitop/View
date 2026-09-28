<script type='text/javascript'>
//<![CDATA[
/* ════════════════════════════════════════════════════════════════
   ARTPLAYER — chỉ xử lý phần player cho URL dạng /watch/<ID SỐ>
   ────────────────────────────────────────────────────────────────
   • /watch/7184331      → ID toàn số  → phát bằng ArtPlayer (mp4 Pexels)
   • /watch/dQw4w9WgXcQ  → ID YouTube  → giữ nguyên iframe YouTube cũ
   Script này KHÔNG sửa code cũ: nó quan sát khung #veoPlayerWrap, khi
   router cũ vẽ xong mà ID là số thì thay nội dung bằng ArtPlayer.
   ════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* ---------- CẤU HÌNH ---------- */
  var ARTPLAYER_JS = 'https://cdn.jsdelivr.net/npm/artplayer@5/dist/artplayer.js';
  var THEME_COLOR  = '#f5a623';          /* trùng --accent của template */

  /* Chỉ nhận ID số 1–10 chữ số (ID YouTube luôn 11 ký tự nên không bị nhầm) */
  var NUMERIC_ID = /^\d{1,10}$/;

  /* Nguồn video theo ID.
     Ưu tiên 1: SOURCES (khai báo tay, nếu muốn ép link riêng cho 1 ID).
     Ưu tiên 2: window.GetLinkPexels(id) — gọi Pexels API, lấy toàn bộ chất lượng
                (hàm này nằm ở script cuối file).
     Dự phòng : mẫu link đoán theo tên file Pexels (chỉ dùng khi API lỗi). */
  var SOURCES = {};
  function templateSources(id){
    var base = 'https://videos.pexels.com/video-files/' + id + '/' + id + '-';
    return [
      { html:'2160P', url: base + 'uhd_4096_2160_24fps.mp4' },
      { html:'1440P', url: base + 'uhd_2732_1440_24fps.mp4' },
      { html:'1080P', url: base + 'hd_2048_1080_24fps.mp4' },
      { html:'720P',  url: base + 'hd_1366_720_24fps.mp4' },
      { html:'360P',  url: base + 'sd_640_338_24fps.mp4' }
    ];
  }
  /* Chờ hàm GetLinkPexels (script cuối file) sẵn sàng, tối đa ~3 giây */
  function waitForGetLink(){
    return new Promise(function(resolve, reject){
      var tries = 0;
      (function check(){
        if(typeof window.GetLinkPexels === 'function') return resolve(window.GetLinkPexels);
        if(++tries > 30) return reject(new Error('GetLinkPexels chưa sẵn sàng'));
        setTimeout(check, 100);
      })();
    });
  }
  function getSourcesRaw(id){
    if(SOURCES[id]) return Promise.resolve(SOURCES[id]);
    return waitForGetLink()
      .then(function(fn){ return fn(id); })
      .then(function(list){
        if(!list || !list.length) throw new Error('Pexels không trả về file video');
        return list;
      })
      .catch(function(err){
        if(window.console) console.warn('[ArtPlayer] Không lấy được link từ Pexels API, dùng link dự phòng:', err && err.message);
        return templateSources(id);
      });
  }

  /* Bộ nhớ đệm: mỗi ID chỉ hỏi Pexels API 1 lần (Short kế tiếp được nạp sẵn nên chuyển gần như tức thì) */
  var srcCache = {};
  function getSources(id){
    if(!srcCache[id]){ srcCache[id] = getSourcesRaw(id); }
    return srcCache[id];
  }
  /* Nạp sẵn Short kế tiếp: ảnh poster + đầu file video (thẻ video ẩn, tắt tiếng) */
  var pfVideo = null, pfId = null;
  function releasePrefetch(){
    if(pfVideo){ try{ pfVideo.removeAttribute('src'); pfVideo.load(); }catch(e){} }
    pfVideo = null; pfId = null;
  }
  window.__subMePrefetch = function(id){
    id = String(id);
    if(!NUMERIC_ID.test(id) || pfId === id) return;
    pfId = id;
    try{ (new Image()).src = 'https://images.pexels.com/videos/' + id + '/pexels-photo-' + id + '.jpeg'; }catch(e){}
    getSources(id).then(function(list){
      if(pfId !== id) return;
      var d = pickDefault(list);
      if(pfVideo){ try{ pfVideo.removeAttribute('src'); pfVideo.load(); }catch(e){} }
      var v = document.createElement('video');
      v.muted = true; v.preload = 'auto'; v.playsInline = true; v.crossOrigin = 'anonymous';
      v.src = d.url;
      try{ v.load(); }catch(e){}
      pfVideo = v;
    }).catch(function(){});
  };

  /* ---------- NHỚ CHẤT LƯỢNG ĐÃ CHỌN ---------- */
  var QUALITY_KEY = 'SubMe-artplayer-quality';
  function getSavedQuality(){ try{ return localStorage.getItem(QUALITY_KEY); }catch(e){ return null; } }
  function saveQuality(label){ try{ localStorage.setItem(QUALITY_KEY, label); }catch(e){} }
  /* Mặc định: ưu tiên mức đã chọn lần trước; chưa có thì mobile/màn nhỏ → 720P, còn lại → 1080P */
  function pickDefault(list){
    var want = getSavedQuality() || (window.innerWidth <= 768 ? '720P' : '1080P');
    return list.filter(function(q){ return q.html === want; })[0] || list[0];
  }

  function getMutedPref(){ try{ return localStorage.getItem('SubMe-shorts-muted') === '1'; }catch(e){ return false; } }

  /* ---------- LẤY ID SỐ TỪ URL (/watch/<ID> hoặc /shorts/<ID>) ---------- */
  function getTarget(){
    var m = window.location.pathname.match(/^\/(watch|shorts)\/([^\/\?]+)\/?$/);
    if(!m) return null;
    var id = decodeURIComponent(m[2]);
    if(!NUMERIC_ID.test(id)) return null;
    var isShort = m[1] === 'shorts';
    return { id:id, short:isShort, key:(isShort ? 's' : 'w') + id };
  }

  /* ---------- NẠP THƯ VIỆN (chỉ nạp khi thật sự cần) ---------- */
  var loader = null;
  function loadArtplayer(){
    if(window.Artplayer) return Promise.resolve();
    if(loader) return loader;
    loader = new Promise(function(resolve, reject){
      var s = document.createElement('script');
      s.src = ARTPLAYER_JS;
      s.onload = resolve;
      s.onerror = function(){ loader = null; reject(new Error('Không tải được ArtPlayer')); };
      document.head.appendChild(s);
    });
    return loader;
  }

  /* ---------- VÒNG ĐỜI PLAYER ---------- */
  var art = null, artBox = null, artId = null, mountToken = 0, artIsShort = false, shortCtl = null;

  function destroyPlayer(){
    mountToken++;                         /* huỷ mọi lần mount đang chờ */
    if(art){ try{ art.destroy(false); }catch(e){} }
    art = null; artBox = null; artId = null; artIsShort = false; shortCtl = null;
    window.__subMeArt = null; window.__subMeQuality = null;
    window.__subMeSwitching = false;
    try{ var ap = document.getElementById('SubMeApp'); if(ap){ ap.removeAttribute('data-short-switching'); } }catch(e){}
    releasePrefetch();
  }

  function mountPlayer(wrap, id, isShort, key){
    var token = ++mountToken;
    wrap.innerHTML = '';                  /* bỏ iframe YouTube/placeholder của router cũ */
    artBox = document.createElement('div');
    artBox.setAttribute('data-artplayer', id);
    artBox.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;background:#000;';
    var posterUrl = 'https://images.pexels.com/videos/' + id + '/pexels-photo-' + id + '.jpeg';
    /* Shorts: hiện ảnh poster ngay từ lúc chờ tải video */
    artBox.innerHTML = (isShort ? '<img src="' + posterUrl + '" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" onerror="this.style.display=\'none\'"/>' : '') +
      '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#ddd;font-size:13px;text-shadow:0 1px 3px #000;">Đang tải video…</div>';
    wrap.appendChild(artBox);
    artId = key; artIsShort = !!isShort;
    var box = artBox;

    Promise.all([loadArtplayer(), getSources(id)]).then(function(res){
      if(token !== mountToken || !box.isConnected) return;   /* người dùng đã chuyển trang */
      var list = res[1];
      var def  = pickDefault(list);
      box.innerHTML = '';                 /* bỏ dòng "Đang tải video…" trước khi dựng player */

      art = new window.Artplayer({
        container: box,
        url: def.url,
        type: 'mp4',
        volume: 0.7,
        autoplay: false,
        poster: posterUrl,
        muted: !!(isShort && getMutedPref()),
        loop: false,                    /* Shorts: hết video → chuyển sang Short ngẫu nhiên (sự kiện ended) */
        playsInline: true,
        theme: THEME_COLOR,
        lang: 'en',
        autoSize: false,
        autoMini: false,
        pip: true,
        setting: true,
        /* Chọn chất lượng ngay trên thanh điều khiển (bên phải) */
        controls: [{
          name: 'quality',
          position: 'right',
          index: 10,
          html: def.html,
          style: { padding: '0 10px', fontWeight: '700', fontSize: '13px' },
          selector: list.map(function(q){
            return { html: q.html, url: q.url, default: q.url === def.url };
          }),
          onSelect: function(item){
            saveQuality(item.html);
            art.switchQuality(item.url);   /* giữ nguyên thời điểm đang xem */
            return item.html;              /* cập nhật nhãn nút chất lượng */
          }
        }],
        playbackRate: true,
        aspectRatio: true,
        flip: true,
        fullscreen: true,
        fullscreenWeb: true,
        miniProgressBar: true,
        hotkey: true,
        mutex: true,
        backdrop: true,
        gesture: true,
        fastForward: true,
        lock: true,
        autoOrientation: true,
        airplay: true,
        moreVideoAttr: { crossOrigin: 'anonymous', preload: isShort ? 'auto' : 'metadata' }
      });

      window.__subMeArt = art;               /* để giao diện Shorts điều khiển phát / dừng */

      var myArt = art;
      function announce(){ try{ document.dispatchEvent(new Event('subme-art')); }catch(e){} }

      /* Chất lượng: cho giao diện Shorts (mobile dọc) chọn được */
      window.__subMeQuality = {
        list: list, current: def.html,
        set: function(item){ saveQuality(item.html); this.current = item.html; myArt.switchQuality(item.url); }
      };

      /* ----- TỰ PHÁT -----
         Không chờ sự kiện 'ready' (iOS không tải dữ liệu nên 'ready' có thể không bao giờ bắn).
         Gọi play() ngay + thử lại theo các sự kiện tải + vài mốc thời gian.
         Bị chặn tự phát có tiếng → tự tắt tiếng để vẫn chạy; chạm vào video để bật tiếng. */
      window.__subMeAutoMuted = false;
      var startedAt = Date.now();
      function muteAndPlay(){
        if(art !== myArt || myArt.playing) return;
        try{
          myArt.muted = true; window.__subMeAutoMuted = true;
          var q = myArt.play(); if(q && q.catch){ q.catch(function(){}); }
          announce();
        }catch(e){}
      }
      function ensurePlay(){
        if(art !== myArt || myArt.playing || Date.now() - startedAt > 5000) return;
        try{
          var p = myArt.play();
          if(p && p.catch){ p.catch(function(err){ if(!(err && err.name === 'AbortError')) muteAndPlay(); }); }
        }catch(e){}
      }
      function startPlayback(){
        startedAt = Date.now();
        ensurePlay();
        [300, 900, 1800, 3000].forEach(function(ms){
          setTimeout(function(){ if(art === myArt && !myArt.playing){ ensurePlay(); setTimeout(muteAndPlay, 350); } }, ms);
        });
      }
      if(isShort){
        startPlayback();
        ['ready','video:loadedmetadata','video:loadeddata','video:canplay'].forEach(function(ev){ myArt.on(ev, ensurePlay); });
      } else {
        myArt.on('ready', function(){ var p = myArt.play(); if(p && p.catch){ p.catch(function(){}); } });
      }

      if(isShort){
        /* Poster: hiện khi chưa phát / tạm dừng, ẩn khi đang phát */
        var posterImg = document.createElement('img');
        posterImg.src = posterUrl; posterImg.alt = '';
        posterImg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;pointer-events:none;transition:opacity .2s;';
        posterImg.onerror = function(){ this.style.display = 'none'; };
        myArt.layers.add({ name:'shortPoster', html: posterImg, style:{ position:'absolute', top:'0', left:'0', width:'100%', height:'100%', pointerEvents:'none' } });
        myArt.on('play',    function(){ posterImg.style.opacity = '0'; });
        myArt.on('playing', function(){ posterImg.style.opacity = '0'; });
        myArt.on('pause',   function(){ if(!(myArt.currentTime > 0.3)){ posterImg.style.opacity = '1'; } });   /* tạm dừng giữa chừng: giữ nguyên khung hình, không phủ poster */

        /* Video dọc + mobile dọc → phủ kín khung (cover), không còn viền đen trên/dưới */
        var applyFit = function(){
          try{
            var v = myArt.video;
            if(!v || !v.videoWidth) return;
            var mp = window.matchMedia('(max-width:767px) and (orientation:portrait)').matches;
            v.style.objectFit = (mp && v.videoHeight > v.videoWidth) ? 'cover' : '';
          }catch(e){}
        };
        myArt.on('video:loadedmetadata', applyFit);
        myArt.on('resize', applyFit);

        myArt.on('video:timeupdate', function(){
          var bar = document.getElementById('veoShortBar');
          if(bar && myArt.duration > 0){ bar.style.width = (myArt.currentTime / myArt.duration * 100) + '%'; }
        });
        myArt.on('video:volumechange', announce);
        myArt.on('video:ended', function(){
          if(art !== myArt) return;
          try{ document.dispatchEvent(new Event('subme-short-ended')); }catch(e){}
        });

        var swTimer = null;
        function setSwitching(on){
          window.__subMeSwitching = !!on;
          var ap = document.getElementById('SubMeApp');
          if(ap){ if(on){ ap.setAttribute('data-short-switching', '1'); } else { ap.removeAttribute('data-short-switching'); } }
          if(swTimer){ clearTimeout(swTimer); swTimer = null; }
          if(on){ swTimer = setTimeout(function(){ setSwitching(false); }, 6000); }
        }
        myArt.on('playing', function(){ if(window.__subMeSwitching){ setSwitching(false); } });
        function posterFor(nid){ return 'https://images.pexels.com/videos/' + nid + '/pexels-photo-' + nid + '.jpeg'; }
        shortCtl = {
          /* Gọi ngay khi vuốt: dừng video cũ, hiện poster của Short mới trong lúc chờ tải nguồn */
          prepare: function(nid){
            setSwitching(true);                 /* KHÔNG pause: video cũ chạy tới lúc đổi nguồn → không bị khựng */
            var pb = document.getElementById('veoShortBar'); if(pb){ pb.style.width = '0'; }
          },
          /* Đổi nguồn trên CHÍNH thẻ <video> cũ → trình duyệt vẫn nhớ đã được người dùng cho phép phát có tiếng */
          switchTo: function(nid, newList){
            var d = pickDefault(newList);
            posterImg.style.display = ''; posterImg.style.opacity = '1'; posterImg.src = posterFor(nid);   /* poster Short mới che khoảng chờ */
            try{ myArt.poster = posterFor(nid); }catch(e){}
            window.__subMeQuality.list = newList; window.__subMeQuality.current = d.html;
            try{
              myArt.controls.update({ name:'quality', html:d.html,
                selector: newList.map(function(q){ return { html:q.html, url:q.url, default:q.url === d.url }; }) });
            }catch(e){}
            window.__subMeAutoMuted = false;
            try{ myArt.muted = getMutedPref(); }catch(e){}      /* giữ lựa chọn tiếng của người dùng */
            try{ myArt.url = d.url; }catch(e){ try{ myArt.switchUrl(d.url); }catch(e2){} }
            try{ myArt.currentTime = 0; }catch(e){}
            startPlayback();
            announce();
          }
        };
      }
      announce();
      art.on('error', function(){
        art.notice.show = 'Không phát được video này';
      });
    }).catch(function(){
      if(token !== mountToken) return;
      box.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;text-align:center;padding:20px;">Không tải được trình phát. Hãy kiểm tra kết nối mạng rồi tải lại trang.</div>';
    });
  }

  /* Router ghi đè #veoPlayerWrap mỗi lần vuốt → gắn lại đúng thẻ player cũ rồi chỉ đổi nguồn video */
  function reuseShort(wrap, t){
    var myArt = art, ctl = shortCtl;
    for(var c = wrap.firstChild; c;){ var nx = c.nextSibling; if(c !== artBox){ wrap.removeChild(c); } c = nx; }
    if(artBox.parentNode !== wrap){ wrap.appendChild(artBox); }
    if(artId === t.key){                      /* cùng Short, chỉ bị router vẽ lại khung */
      try{ var p = myArt.play(); if(p && p.catch){ p.catch(function(){}); } }catch(e){}
      return;
    }
    var token = ++mountToken;
    artId = t.key;
    ctl.prepare(t.id);
    getSources(t.id).then(function(list){
      if(token !== mountToken || art !== myArt || artId !== t.key) return;
      ctl.switchTo(t.id, list);
    }).catch(function(){
      if(token !== mountToken) return;
      destroyPlayer(); mountPlayer(wrap, t.id, true, t.key);
    });
  }

  /* ---------- ĐỒNG BỘ VỚI ROUTER CŨ ---------- */
  function sync(){
    var wrap = document.getElementById('veoPlayerWrap');
    if(!wrap) return;
    var t = getTarget();

    if(!t){                               /* trang khác / video YouTube → dọn ArtPlayer */
      if(art || artBox) destroyPlayer();
      return;
    }
    /* Đã mount đúng video (cùng loại watch/shorts) và khung vẫn còn nguyên → không làm gì */
    if(art !== null || artBox){
      if(artId === t.key && artBox && artBox.parentNode === wrap) return;
      if(art && shortCtl && t.short && artIsShort){ reuseShort(wrap, t); return; }
      destroyPlayer();
    }
    mountPlayer(wrap, t.id, t.short, t.key);
  }

  function init(){
    var wrap = document.getElementById('veoPlayerWrap');
    if(!wrap){ return; }
    /* Router cũ mỗi lần vào /watch đều ghi lại innerHTML của khung này
       (hoặc xoá trống khi rời trang) → quan sát để phản ứng đúng lúc */
    new MutationObserver(sync).observe(wrap, { childList:true });
    window.addEventListener('popstate', function(){ setTimeout(sync, 0); });
    sync();                               /* trường hợp mở thẳng /watch/<ID số> */
  }

  if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})();
//]]>
</script>
