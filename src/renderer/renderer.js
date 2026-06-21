'use strict';

import { createAutomation } from './automation.js';
import { addons } from '../addons/index.js';

const guest = document.getElementById('guest');
const address = document.getElementById('address');
const status = document.getElementById('status');
const logEl = document.getElementById('log');

/* ---------------------------------------------------------------- logging */

function log(message, level = 'info') {
  const line = document.createElement('div');
  line.className = `log-line ${level}`;
  const ts = new Date().toLocaleTimeString();
  line.innerHTML = `<span class="ts">${ts}</span>`;
  line.appendChild(document.createTextNode(message));
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

document.getElementById('clear-log').addEventListener('click', () => {
  logEl.innerHTML = '';
});

/* ------------------------------------------------------------ navigation */

// Turn whatever the user typed into a URL: full URLs pass through, bare
// hostnames get https://, anything else becomes a web search.
function toURL(input) {
  const value = input.trim();
  if (!value) return null;
  if (/^[a-z]+:\/\//i.test(value)) return value;
  if (/^[^\s.]+\.[^\s]{2,}/.test(value) && !value.includes(' ')) {
    return `https://${value}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(value)}`;
}

function connect() {
  const url = toURL(address.value);
  if (!url) return;
  log(`Connecting to ${url}`);
  guest.loadURL(url);
}

document.getElementById('go').addEventListener('click', connect);
address.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') connect();
});

document.getElementById('back').addEventListener('click', () => {
  if (guest.canGoBack()) guest.goBack();
});
document.getElementById('forward').addEventListener('click', () => {
  if (guest.canGoForward()) guest.goForward();
});
document.getElementById('reload').addEventListener('click', () => {
  guest.reload();
});

/* ----------------------------------------------------- guest lifecycle */

guest.addEventListener('did-start-loading', () => {
  status.textContent = 'Loading…';
});
guest.addEventListener('did-stop-loading', () => {
  status.textContent = 'Ready';
  address.value = guest.getURL() === 'about:blank' ? '' : guest.getURL();
});
guest.addEventListener('did-fail-load', (e) => {
  if (e.errorCode === -3) return; // aborted (e.g. redirect), ignore
  status.textContent = 'Failed';
  log(`Load failed (${e.errorCode}): ${e.errorDescription}`, 'error');
});

/* --------------------------------------------------- automation + add-ons */

const automation = createAutomation(guest, log);

function runAddon(addon, params, button) {
  if (guest.getURL() === 'about:blank') {
    log(`${addon.name}: connect to a site first`, 'error');
    return;
  }
  button.disabled = true;
  log(`▶ Running ${addon.name}…`);
  Promise.resolve(addon.run(automation, { log, params }))
    .then(() => log(`✓ ${addon.name} finished`, 'success'))
    .catch((err) => log(`✗ ${addon.name}: ${err.message}`, 'error'))
    .finally(() => {
      button.disabled = false;
    });
}

function renderAddons() {
  const list = document.getElementById('addon-list');
  addons.forEach((addon) => {
    const card = document.createElement('div');
    card.className = 'addon';

    const name = document.createElement('div');
    name.className = 'addon-name';
    name.textContent = addon.name;

    const desc = document.createElement('div');
    desc.className = 'addon-desc';
    desc.textContent = addon.description;

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = addon.placeholder || 'parameters (optional)';

    const button = document.createElement('button');
    button.textContent = `Run ${addon.name}`;
    button.addEventListener('click', () =>
      runAddon(addon, input.value, button)
    );
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') runAddon(addon, input.value, button);
    });

    card.append(name, desc, input, button);
    list.appendChild(card);
  });
}

renderAddons();
log('Webview ready. Connect to a site, then run an add-on.', 'success');
