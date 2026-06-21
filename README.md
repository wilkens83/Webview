# Webview

An Electron desktop shell that can **connect to any website or platform** and
expose it to **add-ons** (like *Hermes*) that perform automated actions on the
loaded page through an injected JavaScript API.

## What it does

- Embeds any site in a real `<webview>` guest (not an iframe), so most sites —
  including ones that block iframing — load and are fully automatable.
- Provides an address bar, navigation, and an activity log.
- Ships an **add-on system**: each add-on receives an `automation` API and can
  read, click, fill, wait on, navigate, and screenshot the connected page.
- Includes two reference add-ons: **Hermes** (instruction-driven actions) and
  **Link Extractor**.

## Run it

```bash
npm install
npm start
```

Type a URL (or search term) in the address bar and press **Connect**, then run
an add-on from the right-hand sidebar.

> The app strips `X-Frame-Options` and CSP `frame-ancestors` response headers so
> the widest range of sites can be embedded. Use it only against sites you are
> authorized to automate.

## Writing an add-on

An add-on is a module that default-exports an object:

```js
// src/addons/my-addon.js
export default {
  id: 'my-addon',            // unique, kebab-case
  name: 'My Add-on',
  description: 'What it does, shown in the sidebar.',
  placeholder: 'optional input hint',

  async run(api, ctx) {
    // ctx.params  → text the user typed in the add-on's input box
    // ctx.log     → log(message, level)  level: 'info' | 'success' | 'error'
    await api.waitFor('h1');
    const heading = await api.text('h1');
    ctx.log(`Heading is: ${heading}`, 'success');
  }
};
```

Register it in `src/addons/index.js`:

```js
import myAddon from './my-addon.js';
export const addons = [hermes, linkExtractor, myAddon];
```

### The automation API (`api`)

| Method | Description |
| --- | --- |
| `api.url()` / `api.title()` | Current page URL / title |
| `api.navigate(url)` | Load a URL; resolves when loading stops |
| `api.exists(sel)` | `true` if the selector matches |
| `api.count(sel)` | Number of matches |
| `api.text(sel)` | Trimmed text of the first match |
| `api.attr(sel, name)` | An attribute of the first match |
| `api.click(sel)` | Click the first match |
| `api.fill(sel, value)` | Set a field's value + fire input/change events |
| `api.waitFor(sel, opts)` | Poll until the selector appears |
| `api.sleep(ms)` | Delay |
| `api.eval(fn, args)` | Run an arbitrary function in the page context |
| `api.screenshot()` | PNG data URL of the page |

`api.eval(fn, args)` serializes `fn`, so it can't capture renderer variables —
pass everything it needs through `args`.

## Project layout

```
src/
  main.js              Electron main process + header stripping
  preload.js           Minimal host bridge (contextIsolation)
  renderer/
    index.html         Browser chrome + <webview> + sidebar
    styles.css
    renderer.js        UI wiring, navigation, add-on runner
    automation.js      The injected automation API
  addons/
    index.js           Add-on registry
    hermes.js          Sample instruction-driven add-on
    link-extractor.js  Sample read-only add-on
```

## Security notes

This tool can drive arbitrary sites and disables some framing protections.
Run add-ons only against websites and accounts you own or are authorized to
automate, and review add-on code before installing it — add-ons execute
JavaScript in the context of whatever page is loaded.
