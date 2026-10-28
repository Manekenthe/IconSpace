(function () {
  'use strict';

  var DATA = window.DOCKAPP || { apps: [], counts: {} };
  var ICONS = window.ICONS || {};
  var APPS = DATA.apps.map(function (a, i) { a.idx = i; return a; });

  // Kategorie -> ikona (názvy souborů z assets/ui-icons)
  var CATEGORIES = [
    ['All categories', 'grid'],
    ['Business', 'briefcase'],
    ['Developer Tools', 'code'],
    ['Education', 'education'],
    ['Entertainment', 'entertainment'],
    ['Finance', 'wallet'],
    ['Games', 'gamepad'],
    ['Graphic & Design', 'palette'],
    ['Health & Fitness', 'heart-pulse'],
    ['Lifestyle', 'sofa'],
    ['Medical', 'stethoscope'],
    ['Music', 'music'],
    ['News', 'newspaper'],
    ['Photo & Video', 'camera'],
    ['Productivity', 'send'],
    ['Reference', 'quote'],
    ['Social Networking', 'messages'],
    ['Sports', 'football'],
    ['Travel', 'plane'],
    ['Utilities', 'calculator'],
    ['Weather', 'cloud-sun']
  ];
  var CAT_ICON = {};
  CATEGORIES.forEach(function (c) { CAT_ICON[c[0]] = c[1]; });
  var ALL = CATEGORIES[0][0];

  var SORTS = [
    ['featured', 'Featured'],
    ['latest', 'Latest'],
    ['az', 'Name (A → Z)'],
    ['za', 'Name (Z → A)']
  ];

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

  var BATCH = 120;
  var state = { platform: 'ios', query: '', category: ALL, sort: 'latest' };
  var view = [];     // aktuálně vyfiltrované a seřazené
  var rendered = 0;

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    grid: $('grid'), count: $('count'), empty: $('empty'), sentinel: $('sentinel'),
    search: $('search'), clear: $('searchClear'), searchWrap: $('searchWrap'),
    theme: $('themeSwitch'), headerRight: $('headerRight'),
    mobileFilters: $('mobileFilters'), toolbarRight: document.querySelector('.toolbar-right'),
    overlay: $('overlay'), modal: $('modal'), modalClose: $('modalClose')
  };

  function icon(name) { return ICONS[name] || ''; }

  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function fmtDate(d) {
    var m = /^(\d{4})-(\d{2})/.exec(d || '');
    return m ? MONTHS[+m[2] - 1] + ' ' + m[1] : (d || '—');
  }

  function fmtNumber(n) { return Number(n).toLocaleString('en-US'); }

  function href(url) {
    if (!url) return '';
    return /^https?:\/\//i.test(url) ? url : 'https://' + url;
  }

  /* ---------------- Theme ---------------- */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    el.theme.innerHTML = icon(t === 'dark' ? 'moon' : 'sun');
    el.theme.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#030303' : '#f4f4f5');
  }
  el.theme.addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('dockapp-theme', next); } catch (e) {}
  });

  /* ---------------- Dropdown ---------------- */
  var openDd = null;

  function Dropdown(root, opts) {
    var self = this;
    this.root = root;
    this.opts = opts;
    this.value = opts.value;
    this.activeIdx = -1;

    this.trigger = document.createElement('button');
    this.trigger.type = 'button';
    this.trigger.className = 'dd-trigger';
    this.trigger.setAttribute('aria-haspopup', 'listbox');
    this.trigger.setAttribute('aria-expanded', 'false');
    if (opts.label) this.trigger.setAttribute('aria-label', opts.label);

    this.list = document.createElement('div');
    this.list.className = 'dd-list';
    this.list.setAttribute('role', 'listbox');
    if (opts.label) this.list.setAttribute('aria-label', opts.label);

    this.items = opts.items.map(function (it, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'dd-item';
      b.setAttribute('role', 'option');
      b.tabIndex = -1;
      b.dataset.value = it[0];
      b.innerHTML = (opts.leadingIcon ? icon(it[2]) : '') +
        '<span></span><span class="check">' + icon('checkmark') + '</span>';
      b.children[opts.leadingIcon ? 1 : 0].textContent = it[1];
      b.addEventListener('click', function () { self.select(it[0]); self.close(true); });
      b.addEventListener('mousemove', function () { self.setActive(i); });
      self.list.appendChild(b);
      return b;
    });

    root.appendChild(this.trigger);
    root.appendChild(this.list);

    this.trigger.addEventListener('click', function () { self.isOpen() ? self.close(true) : self.open(); });
    this.trigger.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!self.isOpen()) self.open(); }
    });
    this.list.addEventListener('keydown', function (e) {
      var n = self.items.length;
      if (e.key === 'ArrowDown') { e.preventDefault(); self.setActive(Math.min(n - 1, self.activeIdx + 1), true); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); self.setActive(Math.max(0, self.activeIdx - 1), true); }
      else if (e.key === 'Home') { e.preventDefault(); self.setActive(0, true); }
      else if (e.key === 'End') { e.preventDefault(); self.setActive(n - 1, true); }
      else if (e.key === 'Escape') { e.preventDefault(); self.close(true); }
      else if (e.key === 'Tab') { self.close(false); }
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (self.activeIdx >= 0) { self.select(self.items[self.activeIdx].dataset.value); self.close(true); }
      }
    });

    this.render();
  }

  Dropdown.prototype.isOpen = function () { return this.list.classList.contains('is-open'); };

  Dropdown.prototype.render = function () {
    var self = this;
    var cur = this.opts.items.filter(function (i) { return i[0] === self.value; })[0] || this.opts.items[0];
    this.trigger.innerHTML = (this.opts.leadingIcon ? icon(cur[2]) : '') +
      '<span class="dd-text"></span><span class="chev">' +
      icon(this.isOpen() ? 'chevron-up' : 'chevron-down') + '</span>';
    this.trigger.querySelector('.dd-text').textContent = cur[1];
    this.items.forEach(function (b) {
      var sel = b.dataset.value === self.value;
      b.setAttribute('aria-selected', sel ? 'true' : 'false');
      b.querySelector('.check').style.visibility = sel ? 'visible' : 'hidden';
    });
  };

  Dropdown.prototype.setActive = function (i, focus) {
    this.activeIdx = i;
    this.items.forEach(function (b, k) { b.classList.toggle('is-active', k === i); });
    if (this.items[i]) {
      if (focus) this.items[i].focus({ preventScroll: true });
      this.items[i].scrollIntoView({ block: 'nearest' });
    }
  };

  Dropdown.prototype.open = function () {
    if (openDd && openDd !== this) openDd.close(false);
    openDd = this;
    this.list.classList.add('is-open');
    this.trigger.setAttribute('aria-expanded', 'true');
    this.render();
    var self = this;
    var idx = this.items.findIndex(function (b) { return b.dataset.value === self.value; });
    this.setActive(Math.max(0, idx), true);
  };

  Dropdown.prototype.close = function (restoreFocus) {
    this.list.classList.remove('is-open');
    this.trigger.setAttribute('aria-expanded', 'false');
    this.items.forEach(function (b) { b.classList.remove('is-active'); });
    this.render();
    if (openDd === this) openDd = null;
    if (restoreFocus) this.trigger.focus();
  };

  Dropdown.prototype.select = function (v) {
    if (v === this.value) return;
    this.value = v;
    this.render();
    this.opts.onChange(v);
  };

  document.addEventListener('mousedown', function (e) {
    if (openDd && !openDd.root.contains(e.target)) openDd.close(false);
  });
  document.addEventListener('focusin', function (e) {
    if (openDd && !openDd.root.contains(e.target)) openDd.close(false);
  });

  var sortDd = new Dropdown($('sortDd'), {
    label: 'Sort by',
    items: SORTS,
    value: state.sort,
    onChange: function (v) { state.sort = v; update(); }
  });
  var categoryDd = new Dropdown($('categoryDd'), {
    label: 'Category',
    leadingIcon: true,
    items: CATEGORIES.map(function (c) { return [c[0], c[0], c[1]]; }),
    value: state.category,
    onChange: function (v) { state.category = v; update(); }
  });

  /* ---------------- Filter + sort ---------------- */
  function compute() {
    var q = norm(state.query.trim());
    var list = APPS.filter(function (a) {
      if (a.platform !== state.platform) return false;
      if (state.category !== ALL && a.category !== state.category) return false;
      if (q) {
        var hay = norm(a.title + ' ' + a.developer + ' ' + a.category);
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    var byLatest = function (a, b) {
      return a.date < b.date ? 1 : a.date > b.date ? -1 : b.idx - a.idx; // novější řádek v CSV = novější
    };
    var byName = function (a, b) {
      return a.title.localeCompare(b.title, 'en', { sensitivity: 'base', numeric: true });
    };
    if (state.sort === 'az') list.sort(byName);
    else if (state.sort === 'za') list.sort(function (a, b) { return byName(b, a); });
    else if (state.sort === 'featured') {
      list.sort(function (a, b) { return (b.featured - a.featured) || byLatest(a, b); });
    } else list.sort(byLatest);
    return list;
  }

  function updateCount() {
    var filtered = state.query.trim() || state.category !== ALL;
    var manual = DATA.counts && DATA.counts[state.platform];
    var n = (!filtered && manual) ? manual : view.length;
    el.count.innerHTML = '<b>' + fmtNumber(n) + '</b> ' + (n === 1 ? 'icon' : 'icons');
  }

  /* ---------------- Rendering ---------------- */
  function makeCard(a) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'card';
    b.dataset.id = a.id;
    var img = document.createElement('img');
    img.src = a.icon;
    img.alt = '';
    img.width = 62; img.height = 62;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', function () { img.removeAttribute('src'); });
    var label = document.createElement('span');
    label.className = 'label';
    var t = document.createElement('span');
    t.textContent = a.title;
    label.appendChild(t);
    b.appendChild(img);
    b.appendChild(label);
    b.setAttribute('aria-label', a.title);
    return b;
  }

  function renderMore() {
    if (rendered >= view.length) return;
    var frag = document.createDocumentFragment();
    var end = Math.min(rendered + BATCH, view.length);
    for (var i = rendered; i < end; i++) frag.appendChild(makeCard(view[i]));
    el.grid.appendChild(frag);
    rendered = end;
  }

  function update() {
    view = compute();
    el.grid.textContent = '';
    rendered = 0;
    renderMore();
    el.empty.hidden = view.length > 0;
    updateCount();
    // pokud sentinel zůstal viditelný, IntersectionObserver zavolá dál sám
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) renderMore();
    }, { rootMargin: '800px 0px' }).observe(el.sentinel);
  } else {
    window.addEventListener('scroll', function () {
      if (window.innerHeight + window.scrollY > document.body.offsetHeight - 1200) renderMore();
    }, { passive: true });
  }

  /* ---------------- Platform nav ---------------- */
  var navBtns = Array.prototype.slice.call(document.querySelectorAll('[data-platform]'));
  function setPlatform(p, push) {
    state.platform = p;
    navBtns.forEach(function (b) {
      if (b.dataset.platform === p) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    if (push) {
      try { history.replaceState(null, '', '#' + p); } catch (e) {}
    }
    update();
    window.scrollTo(0, 0);
  }
  navBtns.forEach(function (b) {
    b.addEventListener('click', function () { setPlatform(b.dataset.platform, true); });
  });

  /* ---------------- Search ---------------- */
  el.clear.innerHTML = icon('close');
  el.search.addEventListener('input', function () {
    state.query = el.search.value;
    el.clear.hidden = !el.search.value;
    update();
  });
  el.search.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && el.search.value) { e.preventDefault(); clearSearch(); }
  });
  function clearSearch() {
    el.search.value = '';
    state.query = '';
    el.clear.hidden = true;
    el.search.focus();
    update();
  }
  el.clear.addEventListener('click', clearSearch);

  /* ---------------- Responsive layout (mobile: search + kategorie pod headerem) ---------------- */
  var mq = window.matchMedia('(max-width: 719px)');
  function layout() {
    if (mq.matches) {
      el.mobileFilters.appendChild(el.searchWrap);
      el.mobileFilters.appendChild($('categoryDd'));
    } else {
      el.headerRight.insertBefore(el.searchWrap, el.theme);
      el.toolbarRight.appendChild($('categoryDd'));
    }
  }
  if (mq.addEventListener) mq.addEventListener('change', layout); else mq.addListener(layout);

  /* ---------------- Modal ---------------- */
  var lastFocus = null;
  var byId = {};
  APPS.forEach(function (a) { byId[a.id] = a; });

  el.modalClose.innerHTML = icon('close');

  function openModal(a) {
    lastFocus = document.activeElement;
    var img = $('modalImg');
    img.src = a.icon;
    img.alt = a.title + ' icon';
    $('modalTitle').textContent = a.title;
    var tag = $('modalTag');
    tag.innerHTML = icon(CAT_ICON[a.category] || 'grid') + '<span></span>';
    tag.lastChild.textContent = a.category;
    $('mDeveloper').textContent = a.developer || '—';
    $('mDate').textContent = fmtDate(a.date);

    var site = $('mWebsite');
    site.textContent = '';
    if (a.website) {
      var link = document.createElement('a');
      link.href = href(a.website);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = a.website.replace(/^https?:\/\//i, '').replace(/\/$/, '');
      site.appendChild(link);
    } else site.textContent = '—';

    var store = $('mStore');
    store.textContent = '';
    if (a.appStore) {
      var s = document.createElement('a');
      s.className = 'store';
      s.href = href(a.appStore);
      s.target = '_blank';
      s.rel = 'noopener noreferrer';
      s.setAttribute('aria-label', 'Open ' + a.title + ' in the App Store');
      s.innerHTML = icon('arrow-up-right');
      store.appendChild(s);
    } else store.textContent = '—';

    el.overlay.classList.add('is-open');
    el.overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    el.modalClose.focus();
  }

  function closeModal() {
    if (!el.overlay.classList.contains('is-open')) return;
    el.overlay.classList.remove('is-open');
    el.overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  el.grid.addEventListener('click', function (e) {
    var card = e.target.closest('.card');
    if (card && byId[card.dataset.id]) openModal(byId[card.dataset.id]);
  });
  el.overlay.addEventListener('mousedown', function (e) { if (e.target === el.overlay) closeModal(); });
  el.modalClose.addEventListener('click', closeModal);
  document.addEventListener('keydown', function (e) {
    if (!el.overlay.classList.contains('is-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
    else if (e.key === 'Tab') { // jednoduchý focus trap
      var f = el.modal.querySelectorAll('a[href], button');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------------- Init ---------------- */
  applyTheme(document.documentElement.getAttribute('data-theme') || 'dark');
  layout();
  var initial = (location.hash || '').replace('#', '') === 'macos' ? 'macos' : 'ios';
  setPlatform(initial, false);
  window.addEventListener('hashchange', function () {
    var h = location.hash.replace('#', '');
    if ((h === 'ios' || h === 'macos') && h !== state.platform) setPlatform(h, false);
  });
})();
