/* ============================================
   TravelWinners B2B — Shared JavaScript v2
   ============================================ */
(function () {
  'use strict';

  var SURL = 'https://vjsludfjsphwnumuoqaj.supabase.co';
  var SKEY = 'sb_publishable_IluITb52iuwwHf9xgP99MA__KX-sNM6';

  var sb = null;
  try {
    sb = window.supabase.createClient(SURL, SKEY);
  } catch (e) {
    console.warn('Supabase init:', e);
  }

  window.TW = window.TW || {};
  window.TW.sb = sb;
  window.TW.lang = localStorage.getItem('tw-lang') || 'en';

  // ---------- Helpers ----------
  window.TW.$ = function (id) { return document.getElementById(id); };

  window.TW.toast = function (msg, isError) {
    var t = document.getElementById('toast');
    var hadElement = !!t;
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    // 기존 CSS .show 클래스 방식 시도
    t.classList.add('show');
    if (isError) t.classList.add('error');
    else t.classList.remove('error');
    // 동적 생성된 경우 또는 .toast CSS가 없는 경우를 위한 fallback inline style
    if (!hadElement) {
      t.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:' + (isError ? '#D85A30' : '#222') + ';color:#fff;padding:14px 24px;border-radius:6px;z-index:99999;font-size:14px;font-weight:500;max-width:90vw;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.15)';
    } else {
      // 기존 엘리먼트인 경우 background만 inline으로 보강 (에러 색상 보장)
      if (isError) t.style.background = '#D85A30';
      else t.style.background = '';
    }
    clearTimeout(t._toastTimer);
    t._toastTimer = setTimeout(function () {
      t.classList.remove('show');
      if (!hadElement) t.style.display = 'none';
    }, 3500);
  };

  // ---------- Language switcher ----------
  window.TW.switchLang = function (l) {
    window.TW.lang = l;
    localStorage.setItem('tw-lang', l);
    var enBtn = document.getElementById('lang-en');
    var koBtn = document.getElementById('lang-ko');
    if (enBtn) enBtn.classList.toggle('active', l === 'en');
    if (koBtn) koBtn.classList.toggle('active', l === 'ko');
    document.querySelectorAll('[data-' + l + ']').forEach(function (el) {
      var v = el.getAttribute('data-' + l);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = v;
      } else {
        el.innerHTML = v;
      }
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    var enBtn = document.getElementById('lang-en');
    var koBtn = document.getElementById('lang-ko');
    if (enBtn) enBtn.addEventListener('click', function () { window.TW.switchLang('en'); });
    if (koBtn) koBtn.addEventListener('click', function () { window.TW.switchLang('ko'); });
    window.TW.switchLang(window.TW.lang);
  });

  // ---------- Auth ----------
  window.TW.requireAuth = function (callback) {
    if (!sb) { window.location.href = 'login.html'; return; }
    sb.auth.getSession().then(function (r) {
      if (r.data.session) {
        callback(r.data.session.user);
      } else {
        window.location.href = 'login.html';
      }
    }).catch(function () {
      window.location.href = 'login.html';
    });
  };

  window.TW.logout = function () {
    if (sb) {
      sb.auth.signOut().then(function () {
        localStorage.removeItem('tw-session-email');
        window.location.href = 'login.html?logout=1';
      }).catch(function () {
        localStorage.removeItem('tw-session-email');
        window.location.href = 'login.html?logout=1';
      });
    } else {
      localStorage.removeItem('tw-session-email');
      window.location.href = 'login.html?logout=1';
    }
  };

  // ---------- Admin check (DB 기반) ----------
  // 캐시: user.id → {is_admin, role, expires}
  var _adminCache = {};
  var ADMIN_CACHE_TTL = 5 * 60 * 1000; // 5분

  // 동기 체크 (캐시 사용) - 빠른 라우팅용
  window.TW.isAdmin = function (user) {
    if (!user || !user.email) return false;
    var c = _adminCache[user.id];
    if (c && c.expires > Date.now()) return c.is_admin;
    return false; // 캐시 없으면 false. 비동기 체크 권장.
  };

  // 비동기 체크 (DB RPC 호출) - RLS 순환 참조 회피
  window.TW.checkAdmin = async function (user) {
    if (!user || !user.email) return { is_admin: false, role: null };
    var c = _adminCache[user.id];
    if (c && c.expires > Date.now()) {
      return { is_admin: c.is_admin, role: c.role };
    }
    if (!sb) return { is_admin: false, role: null };
    try {
      // SECURITY DEFINER 함수 호출 - RLS 우회
      var rpcRes = await sb.rpc('is_admin');
      var isAdminUser = !!(rpcRes.data === true);
      var role = null;
      // role은 추가 조회 (관리자만 admins 테이블 SELECT 가능)
      if (isAdminUser) {
        try {
          var r = await sb.from('admins').select('role').eq('email', user.email).maybeSingle();
          if (r.data) role = r.data.role;
        } catch(e) {}
      }
      _adminCache[user.id] = {
        is_admin: isAdminUser,
        role: role,
        expires: Date.now() + ADMIN_CACHE_TTL
      };
      return { is_admin: isAdminUser, role: role };
    } catch (e) {
      console.error('checkAdmin error:', e);
      return { is_admin: false, role: null };
    }
  };

  // 캐시 클리어 (로그아웃 시)
  window.TW.clearAdminCache = function () { _adminCache = {}; };

  // ---------- Cache layer (Phase 3 Step 5) ----------
  // 60s TTL + cross-tab BroadcastChannel + localStorage fallback (Safari < 15.4)
  // Public API: window.TW.cache.invalidate(key), window.TW.cache.get(key), window.TW.cache.set(key, data)
  // Auto-invalidates: 'hotels' key on any UPDATE/INSERT to hotels table via TW.db.* helpers.
  var _cacheStore = {}; // { key: { data, expires } }
  var CACHE_TTL = 60 * 1000; // 60s
  var DIRTY_LS_KEY = 'tw-cache-dirty';
  var _bc = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      _bc = new BroadcastChannel('tw-cache');
      _bc.onmessage = function (ev) {
        if (ev && ev.data && ev.data.type === 'invalidate' && ev.data.key) {
          delete _cacheStore[ev.data.key];
          // Also notify listeners (e.g. BKA, AdminCache) via local event
          try { window.dispatchEvent(new CustomEvent('tw:cache:invalidate', { detail: { key: ev.data.key, source: 'broadcast' } })); } catch (e) {}
        }
      };
    }
  } catch (e) { _bc = null; }

  // localStorage fallback for browsers without BroadcastChannel
  window.addEventListener('storage', function (ev) {
    if (ev.key === DIRTY_LS_KEY && ev.newValue) {
      try {
        var payload = JSON.parse(ev.newValue);
        if (payload && payload.key) {
          delete _cacheStore[payload.key];
          try { window.dispatchEvent(new CustomEvent('tw:cache:invalidate', { detail: { key: payload.key, source: 'storage' } })); } catch (e) {}
        }
      } catch (e) {}
    }
  });

  window.TW.cache = {
    get: function (key) {
      var entry = _cacheStore[key];
      if (!entry) return null;
      if (entry.expires < Date.now()) {
        delete _cacheStore[key];
        return null;
      }
      return entry.data;
    },
    set: function (key, data, ttl) {
      _cacheStore[key] = { data: data, expires: Date.now() + (ttl || CACHE_TTL) };
    },
    invalidate: function (key) {
      delete _cacheStore[key];
      // Notify same tab (BKA, AdminCache)
      try { window.dispatchEvent(new CustomEvent('tw:cache:invalidate', { detail: { key: key, source: 'local' } })); } catch (e) {}
      // Notify other tabs via BroadcastChannel
      if (_bc) {
        try { _bc.postMessage({ type: 'invalidate', key: key }); } catch (e) {}
      }
      // Notify other tabs via localStorage (fallback)
      try {
        localStorage.setItem(DIRTY_LS_KEY, JSON.stringify({ key: key, ts: Date.now() }));
      } catch (e) {}
    },
    clear: function () { _cacheStore = {}; }
  };

  // ---------- Database helpers ----------
  window.TW.db = {
    getMyHotels: function (opts) {
      if (!sb) return Promise.resolve({ data: [], error: 'no-sb' });
      var noCache = opts && opts.noCache;
      var cached = !noCache && window.TW.cache.get('myHotels');
      if (cached) return Promise.resolve({ data: cached, error: null, _cached: true });
      return sb.from('hotels').select('*').order('created_at', { ascending: false }).then(function (r) {
        if (!r.error && r.data) window.TW.cache.set('myHotels', r.data);
        return r;
      });
    },
    getAllHotels: function (opts) {
      if (!sb) return Promise.resolve({ data: [], error: 'no-sb' });
      var noCache = opts && opts.noCache;
      var cached = !noCache && window.TW.cache.get('hotels');
      if (cached) return Promise.resolve({ data: cached, error: null, _cached: true });
      return sb.from('hotels').select('*').order('created_at', { ascending: false }).then(function (r) {
        if (!r.error && r.data) window.TW.cache.set('hotels', r.data);
        return r;
      });
    },
    getHotel: function (hotelId) {
      if (!sb) return Promise.resolve({ data: null, error: 'no-sb' });
      return sb.from('hotels').select('*').eq('id', hotelId).single();
    },
    createHotel: async function (data) {
      if (!sb) return Promise.resolve({ data: null, error: 'no-sb' });
      // RLS 정책 충족: user_id 자동 주입
      try {
        var u = await sb.auth.getUser();
        if (u && u.data && u.data.user) {
          data = Object.assign({}, data, { user_id: u.data.user.id });
        }
      } catch(e) {}
      return sb.from('hotels').insert(data).select().single().then(function (r) {
        if (!r.error) {
          window.TW.cache.invalidate('hotels');
          window.TW.cache.invalidate('myHotels');
        }
        return r;
      });
    },
    updateHotel: function (hotelId, data) {
      if (!sb) return Promise.resolve({ data: null, error: 'no-sb' });
      return sb.from('hotels').update(data).eq('id', hotelId).select().single().then(function (r) {
        if (!r.error) {
          window.TW.cache.invalidate('hotels');
          window.TW.cache.invalidate('myHotels');
        }
        return r;
      });
    },
    setHotelStatus: function (hotelId, status) {
      if (!sb) return Promise.resolve({ data: null, error: 'no-sb' });
      return sb.from('hotels').update({ status: status }).eq('id', hotelId).then(function (r) {
        if (!r.error) {
          window.TW.cache.invalidate('hotels');
          window.TW.cache.invalidate('myHotels');
        }
        return r;
      });
    },
    getPayments: function (hotelId) {
      if (!sb) return Promise.resolve({ data: [], error: 'no-sb' });
      var q = sb.from('payments').select('*').order('created_at', { ascending: false });
      if (hotelId) q = q.eq('hotel_id', hotelId);
      return q;
    },
    getVideos: function (hotelId) {
      if (!sb) return Promise.resolve({ data: [], error: 'no-sb' });
      var q = sb.from('videos').select('*').order('created_at', { ascending: false });
      if (hotelId) q = q.eq('hotel_id', hotelId);
      return q;
    },
    getBookings: function (hotelId) {
      if (!sb) return Promise.resolve({ data: [], error: 'no-sb' });
      var q = sb.from('bookings').select('*').order('booking_date', { ascending: false });
      if (hotelId) q = q.eq('hotel_id', hotelId);
      return q;
    }
  };

  // ---------- Agoda URL parser ----------
  window.TW.parseAgodaUrl = function (url) {
    var result = { hotelId: null, slug: null, country: null, valid: false };
    if (!url || typeof url !== 'string') return result;
    try {
      var urlObj = new URL(url.trim());
      if (!/agoda\.com$/i.test(urlObj.hostname)) return result;
      var hid = urlObj.searchParams.get('hid');
      if (hid && /^\d+$/.test(hid)) result.hotelId = parseInt(hid, 10);
      var pathParts = urlObj.pathname.split('/').filter(function (p) { return p; });
      if (pathParts.length > 0 && /^[a-z]{2}-[a-z]{2}$/i.test(pathParts[0])) {
        pathParts.shift();
      }
      var hotelIdx = pathParts.indexOf('hotel');
      if (hotelIdx > 0) result.slug = pathParts[hotelIdx - 1];
      var lastPart = pathParts[pathParts.length - 1] || '';
      var ccMatch = lastPart.match(/^(.+)-([a-z]{2})\.html?$/i);
      if (ccMatch) result.country = ccMatch[2].toUpperCase();
      result.valid = !!(result.hotelId || result.slug);
    } catch (e) {}
    return result;
  };

  // ---------- API call helpers ----------
  window.TW.api = {
    getAgodaHotel: function (params) {
      return fetch('/api/agoda-hotel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      }).then(function (r) { return r.json(); });
    },
    getGooglePlace: function (params) {
      return fetch('/api/google-places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      }).then(function (r) { return r.json(); });
    },
    processHotel: function (params) {
      return fetch('/api/process-hotel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      }).then(function (r) { return r.json(); });
    },
    agodaSearch: function (params) {
      return fetch('/api/agoda-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      }).then(function (r) { return r.json(); });
    }
  };

  // ---------- Format helpers ----------
  window.TW.fmt = {
    money: function (n, currency) {
      if (n == null || isNaN(n)) return '-';
      var cur = currency || 'USD';
      var sym = cur === 'USD' ? '$' : (cur === 'KRW' ? '₩' : cur + ' ');
      return sym + Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
    },
    date: function (s) {
      if (!s) return '-';
      try {
        var d = new Date(s);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      } catch (e) { return s; }
    },
    datetime: function (s) {
      if (!s) return '-';
      try {
        var d = new Date(s);
        return d.toLocaleString();
      } catch (e) { return s; }
    },
    stars: function (n) {
      if (n == null || isNaN(n)) return '-';
      var full = Math.floor(n);
      return '★'.repeat(full) + (n - full >= 0.5 ? '½' : '');
    },
    statusLabel: function (s, lang) {
      var labels = {
        en: {
          pending: 'Pending', review: 'Under Review', approved: 'Approved',
          paid: 'Paid', producing: 'In Production', published: 'Published',
          rejected: 'Rejected', refunded: 'Refunded'
        },
        ko: {
          pending: '대기 중', review: '검토 중', approved: '승인됨',
          paid: '결제 완료', producing: '제작 중', published: '게시됨',
          rejected: '거절됨', refunded: '환불됨'
        }
      };
      return (labels[lang || 'en'] || labels.en)[s] || s;
    },
    statusColor: function (s) {
      var colors = {
        pending: '#999', review: '#f0a830', approved: '#534AB7',
        paid: '#0a7c3a', producing: '#534AB7', published: '#0a7c3a',
        rejected: '#c93030', refunded: '#c93030'
      };
      return colors[s] || '#999';
    }
  };

})();
