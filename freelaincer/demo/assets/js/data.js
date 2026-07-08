/* freelAIncer — mock data layer (Phase 0.5)
 * localStorage namespace: freelaincer_v0
 * Receipt blobs: IndexedDB database freelaincer_receipts_v0
 */

var SK = 'freelaincer_v0';
var S;

function uid() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function loadState() {
  try {
    var raw = localStorage.getItem(SK);
    if (raw) {
      var d = JSON.parse(raw);
      var def = defaultState();
      var keys = Object.keys(def);
      for (var i = 0; i < keys.length; i++) {
        if (!(keys[i] in d)) d[keys[i]] = def[keys[i]];
      }
      return d;
    }
  } catch (e) { /* parse or quota error */ }
  return null;
}

function saveState() {
  try { localStorage.setItem(SK, JSON.stringify(S)); } catch (e) { /* silent */ }
}

function resetState() {
  localStorage.removeItem(SK);
  S = defaultState();
  saveState();
}

function fmtCurrency(n, currency) {
  var code = currency || S.settings.homeCurrency;
  var sym = { AUD: 'A$', USD: 'US$', EUR: '€', GBP: '£' };
  var prefix = sym[code] || code + ' ';
  var sign = n < 0 ? '-' : '';
  return sign + prefix + Math.abs(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtShort(n) {
  if (Math.abs(n) >= 1000) return '$' + (n / 1000).toFixed(Math.abs(n) >= 10000 ? 0 : 1) + 'k';
  return '$' + n.toFixed(0);
}

function toAUD(amount, currency) {
  if (!currency || currency === 'AUD') return amount;
  var rate = S.fxRates[currency + '_AUD'];
  return rate ? amount * rate : amount;
}

function getClient(id) { return S.clients.find(function(c) { return c.id === id; }); }
function getProject(id) { return S.projects.find(function(p) { return p.id === id; }); }
function getProjectsForClient(cid) { return S.projects.filter(function(p) { return p.clientId === cid; }); }
function getTimeForProject(pid) { return S.timeEntries.filter(function(t) { return t.projectId === pid; }); }
function getExpensesForProject(pid) { return S.expenses.filter(function(e) { return e.projectId === pid; }); }
function getInvoicesForProject(pid) { return S.invoices.filter(function(i) { return i.projectId === pid; }); }
function getInvoicesForClient(cid) { return S.invoices.filter(function(i) { return i.clientId === cid; }); }

function totalHoursForProject(pid) {
  return getTimeForProject(pid).reduce(function(a, t) { return a + t.hours; }, 0);
}

function totalRevenueForProject(pid) {
  return getInvoicesForProject(pid).reduce(function(a, i) {
    return i.status === 'paid' ? a + toAUD(i.total, i.currency) : a;
  }, 0);
}

function calcTax(grossIncome) {
  var tax = 0;
  if (grossIncome <= 18200) tax = 0;
  else if (grossIncome <= 45000) tax = (grossIncome - 18200) * 0.16;
  else if (grossIncome <= 135000) tax = 4288 + (grossIncome - 45000) * 0.30;
  else if (grossIncome <= 190000) tax = 31288 + (grossIncome - 135000) * 0.37;
  else tax = 51638 + (grossIncome - 190000) * 0.45;

  var lito = grossIncome <= 37500 ? 700
    : grossIncome <= 45000 ? 700 - ((grossIncome - 37500) * 0.05)
    : grossIncome <= 66667 ? 325 - ((grossIncome - 45000) * 0.015)
    : 0;

  var medicare = grossIncome > 26000 ? grossIncome * 0.02 : 0;
  var totalTax = Math.max(0, tax - lito) + medicare;

  return {
    incomeTax: Math.max(0, tax - lito),
    medicare: medicare,
    total: totalTax,
    effectiveRate: grossIncome > 0 ? (totalTax / grossIncome * 100) : 0
  };
}

function taxBrackets(grossIncome) {
  var brackets = [
    { label: 'Tax-free', lower: 0, upper: 18200, rate: 0 },
    { label: '16%', lower: 18200, upper: 45000, rate: 0.16 },
    { label: '30%', lower: 45000, upper: 135000, rate: 0.30 },
    { label: '37%', lower: 135000, upper: 190000, rate: 0.37 },
    { label: '45%', lower: 190000, upper: Infinity, rate: 0.45 }
  ];
  return brackets.map(function(b) {
    var slice = b.upper === Infinity
      ? Math.max(0, grossIncome - b.lower)
      : Math.min(Math.max(0, grossIncome - b.lower), b.upper - b.lower);
    return {
      label: b.label,
      lower: b.lower,
      upper: b.upper,
      rate: b.rate,
      slice: slice,
      tax: slice * b.rate,
      pct: grossIncome > 0 ? (slice / grossIncome * 100) : 0
    };
  });
}

function annualiseIncome() {
  var now = new Date();
  var fyStart = now.getMonth() >= 6
    ? new Date(now.getFullYear(), 6, 1)
    : new Date(now.getFullYear() - 1, 6, 1);
  var msElapsed = now - fyStart;
  var monthsElapsed = Math.max(1, msElapsed / (1000 * 60 * 60 * 24 * 30.44));

  var ytdIncome = S.invoices.reduce(function(a, inv) {
    if (inv.status !== 'paid') return a;
    if (new Date(inv.paidDate) < fyStart) return a;
    return a + toAUD(inv.total, inv.currency);
  }, 0);

  return ytdIncome / monthsElapsed * 12;
}

function detectRecurring() {
  var groups = {};
  S.expenses.forEach(function(e) {
    var key = e.description.toLowerCase().replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, '').trim().substring(0, 28);
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });
  return Object.keys(groups).filter(function(k) {
    return groups[k].length >= 2 || groups[k][0].isRecurring;
  }).map(function(k) {
    var items = groups[k];
    var avg = items.reduce(function(a, e) { return a + e.amount; }, 0) / items.length;
    return {
      description: items[0].description,
      count: items.length,
      avgAmount: avg,
      category: items[0].category,
      isDeductible: items[0].isDeductible,
      annualEstimate: avg * 12
    };
  }).sort(function(a, b) { return b.annualEstimate - a.annualEstimate; });
}

function ikigaiRollup(period) {
  var entries = S.timeEntries.filter(function(t) { return t.confirmed; });
  if (period === 'month') {
    var now = new Date();
    var monthStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    entries = entries.filter(function(t) { return t.date.substring(0, 7) === monthStr; });
  }

  var axes = { love: 0, good_at: 0, world_needs: 0, paid_for: 0 };
  var revenue = { love: 0, good_at: 0, world_needs: 0, paid_for: 0 };
  var axisKeys = Object.keys(axes);

  entries.forEach(function(entry) {
    var regions = entry.ikigaiRegions;
    if (!regions || !regions.length) {
      var proj = getProject(entry.projectId);
      if (proj) regions = proj.ikigaiRegions;
    }
    if (!regions) return;
    regions.forEach(function(r) {
      if (r in axes) axes[r] += entry.hours;
    });
  });

  S.invoices.forEach(function(inv) {
    if (inv.status !== 'paid') return;
    var proj = inv.projectId ? getProject(inv.projectId) : null;
    if (!proj || !proj.ikigaiRegions) return;
    var relevantRegions = proj.ikigaiRegions.filter(function(r) { return r in revenue; });
    if (!relevantRegions.length) return;
    var share = toAUD(inv.total, inv.currency) / relevantRegions.length;
    relevantRegions.forEach(function(r) { revenue[r] += share; });
  });

  var totalHours = axisKeys.reduce(function(a, k) { return a + axes[k]; }, 0);
  var gaps = [];

  if (totalHours > 0) {
    if (axes.paid_for > 0 && axes.love === 0) {
      gaps.push({ type: 'profession_no_love', message: 'This gig pays well but doesn\'t feed your soul.' });
    }
    if (axes.love > 0 && axes.paid_for === 0) {
      gaps.push({ type: 'passion_no_pay', message: 'Passion project — beautiful, but watch the clock.' });
    }
    if (axes.good_at > 0 && axes.world_needs === 0) {
      gaps.push({ type: 'skill_no_need', message: 'Is there a market for this?' });
    }
    var maxAxis = Math.max.apply(null, axisKeys.map(function(k) { return axes[k]; }));
    if (maxAxis / totalHours > 0.6) {
      gaps.push({ type: 'imbalance', message: 'Over 60% of your time is in one axis. Consider rebalancing.' });
    }
  }

  var intersections = {
    passion: axes.love > 0 && axes.good_at > 0,
    mission: axes.love > 0 && axes.world_needs > 0,
    profession: axes.good_at > 0 && axes.paid_for > 0,
    vocation: axes.world_needs > 0 && axes.paid_for > 0
  };
  intersections.centre = intersections.passion && intersections.mission &&
    intersections.profession && intersections.vocation;

  return { axes: axes, revenue: revenue, totalHours: totalHours, intersections: intersections, gaps: gaps };
}

// IndexedDB for receipt blobs
var IDB_NAME = 'freelaincer_receipts_v0';
var IDB_STORE = 'blobs';

function openReceiptDB() {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = function(e) {
      e.target.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = function(e) { resolve(e.target.result); };
    req.onerror = function(e) { reject(e.target.error); };
  });
}

function storeReceipt(id, blob) {
  return openReceiptDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(blob, id);
      tx.oncomplete = function() { resolve(); };
      tx.onerror = function(e) { reject(e.target.error); };
    });
  });
}

function getReceiptBlob(id) {
  return openReceiptDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(IDB_STORE, 'readonly');
      var req = tx.objectStore(IDB_STORE).get(id);
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function(e) { reject(e.target.error); };
    });
  });
}

// Default state with mock data
function defaultState() {
  var now = new Date();

  function d(offset) {
    var dt = new Date(now);
    dt.setDate(dt.getDate() + offset);
    return dt.toISOString().substring(0, 10);
  }

  return {
    settings: {
      userName: 'Benny Ferraro',
      businessName: 'MoltoBennyMedia',
      businessEmail: 'marco@moltobennymedia.com',
      abn: '12 345 678 901',
      homeCurrency: 'AUD',
      taxYear: '2025-26',
      bankBsb: '063-001',
      bankAccount: '1234 5678',
      bankName: 'Commonwealth Bank'
    },

    fxRates: {
      USD_AUD: 1.54,
      EUR_AUD: 1.68,
      GBP_AUD: 1.95,
      ratesDate: '2026-05-01'
    },

    clients: [
      {
        id: 1001, name: 'Sara & Tom Nguyen', email: 'sara.nguyen@email.com.au',
        company: '', phone: '0412 345 678', address: '42 Chapel St, Windsor VIC 3181',
        currency: 'AUD', defaultRate: 150,
        notes: 'Wedding couple. Ceremony at Yarra Valley, reception at Zonzo Estate.',
        ikigaiRegions: ['love', 'good_at', 'paid_for', 'passion'],
        createdAt: d(-45)
      },
      {
        id: 1002, name: 'Priya Sharma', email: 'priya@kindredstudio.co',
        company: 'Kindred Studio', phone: '+1 415 555 0123',
        address: '580 Howard St, San Francisco CA 94105',
        currency: 'USD', defaultRate: 200,
        notes: 'Brand agency. Quarterly content packages. Pays in USD.',
        ikigaiRegions: ['good_at', 'paid_for', 'profession'],
        createdAt: d(-90)
      },
      {
        id: 1003, name: 'Luca Ferretti', email: 'luca@ferrettifamily.it',
        company: 'Ferretti Famiglia', phone: '+39 02 1234 5678',
        address: 'Via Montenapoleone 8, Milano',
        currency: 'EUR', defaultRate: 180,
        notes: 'Italian-Australian family. Wedding video for overseas relatives. EUR billing.',
        ikigaiRegions: ['love', 'world_needs', 'mission'],
        createdAt: d(-30)
      },
      {
        id: 1004, name: 'James Whitfield', email: 'james@televisual.co.uk',
        company: 'Televisual London', phone: '+44 20 7946 0958',
        address: '10 Soho Square, London W1D 3QD',
        currency: 'GBP', defaultRate: 250,
        notes: 'Corporate TVC overflow. GBP billing. High-rate, tight deadlines.',
        ikigaiRegions: ['good_at', 'paid_for', 'profession'],
        createdAt: d(-60)
      }
    ],

    projects: [
      {
        id: 2001, clientId: 1001, name: 'Nguyen Wedding Film',
        description: 'Full-day wedding coverage. Highlights reel + full ceremony edit + social cuts.',
        status: 'active', rate: 150, currency: 'AUD', budgetHours: 40,
        ikigaiRegions: ['love', 'good_at', 'paid_for', 'passion'],
        tags: ['wedding', 'film'], startDate: d(-14), endDate: null, createdAt: d(-14)
      },
      {
        id: 2002, clientId: 1002, name: 'Kindred Q2 Brand Content',
        description: 'Quarterly brand content: 6 social reels, 2 hero videos, BTS photography.',
        status: 'active', rate: 200, currency: 'USD', budgetHours: 60,
        ikigaiRegions: ['good_at', 'paid_for', 'profession'],
        tags: ['brand', 'content', 'social'], startDate: d(-30), endDate: d(30), createdAt: d(-30)
      },
      {
        id: 2003, clientId: 1003, name: 'Ferretti Family Documentary',
        description: 'Short documentary celebrating 50 years of the Ferretti family in Australia. Gift piece for nonna.',
        status: 'active', rate: 180, currency: 'EUR', budgetHours: 25,
        ikigaiRegions: ['love', 'world_needs', 'mission'],
        tags: ['documentary', 'family', 'passion-project'], startDate: d(-10), endDate: null, createdAt: d(-10)
      },
      {
        id: 2004, clientId: 1004, name: 'Televisual TVC Overflow',
        description: 'Grade and conform for 3x 30sec TVCs. Tight turnaround.',
        status: 'complete', rate: 250, currency: 'GBP', budgetHours: 15,
        ikigaiRegions: ['good_at', 'paid_for', 'profession'],
        tags: ['tvc', 'grading', 'corporate'], startDate: d(-45), endDate: d(-20), createdAt: d(-45)
      }
    ],

    deliverables: [
      { id: 3001, projectId: 2001, name: 'Highlights reel (4 min)', status: 'in_progress', ikigaiRegions: ['love', 'good_at'], dueDate: d(7), completedAt: null, createdAt: d(-7) },
      { id: 3002, projectId: 2001, name: 'Full ceremony edit', status: 'pending', ikigaiRegions: ['good_at'], dueDate: d(14), completedAt: null, createdAt: d(-7) },
      { id: 3003, projectId: 2001, name: 'Social cuts (3x 60sec)', status: 'pending', ikigaiRegions: ['good_at', 'paid_for'], dueDate: d(10), completedAt: null, createdAt: d(-7) },
      { id: 3004, projectId: 2002, name: 'Social reels batch 1 (3x)', status: 'complete', ikigaiRegions: ['good_at', 'paid_for'], dueDate: d(-5), completedAt: d(-6), createdAt: d(-20) },
      { id: 3005, projectId: 2002, name: 'Hero video 1 — product launch', status: 'in_progress', ikigaiRegions: ['good_at'], dueDate: d(5), completedAt: null, createdAt: d(-15) },
      { id: 3006, projectId: 2003, name: 'Interview footage assembly', status: 'in_progress', ikigaiRegions: ['love', 'world_needs'], dueDate: d(20), completedAt: null, createdAt: d(-5) },
      { id: 3007, projectId: 2004, name: 'TVC grade + conform (3x)', status: 'complete', ikigaiRegions: ['good_at'], dueDate: d(-22), completedAt: d(-23), createdAt: d(-40) }
    ],

    timeEntries: [
      { id: 4001, projectId: 2001, deliverableId: 3001, date: d(-7), hours: 6, description: 'Rough assembly of ceremony footage', ikigaiRegions: ['love', 'good_at'], source: 'manual', confirmed: true, createdAt: d(-7) },
      { id: 4002, projectId: 2001, deliverableId: 3001, date: d(-6), hours: 4.5, description: 'Colour grading ceremony selects', ikigaiRegions: ['love', 'good_at'], source: 'manual', confirmed: true, createdAt: d(-6) },
      { id: 4003, projectId: 2001, deliverableId: 3001, date: d(-5), hours: 3, description: 'Audio sync and music selection', ikigaiRegions: ['love'], source: 'manual', confirmed: true, createdAt: d(-5) },
      { id: 4004, projectId: 2002, deliverableId: 3004, date: d(-10), hours: 5, description: 'Social reel edits batch 1', ikigaiRegions: ['good_at', 'paid_for'], source: 'manual', confirmed: true, createdAt: d(-10) },
      { id: 4005, projectId: 2002, deliverableId: 3004, date: d(-9), hours: 3, description: 'Revisions on reel 2', ikigaiRegions: ['good_at'], source: 'manual', confirmed: true, createdAt: d(-9) },
      { id: 4006, projectId: 2002, deliverableId: 3005, date: d(-4), hours: 7, description: 'Hero video shoot day', ikigaiRegions: ['good_at', 'paid_for'], source: 'calendar', confirmed: true, createdAt: d(-4) },
      { id: 4007, projectId: 2002, deliverableId: 3005, date: d(-3), hours: 4, description: 'Hero video rough cut', ikigaiRegions: ['good_at'], source: 'manual', confirmed: true, createdAt: d(-3) },
      { id: 4008, projectId: 2003, deliverableId: 3006, date: d(-3), hours: 3, description: 'Interview with Nonna Maria — kitchen stories', ikigaiRegions: ['love', 'world_needs'], source: 'manual', confirmed: true, createdAt: d(-3) },
      { id: 4009, projectId: 2003, deliverableId: 3006, date: d(-2), hours: 2.5, description: 'Archival photo scanning and digitisation', ikigaiRegions: ['love', 'world_needs'], source: 'manual', confirmed: true, createdAt: d(-2) },
      { id: 4010, projectId: 2004, deliverableId: 3007, date: d(-30), hours: 5, description: 'TVC 1 grade session', ikigaiRegions: ['good_at'], source: 'manual', confirmed: true, createdAt: d(-30) },
      { id: 4011, projectId: 2004, deliverableId: 3007, date: d(-29), hours: 5, description: 'TVC 2 + 3 grade session', ikigaiRegions: ['good_at'], source: 'manual', confirmed: true, createdAt: d(-29) },
      { id: 4012, projectId: 2004, deliverableId: 3007, date: d(-28), hours: 3, description: 'Conform and delivery', ikigaiRegions: ['good_at', 'paid_for'], source: 'manual', confirmed: true, createdAt: d(-28) },
      { id: 4013, projectId: 2001, deliverableId: 3001, date: d(-1), hours: 5, description: 'Fine cut — highlights reel v2', ikigaiRegions: ['love', 'good_at'], source: 'manual', confirmed: true, createdAt: d(-1) },
      { id: 4014, projectId: 2002, deliverableId: 3005, date: d(-1), hours: 3, description: 'Product launch video colour grade', ikigaiRegions: ['good_at', 'paid_for'], source: 'manual', confirmed: true, createdAt: d(-1) },
      { id: 4015, projectId: 2001, deliverableId: 3001, date: d(0), hours: 2, description: 'Client review prep — export preview', ikigaiRegions: ['good_at'], source: 'manual', confirmed: true, createdAt: d(0) },
      { id: 4050, projectId: 2001, deliverableId: null, date: d(1), hours: 4, description: 'Wedding highlights final polish', ikigaiRegions: ['love', 'good_at'], source: 'capture', confirmed: false, createdAt: d(0) },
      { id: 4051, projectId: 2002, deliverableId: 3005, date: d(1), hours: 3, description: 'Hero video revisions from client feedback', ikigaiRegions: ['good_at', 'paid_for'], source: 'capture', confirmed: false, createdAt: d(0) },
      { id: 4052, projectId: 2003, deliverableId: 3006, date: d(2), hours: 5, description: 'Second interview session — cousin Paolo', ikigaiRegions: ['love', 'world_needs'], source: 'capture', confirmed: false, createdAt: d(0) }
    ],

    expenses: [
      { id: 5001, projectId: null, date: d(-60), amount: 4999, currency: 'AUD', category: 'equipment', description: 'Sony A7IV camera body', vendor: 'Camera Electronic', receiptId: null, isDeductible: true, isRecurring: false, tags: ['gear'], createdAt: d(-60) },
      { id: 5002, projectId: null, date: d(-15), amount: 52.99, currency: 'AUD', category: 'subscriptions', description: 'Adobe Creative Cloud', vendor: 'Adobe', receiptId: null, isDeductible: true, isRecurring: true, tags: ['software'], createdAt: d(-15) },
      { id: 5003, projectId: null, date: d(-15), amount: 14.99, currency: 'AUD', category: 'subscriptions', description: 'Frame.io Pro', vendor: 'Frame.io', receiptId: null, isDeductible: true, isRecurring: true, tags: ['software', 'collaboration'], createdAt: d(-15) },
      { id: 5004, projectId: 2001, date: d(-14), amount: 85, currency: 'AUD', category: 'travel', description: 'Fuel — Yarra Valley shoot day', vendor: 'BP', receiptId: null, isDeductible: true, isRecurring: false, tags: ['travel'], createdAt: d(-14) },
      { id: 5005, projectId: 2001, date: d(-14), amount: 35, currency: 'AUD', category: 'meals', description: 'Lunch on shoot day', vendor: 'Zonzo Estate Cafe', receiptId: null, isDeductible: true, isRecurring: false, tags: ['meals'], createdAt: d(-14) },
      { id: 5006, projectId: null, date: d(-8), amount: 189, currency: 'AUD', category: 'insurance', description: 'Public liability insurance — monthly', vendor: 'BizCover', receiptId: null, isDeductible: true, isRecurring: true, tags: ['insurance'], createdAt: d(-8) },
      { id: 5007, projectId: 2002, date: d(-4), amount: 120, currency: 'AUD', category: 'travel', description: 'Parking — product launch shoot', vendor: 'Wilson Parking', receiptId: null, isDeductible: true, isRecurring: false, tags: ['travel'], createdAt: d(-4) },
      { id: 5008, projectId: null, date: d(-1), amount: 29.99, currency: 'AUD', category: 'subscriptions', description: 'Epidemic Sound music licence', vendor: 'Epidemic Sound', receiptId: null, isDeductible: true, isRecurring: true, tags: ['software', 'music'], createdAt: d(-1) }
    ],

    receipts: [],

    invoices: [
      {
        id: 6001, invoiceNumber: 'INV-001', clientId: 1004, projectId: 2004,
        lineItems: [
          { description: 'TVC grade + conform (3x 30sec spots)', hours: 13, rate: 250, currency: 'GBP', total: 3250 }
        ],
        subtotal: 3250, gst: 0, total: 3250, currency: 'GBP',
        status: 'paid', issuedDate: d(-25), dueDate: d(-11), paidDate: d(-8),
        chaseSequence: [],
        coverEmail: 'Hi James,\n\nPlease find attached invoice INV-001 for the TVC grade and conform work completed last week.\n\nAll three spots have been delivered to your Aspera inbox. Let me know if you need any tweaks.\n\nCheers,\nBenny',
        notes: '', createdAt: d(-25)
      },
      {
        id: 6002, invoiceNumber: 'INV-002', clientId: 1002, projectId: 2002,
        lineItems: [
          { description: 'Social reels batch 1 (3x 60sec)', hours: 8, rate: 200, currency: 'USD', total: 1600 },
          { description: 'Hero video shoot day', hours: 7, rate: 200, currency: 'USD', total: 1400 },
          { description: 'Hero video rough cut', hours: 4, rate: 200, currency: 'USD', total: 800 }
        ],
        subtotal: 3800, gst: 0, total: 3800, currency: 'USD',
        status: 'sent', issuedDate: d(-2), dueDate: d(12), paidDate: null,
        chaseSequence: [
          { day: 3, subject: 'Friendly reminder: INV-002 from MoltoBennyMedia', body: 'Hi Priya,\n\nJust a gentle nudge that invoice INV-002 for $3,800 USD is coming up on its due date.\n\nHappy to jump on a call if there are any questions about the line items.\n\nBest,\nBenny', sent: false },
          { day: 7, subject: 'Following up: INV-002 ($3,800 USD)', body: 'Hi Priya,\n\nWanted to follow up on invoice INV-002. The total is $3,800 USD.\n\nCould you let me know the expected payment timeline?\n\nThanks,\nBenny', sent: false },
          { day: 14, subject: 'Final notice: INV-002 now overdue', body: 'Hi Priya,\n\nInvoice INV-002 for $3,800 USD is now 14 days past due. I need to pause any further deliverables until this is resolved.\n\nPlease process payment at your earliest convenience or let me know if there is an issue.\n\nRegards,\nBenny', sent: false }
        ],
        coverEmail: 'Hi Priya,\n\nPlease find invoice INV-002 covering the Q2 content work completed so far — social reels batch 1 and the hero video production.\n\nPayment details on the invoice. Net 14 as per our agreement.\n\nLooking forward to wrapping up the remaining deliverables!\n\nBest,\nBenny',
        notes: 'Net 14 terms', createdAt: d(-2)
      }
    ],

    contracts: [
      {
        id: 7001, clientId: 1002, projectId: 2002,
        title: 'SOW — Kindred Studio Q2 Brand Content Package',
        status: 'signed', createdAt: d(-35)
      }
    ],

    ikigaiProfile: {
      love: ['storytelling', 'colour grading', 'documentary', 'Italian family heritage', 'finding the moment'],
      good_at: ['Premiere Pro', 'DaVinci Resolve', 'camera operation', 'client management', 'fast turnaround'],
      world_needs: ['authentic brand content', 'wedding memories that last', 'family stories preserved', 'honest creative work'],
      paid_for: ['wedding videography', 'brand content packages', 'corporate TVC overflow', 'social media reels']
    }
  };
}

S = loadState() || defaultState();
if (!loadState()) saveState();
