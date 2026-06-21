'use strict';

/**
 * Hermes — a sample automation add-on.
 *
 * Hermes is the messenger: given a free-text instruction it performs a small
 * automated action on whatever site is currently loaded. This is intentionally
 * a reference implementation that shows the full add-on surface (read the
 * page, wait, fill, click, report back). Real Hermes capabilities can be
 * layered on top of the same `api` object.
 *
 * Supported commands (typed into the add-on's input box):
 *   search: <query>      → fill the page's main search box and submit
 *   click: <selector>    → click a CSS selector
 *   read: <selector>     → log the text of a CSS selector
 *   summary              → report URL, title, link/form/input counts
 *
 * With no command it falls back to "summary".
 */

const SEARCH_SELECTORS = [
  'input[type="search"]',
  'input[name="q"]',
  'input[name="query"]',
  'input[role="searchbox"]',
  'input[aria-label*="search" i]',
  'input[placeholder*="search" i]'
];

async function runSearch(api, query) {
  api.log(`Hermes: searching for "${query}"`);
  for (const sel of SEARCH_SELECTORS) {
    if (await api.exists(sel)) {
      await api.fill(sel, query);
      // Submit by pressing Enter inside the field.
      await api.eval((s) => {
        const el = document.querySelector(s);
        if (!el) return;
        const ev = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true
        });
        el.dispatchEvent(ev);
        if (el.form) el.form.submit();
      }, [sel]);
      api.log(`Hermes: submitted search via "${sel}"`, 'success');
      return;
    }
  }
  throw new Error('Hermes: no search box found on this page');
}

async function reportSummary(api) {
  const counts = await api.eval(() => ({
    links: document.querySelectorAll('a[href]').length,
    forms: document.querySelectorAll('form').length,
    inputs: document.querySelectorAll('input, textarea, select').length,
    buttons: document.querySelectorAll('button').length
  }));
  api.log(`Hermes: ${api.title()} — ${api.url()}`, 'success');
  api.log(
    `Hermes: ${counts.links} links · ${counts.forms} forms · ` +
      `${counts.inputs} inputs · ${counts.buttons} buttons`
  );
}

export default {
  id: 'hermes',
  name: 'Hermes',
  description:
    'Automated actions on the loaded site. Try "search: hello", ' +
    '"click: a.signup", "read: h1", or leave blank for a page summary.',
  placeholder: 'search: hello world',

  async run(api, ctx) {
    const raw = (ctx.params || '').trim();
    const [verb, ...rest] = raw.split(':');
    const arg = rest.join(':').trim();
    const command = arg ? verb.trim().toLowerCase() : '';

    switch (command) {
      case 'search':
        return runSearch(api, arg);
      case 'click':
        await api.click(arg);
        api.log(`Hermes: clicked ${arg}`, 'success');
        return;
      case 'read': {
        const text = await api.text(arg);
        api.log(`Hermes: read ${arg} → ${text ?? '(no match)'}`, 'success');
        return;
      }
      case '':
      default:
        return reportSummary(api);
    }
  }
};
