/* Detail aplikace (modal). Sdílený mezi galerií (app.js) a changelogem (changelog.js).
   Potřebuje na stránce markup #overlay / #modal (viz index.html a changelog.html) a js/icons.js. */
(function () {
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  var $ = function (id) { return document.getElementById(id); };
  var overlay = $('overlay'), modal = $('modal'), closeBtn = $('modalClose');
  if (!overlay || !modal || !closeBtn) return;
  var icon = function (n) { return (window.ICONS && ICONS[n]) || ''; };
  var lastFocus = null;
  closeBtn.innerHTML = icon('close');

  function fmtDate(d) {
    var m = /^(\d{4})-(\d{2})/.exec(d || '');
    return m ? MONTHS[+m[2] - 1] + ' ' + m[1] : (d || '—');
  }
  function href(url) {
    if (!url) return '';
    return /^https?:\/\//i.test(url) ? url : 'https://' + url;
  }
  // Ikony kategorií se berou přímo ze souborů assets/ui-icons/<název>.svg
  function catIcon(name) {
    var url = "url('" + new URL('assets/ui-icons/' + encodeURIComponent(name || 'grid') + '.svg', document.baseURI).href + "')";
    return '<span class="cat-icon" aria-hidden="true" style="-webkit-mask-image:' + url + ';mask-image:' + url + '"></span>';
  }

  /* a = { title, category, developer, date, website, appStore, testflight, expires, beta, icon }
     catIconName = název ikony kategorie (z data/categories.csv) */
  function open(a, catIconName) {
    lastFocus = document.activeElement;
    var img = $('modalImg');
    img.src = a.icon;
    img.alt = a.title + ' icon';
    $('modalTitle').textContent = a.title;
    var tag = $('modalTag');
    tag.innerHTML = catIcon(catIconName || 'grid') + '<span></span>';
    tag.lastChild.textContent = a.category;
    $('mDeveloper').textContent = a.developer || '—';
    $('mDeveloper').title = a.developer || '';
    $('mDate').textContent = fmtDate(a.date);

    // TestFlight aplikace: „Release Date“, „Expires“ a řádek „TestFlight“ místo „App Store“
    var rowDate = $('mDate').parentNode, rowStore = $('mStore').parentNode;
    var rowExp = $('rowExpires');
    if (!rowExp) {
      rowExp = document.createElement('div');
      rowExp.className = 'row';
      rowExp.id = 'rowExpires';
      rowExp.innerHTML = '<dt>Expires</dt><dd id="mExpires"></dd>';
      rowDate.parentNode.insertBefore(rowExp, rowDate.nextSibling);
    }
    rowDate.firstElementChild.textContent = a.beta ? 'Release Date' : 'Date';
    rowStore.firstElementChild.textContent = a.beta ? 'TestFlight' : 'App Store';
    rowExp.hidden = !a.beta;
    $('mExpires').textContent = a.beta ? fmtDate(a.expires) : '';

    var site = $('mWebsite');
    site.textContent = '';
    if (a.website) {
      var link = document.createElement('a');
      link.href = href(a.website);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = a.website.replace(/^https?:\/\//i, '').replace(/\/$/, '');
      link.title = link.href;
      site.appendChild(link);
    } else site.textContent = '—';

    var store = $('mStore');
    store.textContent = '';
    if (a.appStore || a.testflight) {
      var s = document.createElement('a');
      s.className = 'store';
      s.href = href(a.appStore || a.testflight);
      s.target = '_blank';
      s.rel = 'noopener noreferrer';
      s.setAttribute('aria-label', 'Open ' + a.title + ' in ' + (a.appStore ? 'the App Store' : 'TestFlight'));
      s.innerHTML = icon('arrow-up-right');
      store.appendChild(s);
    } else store.textContent = '—';

    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    closeBtn.focus();
  }

  function close() {
    if (!overlay.classList.contains('is-open')) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) close(); });
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (!overlay.classList.contains('is-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Tab') { // jednoduchý focus trap
      var f = modal.querySelectorAll('a[href], button');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  window.DockModal = { open: open, close: close };
})();
