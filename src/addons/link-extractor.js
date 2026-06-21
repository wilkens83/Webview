'use strict';

/**
 * Link Extractor — a second reference add-on.
 *
 * Demonstrates reading structured data out of the loaded page. Collects every
 * link, logs how many were found, and prints the first handful. Shows that an
 * add-on can return data (here via the log) without mutating the page.
 */
export default {
  id: 'link-extractor',
  name: 'Link Extractor',
  description: 'List all hyperlinks on the current page.',
  placeholder: '(optional) filter substring',

  async run(api, ctx) {
    const filter = (ctx.params || '').trim().toLowerCase();
    const links = await api.eval(() =>
      Array.from(document.querySelectorAll('a[href]')).map((a) => ({
        text: (a.textContent || '').trim().slice(0, 60),
        href: a.href
      }))
    );

    const matched = filter
      ? links.filter(
          (l) =>
            l.href.toLowerCase().includes(filter) ||
            l.text.toLowerCase().includes(filter)
        )
      : links;

    api.log(
      `Link Extractor: ${matched.length} link(s)` +
        (filter ? ` matching "${filter}"` : ''),
      'success'
    );
    matched.slice(0, 15).forEach((l) => {
      api.log(`  • ${l.text || '(no text)'} → ${l.href}`);
    });
    if (matched.length > 15) {
      api.log(`  …and ${matched.length - 15} more`);
    }
  }
};
