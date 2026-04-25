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
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#222;color:#fff;padding:12px 24px;border-radius:8px;z-index:99999;display:none;max-width:90%;font-size:14px;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.background = isError ? '#D85A30' : '#222';
    t.style.display = 'block';
    setTimeout(function () { t.style.display = 'none'; }, 3500);
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

  // ---------- Admin check ----------
  window.TW.isAdmin = function (user) {
    if (!user) return false;
    return user.email === 'dgmasters01@gmail.com';
  };

  // ---------- Database helpers ----------
  window.TW.db = {
    getMyHotels: function () {
      if (!sb) return Promise.resolve({ data: [], error: 'no-sb' });
      return sb.from('hotels').select('*').order('created_at', { ascending: false });
    },
    getAllHotels: function () {
      if (!sb) return Promise.resolve({ data: [], error: 'no-sb' });
      return sb.from('hotels').select('*').order('created_at', { ascending: false });
    },
    getHotel: function (hotelId) {
      if (!sb) return Promise.resolve({ data: null, error: 'no-sb' });
      return sb.from('hotels').select('*').eq('id', hotelId).single();
    },
    createHotel: function (data) {
      if (!sb) return Promise.resolve({ data: null, error: 'no-sb' });
      return sb.from('hotels').insert(data).select().single();
    },
    updateHotel: function (hotelId, data) {
      if (!sb) return Promise.resolve({ data: null, error: 'no-sb' });
      return sb.from('hotels').update(data).eq('id', hotelId).select().single();
    },
    setHotelStatus: function (hotelId, status) {
      if (!sb) return Promise.resolve({ data: null, error: 'no-sb' });
      return sb.from('hotels').update({ status: status }).eq('id', hotelId);
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
