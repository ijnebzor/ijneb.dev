/* freelAIncer — app controller (Phase 0.5) */

(function () {
  var routeViews = {
    home: 'home',
    projects: 'projects',
    time: 'time',
    invoices: 'invoices',
    invoicing: 'invoices',
    mirror: 'mirror',
    more: 'more'
  };
  var currentView = initialViewFromLocation();
  var scope = 'all';
  var els = {};
  var toastTimer;

  function $(sel) { return document.querySelector(sel); }
  function $all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  function initialViewFromLocation() {
    var hashView = window.location.hash ? window.location.hash.replace(/^#\/?/, '') : '';
    var pathParts = window.location.pathname.split('/').filter(Boolean);
    var pathView = pathParts[pathParts.length - 1] || 'home';
    return routeViews[hashView] || routeViews[pathView] || 'home';
  }

  function viewPath(view) {
    return view === 'home' ? './' : './' + (view === 'invoices' ? 'invoicing' : view) + '/';
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function dateLabel(iso) {
    if (!iso) return 'No date';
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short'
    });
  }

  function statusGlyph(status) {
    var map = {
      active: '●',
      complete: '●',
      paid: '●',
      sent: '◐',
      draft: '◌',
      overdue: '⚠',
      in_progress: '◐',
      pending: '◌',
      review: '▲'
    };
    return map[status] || '●';
  }

  function regionLabel(region) {
    return {
      love: 'love',
      good_at: 'good at',
      world_needs: 'world needs',
      paid_for: 'paid for',
      passion: 'passion',
      mission: 'mission',
      profession: 'profession',
      vocation: 'vocation'
    }[region] || region;
  }

  function regionPills(regions) {
    return '<div class="pillrow">' + (regions || []).map(function (r) {
      var klass = ['love', 'good_at', 'world_needs', 'paid_for'].indexOf(r) >= 0 ? ' pill-' + r : '';
      return '<span class="pill' + klass + '">' + esc(regionLabel(r)) + '</span>';
    }).join('') + '</div>';
  }

  function triad(key) {
    var t = AI_SCRIPTED.triads[key];
    return '<div class="triad">' +
      triadCard('Creative-speak', t.creative) +
      triadCard('Professional-speak', t.professional) +
      triadCard('Ikigai-speak', t.ikigai) +
      '</div>';
  }

  function triadCard(label, body) {
    return '<article class="card triad-card"><div class="kpi-label">' + esc(label) + '</div><p class="kpi-sub">' + esc(body) + '</p></article>';
  }

  function totals() {
    var confirmedHours = S.timeEntries.filter(function (t) { return t.confirmed; }).reduce(function (a, t) { return a + t.hours; }, 0);
    var proposedHours = S.timeEntries.filter(function (t) { return !t.confirmed; }).reduce(function (a, t) { return a + t.hours; }, 0);
    var paidAud = S.invoices.filter(function (i) { return i.status === 'paid'; }).reduce(function (a, i) { return a + toAUD(i.total, i.currency); }, 0);
    var sentAud = S.invoices.filter(function (i) { return i.status !== 'paid'; }).reduce(function (a, i) { return a + toAUD(i.total, i.currency); }, 0);
    var expenseAud = S.expenses.reduce(function (a, e) { return a + toAUD(e.amount, e.currency); }, 0);
    return { confirmedHours: confirmedHours, proposedHours: proposedHours, paidAud: paidAud, sentAud: sentAud, expenseAud: expenseAud };
  }

  function render() {
    var views = {
      home: renderHome,
      projects: renderProjects,
      time: renderTime,
      invoices: renderInvoices,
      mirror: renderMirror,
      more: renderMore
    };
    els.main.innerHTML = (views[currentView] || views.home)();
    bindViewActions();
    updateNav();
    updateBadge();
    if (els.buddyQuick) renderBuddy();
  }

  function renderHome() {
    var t = totals();
    var active = S.projects.filter(function (p) { return p.status === 'active'; }).length;
    var tax = calcTax(annualiseIncome());
    return '<section class="view">' +
      '<div class="hero"><div class="eyebrow">Phase 0.5 local demo</div>' +
      '<h1>Run the studio without feeding the spreadsheet.</h1>' +
      '<p class="lead">Benny can capture time, draft invoices, store receipt evidence locally, and inspect which creative work actually pays.</p></div>' +
      '<div class="grid kpis">' +
      kpi('Active projects', active, 'Across AUD, USD, EUR, and GBP') +
      kpi('Confirmed time', t.confirmedHours.toFixed(1) + 'h', t.proposedHours.toFixed(1) + 'h waiting for approval') +
      kpi('Paid revenue', fmtCurrency(t.paidAud, 'AUD'), 'Converted to home currency') +
      kpi('Tax estimate', fmtCurrency(tax.total, 'AUD'), tax.effectiveRate.toFixed(1) + '% effective rate') +
      '</div>' +
      '<div class="section"><div class="row"><h2>Next best actions</h2><button class="btn btn-primary" data-action="open-buddy" type="button">Ask Buddy</button></div>' +
      '<div class="grid two">' +
      actionCard('Time capture', 'Confirm the three proposed entries from calendar capture.', 'Go to Time', 'time') +
      actionCard('Invoice draft', 'Turn confirmed Kindred hours into the next USD invoice.', 'Go to Invoices', 'invoices') +
      '</div></div>' +
      '<div class="section"><h2>AI patterns</h2>' + triad('capture') + '</div>' +
      '</section>';
  }

  function kpi(label, value, sub) {
    return '<article class="card"><div class="kpi-label">' + esc(label) + '</div><div class="kpi-value">' + esc(value) + '</div><p class="kpi-sub">' + esc(sub) + '</p></article>';
  }

  function actionCard(title, body, cta, view) {
    return '<article class="card card-accent"><h3>' + esc(title) + '</h3><p class="kpi-sub">' + esc(body) + '</p>' +
      '<button class="btn" data-go="' + esc(view) + '" type="button">' + esc(cta) + '</button></article>';
  }

  function renderProjects() {
    return '<section class="view">' +
      '<div class="hero"><div class="eyebrow">Projects</div><h1>Every gig carries money, meaning, and risk.</h1></div>' +
      '<div class="list">' + S.projects.map(projectItem).join('') + '</div></section>';
  }

  function projectItem(p) {
    var client = getClient(p.clientId);
    var hours = totalHoursForProject(p.id);
    var budgetPct = p.budgetHours ? Math.min(100, Math.round(hours / p.budgetHours * 100)) : 0;
    var budgetClass = 'w' + String(Math.min(100, Math.max(0, Math.ceil(budgetPct / 10) * 10)));
    return '<article class="item">' +
      '<div><div class="item-title">' + statusGlyph(p.status) + ' ' + esc(p.name) + '</div>' +
      '<div class="item-sub">' + esc(client ? client.name : 'Unknown client') + ' · ' + hours.toFixed(1) + 'h logged · ' + esc(p.currency) + ' ' + esc(p.rate) + '/h</div>' +
      '<div class="progress" aria-label="Budget usage"><span class="' + budgetClass + '"></span></div>' + regionPills(p.ikigaiRegions) + '</div>' +
      '<div class="amount">' + budgetPct + '%<br><span class="meta">budget</span></div></article>';
  }

  function renderTime() {
    var proposed = S.timeEntries.filter(function (t) { return !t.confirmed; });
    var confirmed = S.timeEntries.filter(function (t) { return t.confirmed; }).slice(-8).reverse();
    return '<section class="view">' +
      '<div class="hero"><div class="eyebrow">Timesheet auto-capture</div><h1>Paste chaos. Confirm clean time.</h1>' +
      '<p class="lead">This demo uses fictional calendar capture already staged in local state.</p></div>' +
      '<div class="section"><h2>Capture input</h2><textarea readonly>Mon 10:00 Nguyen highlights polish\nTue 14:00 Kindred revisions from client feedback\nWed 09:30 Ferretti interview session</textarea>' +
      '<div class="btn-row"><button class="btn btn-primary" data-action="confirm-all" type="button">Confirm proposed entries</button><button class="btn" data-action="reset-state" type="button">Reset demo data</button></div></div>' +
      '<div class="section"><h2>AI proposal</h2><div class="list">' + (proposed.length ? proposed.map(timeItem).join('') : empty('No pending capture blocks', 'Everything proposed has been confirmed.')) + '</div></div>' +
      '<div class="section"><h2>Recent confirmed time</h2><div class="list">' + confirmed.map(timeItem).join('') + '</div></div>' +
      '<div class="section">' + triad('capture') + '</div>' +
      '</section>';
  }

  function timeItem(t) {
    var project = getProject(t.projectId);
    return '<article class="item">' +
      '<div><div class="item-title">' + esc(t.description) + '</div><div class="item-sub">' + esc(project ? project.name : 'Unassigned') + ' · ' + dateLabel(t.date) + ' · ' + esc(t.source) + '</div>' + regionPills(t.ikigaiRegions) + '</div>' +
      '<div class="amount">' + t.hours.toFixed(1) + 'h<br><span class="meta">' + (t.confirmed ? 'confirmed' : 'proposed') + '</span></div></article>';
  }

  function renderInvoices() {
    return '<section class="view">' +
      '<div class="hero"><div class="eyebrow">Invoice and chase</div><h1>Draft the money bit before the dread arrives.</h1></div>' +
      '<div class="section"><div class="btn-row"><button class="btn btn-primary" data-action="draft-invoice" type="button">Draft Kindred invoice</button><button class="btn" data-action="open-chase" type="button">Preview chase sequence</button></div></div>' +
      '<div class="section"><h2>Invoices</h2><div class="list">' + S.invoices.slice().reverse().map(invoiceItem).join('') + '</div></div>' +
      '<div class="section">' + triad('invoice') + '</div></section>';
  }

  function invoiceItem(inv) {
    var client = getClient(inv.clientId);
    var aud = inv.currency === 'AUD' ? '' : '<div class="meta">→ ' + fmtCurrency(toAUD(inv.total, inv.currency), 'AUD') + '</div>';
    return '<article class="item">' +
      '<div><div class="item-title">' + statusGlyph(inv.status) + ' ' + esc(inv.invoiceNumber) + '</div>' +
      '<div class="item-sub">' + esc(client ? client.name : 'Unknown client') + ' · due ' + dateLabel(inv.dueDate) + ' · ' + esc(inv.status) + '</div></div>' +
      '<div class="amount">' + fmtCurrency(inv.total, inv.currency) + aud + '</div></article>';
  }

  function renderMirror() {
    var rollup = ikigaiRollup();
    var projectCards = S.projects.map(projectProfit).sort(function (a, b) { return b.effective - a.effective; });
    return '<section class="view">' +
      '<div class="hero"><div class="eyebrow">Profit mirror</div><h1>Find the gigs that pay, and the ones that pretend.</h1></div>' +
      '<div class="grid kpis">' +
      kpi('Love', rollup.axes.love.toFixed(1) + 'h', 'Work that keeps Benny in it') +
      kpi('Good at', rollup.axes.good_at.toFixed(1) + 'h', 'Craft and repeatability') +
      kpi('World needs', rollup.axes.world_needs.toFixed(1) + 'h', 'Useful work, not just busy work') +
      kpi('Paid for', rollup.axes.paid_for.toFixed(1) + 'h', 'Commercial gravity') +
      '</div>' +
      '<div class="section"><h2>Effective project return</h2><div class="list">' + projectCards.map(profitItem).join('') + '</div></div>' +
      '<div class="section">' + triad('mirror') + '</div></section>';
  }

  function projectProfit(p) {
    var hours = totalHoursForProject(p.id);
    var revenue = totalRevenueForProject(p.id);
    var expenses = getExpensesForProject(p.id).reduce(function (a, e) { return a + toAUD(e.amount, e.currency); }, 0);
    var effective = hours ? (revenue - expenses) / hours : 0;
    return { project: p, hours: hours, revenue: revenue, expenses: expenses, effective: effective };
  }

  function profitItem(row) {
    var tone = row.effective >= 180 ? 'card-olive' : row.effective < 80 ? 'card-ember' : 'card-brass';
    return '<article class="item ' + tone + '">' +
      '<div><div class="item-title">' + esc(row.project.name) + '</div><div class="item-sub">' + fmtCurrency(row.revenue, 'AUD') + ' paid less ' + fmtCurrency(row.expenses, 'AUD') + ' expenses · ' + row.hours.toFixed(1) + 'h</div>' + regionPills(row.project.ikigaiRegions) + '</div>' +
      '<div class="amount">' + fmtCurrency(row.effective, 'AUD') + '<br><span class="meta">effective / h</span></div></article>';
  }

  function renderMore() {
    var recurring = detectRecurring().slice(0, 4);
    return '<section class="view">' +
      '<div class="hero"><div class="eyebrow">More</div><h1>Local controls for a fictional studio.</h1></div>' +
      '<div class="grid two">' +
      '<article class="card card-accent"><h2>Receipt store</h2><p class="kpi-sub">Blob evidence goes into IndexedDB. Metadata stays in localStorage.</p><div class="btn-row"><button class="btn btn-primary" data-action="store-demo-receipt" type="button">Store demo receipt</button><button class="btn" data-action="pick-receipt" type="button">Choose receipt file</button></div></article>' +
      '<article class="card card-brass"><h2>Security posture</h2><p class="kpi-sub">No backend, no auth, no real customer data, no external scripts, strict CSP. Phase 0.5 stays fictional.</p><button class="btn" data-action="open-security" type="button">View gates</button></article>' +
      '</div>' +
      '<div class="section"><h2>Recurring deductions</h2><div class="list">' + recurring.map(function (r) {
        return '<article class="item"><div><div class="item-title">' + esc(r.description) + '</div><div class="item-sub">' + esc(r.category) + ' · ' + r.count + ' seen · deductible ' + (r.isDeductible ? 'yes' : 'no') + '</div></div><div class="amount">' + fmtCurrency(r.annualEstimate, 'AUD') + '<br><span class="meta">annual est.</span></div></article>';
      }).join('') + '</div></div></section>';
  }

  function empty(title, body) {
    return '<article class="card"><h3>' + esc(title) + '</h3><p class="kpi-sub">' + esc(body) + '</p></article>';
  }

  function bindViewActions() {
    $all('[data-go]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        go(btn.getAttribute('data-go'));
      });
    });

    $all('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        handleAction(btn.getAttribute('data-action'));
      });
    });
  }

  function handleAction(action) {
    if (action === 'open-buddy') return openBuddy();
    if (action === 'confirm-all') return confirmAll();
    if (action === 'reset-state') return resetDemo();
    if (action === 'draft-invoice') return draftInvoice();
    if (action === 'open-chase') return openChase();
    if (action === 'store-demo-receipt') return storeDemoReceipt();
    if (action === 'pick-receipt') return els.receiptInput.click();
    if (action === 'open-security') return openSecurity();
  }

  function go(view) {
    currentView = routeViews[view] || 'home';
    if (window.history && window.history.pushState) {
      window.history.pushState({ view: currentView }, '', viewPath(currentView));
    }
    render();
  }

  function updateNav() {
    $all('.nav-btn').forEach(function (btn) {
      var active = btn.getAttribute('data-view') === currentView;
      btn.classList.toggle('active', active);
      if (active) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
  }

  function updateBadge() {
    var active = S.projects.filter(function (p) { return p.status === 'active'; }).length;
    els.scopeBadge.textContent = scope === 'all' ? active + ' ACTIVE' : scope.toUpperCase();
  }

  function confirmAll() {
    var count = 0;
    S.timeEntries.forEach(function (t) {
      if (!t.confirmed) {
        t.confirmed = true;
        count += 1;
      }
    });
    saveState();
    render();
    showToast(count ? count + ' proposed entries confirmed.' : 'Nothing pending.');
  }

  function resetDemo() {
    resetState();
    render();
    showToast('Demo data reset.');
  }

  function draftInvoice() {
    var exists = S.invoices.some(function (i) { return i.invoiceNumber === 'INV-003'; });
    if (exists) {
      showToast('INV-003 already exists.');
      return;
    }
    var project = getProject(2002);
    var client = getClient(project.clientId);
    var entries = getTimeForProject(project.id).filter(function (t) { return t.confirmed; }).slice(-3);
    var lineItems = entries.map(function (t) {
      return {
        description: t.description,
        hours: t.hours,
        rate: project.rate,
        currency: project.currency,
        total: t.hours * project.rate
      };
    });
    var subtotal = lineItems.reduce(function (a, li) { return a + li.total; }, 0);
    var now = new Date();
    var due = new Date(now);
    due.setDate(due.getDate() + 14);
    S.invoices.push({
      id: uid(),
      invoiceNumber: 'INV-003',
      clientId: client.id,
      projectId: project.id,
      lineItems: lineItems,
      subtotal: subtotal,
      gst: 0,
      total: subtotal,
      currency: project.currency,
      status: 'draft',
      issuedDate: now.toISOString().substring(0, 10),
      dueDate: due.toISOString().substring(0, 10),
      paidDate: null,
      chaseSequence: [
        { day: 3, subject: 'Friendly reminder: INV-003 from MoltoBennyMedia', body: 'Hi Priya, just a friendly reminder that INV-003 is due soon.', sent: false },
        { day: 7, subject: 'Following up: INV-003', body: 'Hi Priya, checking in on the expected payment timing for INV-003.', sent: false },
        { day: 14, subject: 'Final notice: INV-003 overdue', body: 'Hi Priya, INV-003 is now overdue. I need to pause new work until this is resolved.', sent: false }
      ],
      coverEmail: 'Hi Priya,\n\nPlease find draft invoice INV-003 for the latest Kindred revisions and colour work.\n\nBest,\nBenny',
      notes: 'Generated locally from confirmed time entries.',
      createdAt: now.toISOString().substring(0, 10)
    });
    saveState();
    render();
    showToast('Draft invoice INV-003 created locally.');
  }

  function openChase() {
    var inv = S.invoices.find(function (i) { return i.invoiceNumber === 'INV-003'; }) || S.invoices.find(function (i) { return i.invoiceNumber === 'INV-002'; });
    var html = '<div class="stack"><p class="kpi-sub">' + esc(inv.coverEmail).replace(/\n/g, '<br>') + '</p>' +
      inv.chaseSequence.map(function (c) {
        return '<article class="card"><div class="kpi-label">Day ' + c.day + '</div><h3>' + esc(c.subject) + '</h3><p class="kpi-sub">' + esc(c.body) + '</p></article>';
      }).join('') + '</div>';
    openSheet('Chase sequence', html);
  }

  function storeDemoReceipt() {
    var id = uid();
    var text = 'MoltoBennyMedia fictional receipt\nVendor: Camera Electronic\nAmount: AUD 129.00\nPurpose: ND filter hire';
    var blob = new Blob([text], { type: 'text/plain' });
    storeReceipt(id, blob).then(function () {
      S.receipts.push({
        id: id,
        expenseId: null,
        filename: 'demo-receipt-' + id + '.txt',
        dataUrl: '',
        capturedAt: new Date().toISOString(),
        ocrText: 'Vendor Camera Electronic. Amount AUD 129.00. ND filter hire.'
      });
      saveState();
      render();
      showToast('Demo receipt blob stored in IndexedDB.');
    }).catch(function () {
      showToast('Receipt store unavailable in this browser.');
    });
  }

  function storePickedReceipt(file) {
    if (!file) return;
    var id = uid();
    storeReceipt(id, file).then(function () {
      S.receipts.push({
        id: id,
        expenseId: null,
        filename: file.name,
        dataUrl: '',
        capturedAt: new Date().toISOString(),
        ocrText: null
      });
      saveState();
      render();
      showToast('Receipt file stored locally.');
    }).catch(function () {
      showToast('Could not store that receipt locally.');
    });
  }

  function openSecurity() {
    openSheet('Security gates',
      '<div class="stack">' +
      '<article class="card card-olive"><h3>Shift left</h3><p class="kpi-sub">CSP lives in the document head, assets are local, and demo state starts fictional.</p></article>' +
      '<article class="card card-accent"><h3>Zero trust</h3><p class="kpi-sub">No auth claims, no backend calls, no external scripts, no real client data.</p></article>' +
      '<article class="card card-brass"><h3>Defense in depth</h3><p class="kpi-sub">PWA cache skips API/auth paths. Receipt blobs sit in IndexedDB, not serialized into app state.</p></article>' +
      '</div>');
  }

  function openSheet(title, body) {
    els.sheetTitle.textContent = title;
    els.sheetBody.innerHTML = body;
    els.sheet.classList.add('open');
    els.sheetOverlay.classList.add('open');
    els.sheet.setAttribute('aria-hidden', 'false');
    els.sheetOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeSheet() {
    els.sheet.classList.remove('open');
    els.sheetOverlay.classList.remove('open');
    els.sheet.setAttribute('aria-hidden', 'true');
    els.sheetOverlay.setAttribute('aria-hidden', 'true');
  }

  function openBuddy() {
    els.buddy.classList.add('open');
    els.fab.setAttribute('aria-expanded', 'true');
    els.buddy.setAttribute('aria-hidden', 'false');
  }

  function closeBuddy() {
    els.buddy.classList.remove('open');
    els.fab.setAttribute('aria-expanded', 'false');
    els.buddy.setAttribute('aria-hidden', 'true');
  }

  function renderBuddy() {
    var quick = quickList();
    els.buddyQuick.innerHTML = quick.map(function (q) {
      return '<button class="chip" data-quick-key="' + esc(q.key) + '" data-quick-label="' + esc(q.label) + '" type="button">' + esc(q.label) + '</button>';
    }).join('');
    if (!els.buddyMsgs.childElementCount) {
      AI_SCRIPTED.welcome.forEach(function (m) { addMessage(m, 'ai'); });
    }
    $all('[data-quick-key]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        askBuddy(btn.getAttribute('data-quick-label'), btn.getAttribute('data-quick-key'));
      });
    });
  }

  function quickList() {
    if (Array.isArray(AI_SCRIPTED.quick)) {
      return AI_SCRIPTED.quick.map(function (label) { return { label: label, key: label }; });
    }
    return (AI_SCRIPTED.quick && (AI_SCRIPTED.quick[currentView] || AI_SCRIPTED.quick.home)) || [];
  }

  function askBuddy(text, key) {
    if (!text) return;
    addMessage(text, 'user');
    var response = AI_SCRIPTED.responses[key || text] || AI_SCRIPTED.responses.fallback;
    addMessage(response.title + ': ' + response.body, 'ai');
    els.buddyInput.value = '';
  }

  function addMessage(text, who) {
    var msg = document.createElement('div');
    msg.className = 'msg' + (who === 'user' ? ' user' : '');
    msg.textContent = text;
    els.buddyMsgs.appendChild(msg);
    els.buddyMsgs.scrollTop = els.buddyMsgs.scrollHeight;
  }

  function bindGlobal() {
    $all('.nav-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { go(btn.getAttribute('data-view')); });
    });

    $all('#buddyScope .chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        scope = btn.getAttribute('data-scope');
        $all('#buddyScope .chip').forEach(function (b) {
          var active = b === btn;
          b.classList.toggle('active', active);
          b.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        updateBadge();
      });
    });

    els.fab.addEventListener('click', function () {
      if (els.buddy.classList.contains('open')) closeBuddy();
      else openBuddy();
    });
    els.buddySend.addEventListener('click', function () { askBuddy(els.buddyInput.value.trim()); });
    els.buddyInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        askBuddy(els.buddyInput.value.trim());
      }
    });
    els.sheetOverlay.addEventListener('click', closeSheet);
    els.receiptInput.addEventListener('change', function () { storePickedReceipt(els.receiptInput.files[0]); });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      closeSheet();
      closeBuddy();
    });
  }

  function showToast(text) {
    clearTimeout(toastTimer);
    els.toast.textContent = text;
    els.toast.classList.add('open');
    toastTimer = setTimeout(function () { els.toast.classList.remove('open'); }, 2600);
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('./sw.js').catch(function () {
      showToast('PWA cache registration skipped.');
    });
  }

  function init() {
    els.main = $('#mc');
    els.scopeBadge = $('#scopeBadge');
    els.fab = $('#fabBuddy');
    els.buddy = $('#buddyPanel');
    els.buddyQuick = $('#buddyQuick');
    els.buddyMsgs = $('#buddyMsgs');
    els.buddyInput = $('#buddyInput');
    els.buddySend = $('#buddySend');
    els.sheet = $('#sheet');
    els.sheetOverlay = $('#sheetOverlay');
    els.sheetTitle = $('#sheetTitle');
    els.sheetBody = $('#sheetBody');
    els.toast = $('#toast');
    els.receiptInput = $('#receiptInput');
    bindGlobal();
    render();

    window.addEventListener('popstate', function () {
      currentView = initialViewFromLocation();
      render();
    });
    registerSW();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
