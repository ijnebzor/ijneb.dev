/* freelAIncer — scripted AI responses (Phase 0.5)
 * Shapes mirror real Claude API responses for clean Phase 2 swap.
 */

var AI_SCRIPTED = {
  welcome: [
    'I found 3 unconfirmed time entries from your calendar capture. Confirm them and I will keep invoice drafting honest.',
    'Kindred is in USD. I will keep the source currency visible and show the AUD context beside it.',
    'Your mirror is warning on Televisual: great rate, low love. That is rent money, not identity.'
  ],

  quick: {
    home: [
      { label: 'Summarise today', key: 'daily_briefing' },
      { label: 'Any overdue invoices?', key: 'invoice_overdue' },
      { label: 'Ikigai balance', key: 'ikigai_overview' }
    ],
    time: [
      { label: 'Log from my calendar', key: 'capture_calendar' },
      { label: 'Capture a receipt', key: 'capture_receipt' },
      { label: 'Read a client email', key: 'capture_email' }
    ],
    projects: [
      { label: 'Ikigai gaps', key: 'ikigai_gap' },
      { label: 'Rebalance suggestion', key: 'ikigai_suggestion' }
    ],
    invoices: [
      { label: 'Generate invoice', key: 'invoice_generate' },
      { label: 'Draft cover email', key: 'invoice_cover' },
      { label: 'Draft chase email', key: 'invoice_chase_3' }
    ],
    mirror: [
      { label: 'Ikigai overview', key: 'ikigai_overview' },
      { label: 'Find my gaps', key: 'ikigai_gap' },
      { label: 'Tax estimate', key: 'tax_estimate' },
      { label: 'Deductible scan', key: 'tax_deductible' }
    ]
  },

  responses: {
    daily_briefing: {
      delay: 1200,
      title: 'Today, cleanly',
      body: 'Two billable blocks are ready to confirm: Nguyen final polish (4h) and Kindred colour grade (3h). The Ferretti interview is tomorrow, so do not invoice it yet. INV-002 to Kindred (US$3,800) is outstanding, due in 12 days.',
      triad: {
        creative: 'Today is a good creative day. The wedding reel and documentary prep are both in your love zone.',
        professional: 'Revenue pipeline: A$4,042 unbilled (wedding), US$3,800 outstanding (Kindred). Total exposure: ~A$9,900.',
        ikigai: '60% of today is centre or passion work. That is above your monthly average of 45%.'
      }
    },
    invoice_overdue: {
      delay: 800,
      title: 'Invoice status',
      body: 'No overdue invoices right now. INV-002 to Kindred Studio (US$3,800) is outstanding but not yet due. INV-001 to Televisual London (£3,250) was paid on time.'
    },
    capture_calendar: {
      delay: 1200,
      title: 'Proposed time entries',
      body: 'I found 3 time blocks in your week.',
      actions: [
        { type: 'time_entry', project: 'Nguyen Wedding Film', hours: 4, desc: 'Wedding highlights final polish', confidence: 'high' },
        { type: 'time_entry', project: 'Kindred Q2 Brand Content', hours: 3, desc: 'Hero video revisions from client feedback', confidence: 'high' },
        { type: 'time_entry', project: 'Ferretti Family Documentary', hours: 5, desc: 'Second interview session — cousin Paolo', confidence: 'check' }
      ]
    },
    capture_receipt: {
      delay: 800,
      title: 'Expense captured',
      body: 'Looks like a business expense. I have categorised it and matched it to a project.',
      actions: [
        { type: 'expense', amount: 45, currency: 'AUD', category: 'travel', desc: 'Uber to client meeting', vendor: 'Uber', project: 'Kindred Q2 Brand Content' }
      ]
    },
    capture_email: {
      delay: 1000,
      title: 'Client request parsed',
      body: 'I have read the email from Priya. She is asking for revisions on the hero video and wants 3 additional social cuts.',
      actions: [
        { type: 'deliverable', project: 'Kindred Q2 Brand Content', desc: 'Social reels batch 2 (3x)' },
        { type: 'time_entry', project: 'Kindred Q2 Brand Content', hours: 6, desc: 'Social reels batch 2 — edit + grade', confidence: 'check' }
      ]
    },
    ikigai_overview: {
      delay: 1500,
      title: 'Ikigai balance',
      body: 'Here is your ikigai balance for this month.',
      triad: {
        creative: 'The Ferretti documentary is feeding your soul — storytelling, family, heritage. That is the work that makes you feel alive.',
        professional: 'Revenue is concentrated in profession-only work (Kindred brand content, TVC overflow). Those gigs pay well but do not tick the love box.',
        ikigai: 'Centre coverage is 25% this month, driven by the wedding film. The Ferretti documentary touches love + world_needs but is not generating revenue yet.'
      }
    },
    ikigai_gap: {
      delay: 1200,
      title: 'Ikigai gap',
      body: 'I spotted a gap in your ikigai balance.',
      triad: {
        creative: 'You are spending 40% of your time on work that exercises your skills and pays — but does not light you up.',
        professional: 'Revenue from profession-only work: A$12,185 (annualised). Strong, but concentrated. If Kindred churns, you lose 40% of income.',
        ikigai: 'Profession without passion leads to burnout. Consider pitching creative direction on the Kindred account to shift it toward centre.'
      }
    },
    ikigai_suggestion: {
      delay: 1000,
      title: 'Rebalance suggestion',
      body: 'Here is one way to shift your balance toward centre.',
      triad: {
        creative: 'Pitch Kindred a documentary-style brand film instead of the standard social reels. You would love the work.',
        professional: 'A brand documentary commands 2–3x the rate of social reels. Position it as premium content strategy.',
        ikigai: 'This single move would shift the Kindred work from profession-only to centre — adding love and world_needs.'
      }
    },
    invoice_generate: {
      delay: 1400,
      title: 'Invoice drafted',
      body: 'I have drafted invoice INV-003 from your tracked time on the Nguyen Wedding Film. 24.5 hours at A$150/hr, subtotal A$3,675, plus 10% GST.',
      actions: [
        { type: 'invoice', project: 'Nguyen Wedding Film', subtotal: 3675, gst: 367.50, total: 4042.50, currency: 'AUD' }
      ]
    },
    invoice_cover: {
      delay: 800,
      title: 'Cover email',
      body: 'Hi Sara and Tom,\n\nPlease find attached invoice INV-003 for the wedding film work to date — highlights reel, ceremony assembly, and colour grading.\n\nTotal is A$4,042.50 including GST, due in 14 days. Bank details are on the invoice.\n\nThe highlights reel is coming together beautifully. I will have the preview ready for you by Friday.\n\nCheers,\nBenny'
    },
    invoice_chase_3: {
      delay: 600,
      title: 'Day 3 — Gentle nudge',
      body: 'Hi Priya,\n\nJust a quick note to make sure invoice INV-002 landed in your inbox. Total is US$3,800, due in 11 days.\n\nHappy to jump on a call if there are any questions about the line items.\n\nBest,\nBenny'
    },
    tax_estimate: {
      delay: 1000,
      title: 'ATO tax estimate',
      body: 'Based on your year-to-date paid invoices, here is your estimated tax position. Note: this is an estimate, not tax advice.'
    },
    tax_deductible: {
      delay: 900,
      title: 'Deductible scan',
      body: 'I found 4 recurring expenses that are likely deductible: Adobe Creative Cloud (A$52.99/mo), Frame.io Pro (A$14.99/mo), Public liability insurance (A$189/mo), and Epidemic Sound (A$29.99/mo). Annual total: A$3,443.64.',
      actions: [
        { type: 'tag_deductible', desc: 'Tag 4 recurring expenses as deductible' }
      ]
    },
    fallback: {
      delay: 600,
      title: 'Working note',
      body: 'For Phase 0.5 I am scripted, local, and fictional-data only. Ask about time capture, invoices, receipts, or the profit mirror.'
    }
  },

  triads: {
    capture: {
      creative: 'Your messy week becomes three clean blocks of billable work.',
      professional: 'Calendar text maps to project, deliverable, rate, currency, and confirmation status.',
      ikigai: 'The captured work strengthens love, craft, and paid-for axes without hiding unpaid drift.'
    },
    invoice: {
      creative: 'No Sunday-night invoice dread. Pick the work, get the draft, send the chase sequence.',
      professional: 'Line items preserve hours, rates, source currency, due date, and follow-up cadence.',
      ikigai: 'The invoice protects paid-for work while showing which gigs deserve more of your week.'
    },
    mirror: {
      creative: 'See which jobs feed the studio and which ones quietly eat it.',
      professional: 'Paid revenue less expenses and unbilled hours produces effective hourly performance.',
      ikigai: 'Good money with low love is useful. High love with low pay needs a boundary.'
    }
  }
};

var SEED_PASTES = {
  google_calendar: 'Mon 9am-12pm — Shot B-roll at Lygon St cafe, hero stills for rebrand deck\nMon 1pm-4pm — Edit pass on wedding ceremony footage\nTue — ALL DAY Kindred Studio product launch shoot, Footscray warehouse\nWed 10am-1pm — Colour grade hero video for Kindred\nThu 9am-12pm — Interview Nonna Maria for Ferretti documentary, her kitchen\nThu 2pm-4:30pm — Archival photo scanning, State Library\nFri 9am-2pm — Fine cut highlights reel v2, Nguyen wedding',
  macos_calendar: 'Monday\n  9:00 AM - 12:00 PM  Lygon St cafe shoot\n  1:00 PM - 4:00 PM  Wedding edit session\n\nTuesday\n  All Day  Kindred product launch\n\nWednesday\n  10:00 AM - 1:00 PM  Hero video colour grade\n\nThursday\n  9:00 AM - 12:00 PM  Nonna Maria interview\n  2:00 PM - 4:30 PM  Photo scanning\n\nFriday\n  9:00 AM - 2:00 PM  Highlights reel fine cut',
  plain_english: 'Mon morning shot B-roll and stills at the Lygon St cafe for the rebrand, then edited wedding ceremony footage in the arvo. Tuesday was a full day on the Kindred product launch shoot in Footscray. Wednesday morning I graded the hero video. Thursday I interviewed Nonna Maria for the Ferretti doco and then scanned archival photos at the State Library. Friday was all about the Nguyen wedding highlights reel fine cut.'
};
