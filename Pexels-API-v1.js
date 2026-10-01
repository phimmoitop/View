(function(){
  'use strict';
  var BASE = window.SUBME_WORKER;
  var CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
  var CACHE_PFX = 'SubMe-pexels-';
  var QUALITY_TOKEN = /^\d+(-(?:sd|hd|uhd))?_\d+_\d+$/;
  var inflight = {};

  function readCache(id){
    try{
      var o = JSON.parse(localStorage.getItem(CACHE_PFX + id) || 'null');
      if(!o || !o.list || !o.list.length || (Date.now() - o.ts) > CACHE_TTL) return null;
      return o.list;
    }catch(e){ return null; }
  }
  function writeCache(id, list){
    try{ localStorage.setItem(CACHE_PFX + id, JSON.stringify({ ts: Date.now(), list: list })); }catch(e){}
  }
  function BuildPexelsLink(videoId, token, fps){
    return 'https://videos.pexels.com/video-files/' + videoId + '/' + token + '_' + fps + 'fps.mp4';
  }
  window.BuildPexelsLink = BuildPexelsLink;

  function listFromRow(row){
    if(!row || !row.quality || !row.fps) return null;
    var byLabel = {};
    String(row.quality).split(',').forEach(function(tok){
      tok = tok.trim();
      if(!QUALITY_TOKEN.test(tok)) return;
      var p = tok.split('_'), w = Number(p[1]), h = Number(p[2]), side = Math.min(w, h);
      if(!side) return;
      var label = side + 'P', cur = byLabel[label];
      if(!cur || w > cur.width){
        byLabel[label] = { html: label, url: BuildPexelsLink(row.videoId, tok, row.fps), width: w, height: h, fps: row.fps };
      }
    });
    var list = Object.keys(byLabel).map(function(k){ return byLabel[k]; })
      .sort(function(a, b){ return parseInt(b.html, 10) - parseInt(a.html, 10); });
    if(!list.length) return null;
    list.fromSheet = true;
    return list;
  }
  window.SubMeListFromRow = listFromRow;
  window.SubMeRegisterPexels = function(){};   // Worker tự đăng ký video vào Sheet

  function fetchFromWorker(id, skipLocal){
    if(!skipLocal){ var c = readCache(id); if(c) return Promise.resolve(c); }
    if(inflight[id]) return inflight[id];
    inflight[id] = fetch(BASE + '/api/pexels/' + encodeURIComponent(id)).then(function(r){
      return r.json().then(function(d){
        if(!r.ok || d.error) throw new Error(d.error || ('Worker lỗi ' + r.status));
        return d.list;
      });
    }).then(function(list){
      delete inflight[id]; writeCache(id, list); return list;
    }, function(err){ delete inflight[id]; throw err; });
    return inflight[id];
  }

  function GetLinkPexels(id, opts){
    id = String(id).trim();
    if(!/^\d{1,10}$/.test(id)) return Promise.reject(new Error('ID Pexels không hợp lệ: ' + id));
    var ready = (window.SubMeVideos && window.SubMeVideos.ready) || Promise.resolve();
    return ready.then(function(){
      if(!(opts && opts.skipSheet)){
        var row = window.SubMeVideos && window.SubMeVideos.get('pexels', id);
        var fromSheet = listFromRow(row);
        if(fromSheet) return fromSheet;
      }
      return fetchFromWorker(id, !!(opts && opts.skipSheet));
    });
  }
  window.GetLinkPexels = GetLinkPexels;
})();
