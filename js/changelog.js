(function () {
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DEFAULT_TITLE = 'New icons added';
  var $ = function (id) { return document.getElementById(id); };
  var themeBtn = $('themeSwitch');

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    themeBtn.innerHTML = ICONS[t === 'dark' ? 'moon' : 'sun'] || '';
    themeBtn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#030303' : '#f4f4f5');
  }
  themeBtn.addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('dockapp-theme', next); } catch (e) {}
  });
  applyTheme(document.documentElement.getAttribute('data-theme') || 'dark');

  /* --- stejný parser a stejná pravidla pro id jako v app.js --- */
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    var first = text.split(/\r?\n/, 1)[0] || '';
    var delim = ',';
    [';', '\t'].forEach(function (d) { if (first.split(d).length > first.split(delim).length) delim = d; });
    var rows = [], row = [], field = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
        else field += c;
      } else if (c === '"' && field.trim() === '') { field = ''; q = true; }
      else if (c === delim) { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = ''; rows.push(row); row = [];
      } else field += c;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function slug(s) { return norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'app'; }
  function pad(n) { return ('0' + n).slice(-2); }

  // YYYY-MM-DD, D.M.YYYY, D. M. YYYY, D/M/YYYY → YYYY-MM-DD (jinak '')
  function normDay(v) {
    v = (v || '').trim();
    var m = /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/.exec(v);
    if (m) return m[1] + '-' + pad(m[2]) + '-' + pad(m[3]);
    m = /^(\d{1,2})\s*[.\/]\s*(\d{1,2})\s*[.\/]\s*(\d{4})/.exec(v);
    if (m) return m[3] + '-' + pad(m[2]) + '-' + pad(m[1]);
    return '';
  }
  // YYYY-MM (stejně jako v app.js)
  function normMonth(v) {
    v = (v || '').trim();
    var m = /^(\d{4})[-\/.](\d{1,2})/.exec(v);
    if (m) return m[1] + '-' + pad(m[2]);
    m = /^(\d{1,2})[\/.](\d{4})$/.exec(v);
    if (m) return m[2] + '-' + pad(m[1]);
    return v;
  }
  function table(rows) {
    var head = (rows[0] || []).map(function (h) { return h.trim().toLowerCase(); });
    return rows.slice(1).map(function (r) {
      var o = {};
      head.forEach(function (h, i) { o[h] = (r[i] || '').trim(); });
      return o;
    });
  }
  function fetchText(url) {
    return fetch(url + '?v=' + Date.now(), { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' – HTTP ' + r.status);
      return r.text();
    });
  }

  var CAT = {};   // 'kategorie' (malými písmeny) → [název, ikona] z data/categories.csv

  function build(appsText, logText) {
    var days = {};     // 'YYYY-MM-DD' → { title, apps: [] }
    var day = function (d) { return days[d] || (days[d] = { title: '', apps: [] }); };
    var seen = {};
    table(parseCSV(appsText)).forEach(function (a, n) {
      if (!a.title) return;
      var plat = (a.platform || '').toLowerCase().replace(/\s+/g, '');
      if (plat !== 'ios' && plat !== 'macos') return;
      var base = plat + '-' + slug(a.title);
      seen[base] = (seen[base] || 0) + 1;
      var id = seen[base] === 1 ? base : base + '-' + seen[base];
      var d = normDay(a.added);
      if (!d) return;
      day(d).apps.push({
        id: id, title: a.title, icon: a.icon, category: a.category, developer: a.developer,
        date: normMonth(a.date), website: a.website, appStore: a.appstore, testflight: a.testflight,
        expires: normMonth(a.expires), beta: !a.appstore && !!a.testflight
      });
    });
    if (logText) table(parseCSV(logText)).forEach(function (r) {
      var d = normDay(r.date);
      if (d && r.title) day(d).title = r.title;
      else if (d) day(d);
    });
    return Object.keys(days).sort().reverse().map(function (d) {
      return { date: d, title: days[d].title || DEFAULT_TITLE, apps: days[d].apps };
    });
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function render(entries) {
    var root = $('timeline');
    root.textContent = '';
    if (!entries.length) {
      root.appendChild(el('p', 'cl-empty', 'Nothing here yet.'));
      return;
    }
    var years = [], byYear = {};
    entries.forEach(function (e) {
      var y = e.date.slice(0, 4);
      if (!byYear[y]) { byYear[y] = []; years.push(y); }
      byYear[y].push(e);
    });
    var first = true, uid = 0;
    years.forEach(function (y, yi) {
      var sec = el('section', 'cl-year');
      var listId = 'cl-list-' + (uid++);
      var btn = el('button', 'cl-year-btn');
      btn.type = 'button';
      btn.setAttribute('aria-controls', listId);
      btn.appendChild(el('span', null, y));
      var chev = document.createElement('span');
      chev.innerHTML = ICONS['chevron-down'] || '';
      btn.appendChild(chev);
      var list = el('ul', 'cl-list');
      list.id = listId;
      var open = yi === 0;                       // aktuální rok rozbalený, starší sbalené
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      list.hidden = !open;
      btn.addEventListener('click', function () {
        var o = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', o ? 'true' : 'false');
        list.hidden = !o;
      });

      byYear[y].forEach(function (e) {
        var li = el('li', 'cl-item' + (first ? ' is-latest' : ''));
        first = false;
        li.appendChild(el('span', 'cl-dot'));
        var m = e.date.split('-');
        var t = el('time', 'cl-date', +m[2] + ' ' + MONTHS[+m[1] - 1]);
        t.setAttribute('datetime', e.date);
        li.appendChild(t);
        var body = el('div', 'cl-body');
        body.appendChild(el('h3', 'cl-title', e.title));
        if (e.apps.length) {
          var ul = el('ul', 'cl-icons');
          e.apps.forEach(function (a) {
            var item = el('li');
            var link = el('a', 'cl-app');
            link.href = 'index.html#app/' + encodeURIComponent(a.id);   // záloha (nový panel, bez JS)
            link.title = a.title;
            link.addEventListener('click', function (ev) {
              if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button !== 0 || !window.DockModal) return;
              ev.preventDefault();
              var c = CAT[(a.category || '').toLowerCase()];
              DockModal.open({
                title: a.title, icon: a.icon, category: c ? c[0] : a.category, developer: a.developer,
                date: a.date, website: a.website, appStore: a.appStore, testflight: a.testflight,
                expires: a.expires, beta: a.beta
              }, c ? c[1] : 'grid');
            });
            var img = document.createElement('img');
            img.src = a.icon; img.alt = ''; img.width = 40; img.height = 40; img.loading = 'lazy';
            img.addEventListener('error', function () { img.removeAttribute('src'); });
            link.appendChild(img);
            link.appendChild(el('span', 'cl-name', a.title));
            item.appendChild(link);
            ul.appendChild(item);
          });
          body.appendChild(ul);
        }
        li.appendChild(body);
        list.appendChild(li);
      });
      sec.appendChild(btn);
      sec.appendChild(list);
      root.appendChild(sec);
    });
  }

  Promise.all([
    fetchText('data/apps.csv'),
    fetchText('data/changelog.csv').catch(function () { return ''; }),
    fetchText('data/categories.csv').catch(function () { return ''; })
  ]).then(function (res) {
    table(parseCSV(res[2])).forEach(function (r) { if (r.name) CAT[r.name.toLowerCase()] = [r.name, r.icon || 'grid']; });
    render(build(res[0], res[1]));
  }).catch(function (err) {
    console.error(err);
    $('timeline').innerHTML = '';
    $('timeline').appendChild(el('p', 'cl-empty', 'Could not load data/apps.csv.'));
  });
})();
