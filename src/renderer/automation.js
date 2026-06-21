'use strict';

/**
 * Automation API.
 *
 * This is the "injected API" every add-on receives. It wraps a single
 * <webview> guest (the connected website) and exposes a small, safe surface
 * for reading and acting on the page: navigate, query, click, fill, wait, and
 * arbitrary evaluation. Everything ultimately runs through the webview's
 * executeJavaScript, so add-ons can automate any site loaded in the shell
 * without needing Node access.
 *
 * @param {Electron.WebviewTag} webview - the guest element.
 * @param {(msg: string, level?: string) => void} log - structured logger.
 */
export function createAutomation(webview, log) {
  // Serialize a function + args into an IIFE string and run it in the guest's
  // main world. We pass args as JSON so selectors/values are escaped safely.
  function runInGuest(fn, args = []) {
    const code = `(${fn.toString()}).apply(null, ${JSON.stringify(args)});`;
    return webview.executeJavaScript(code, /* userGesture */ true);
  }

  const api = {
    /** Current page URL. */
    url() {
      return webview.getURL();
    },

    /** Current page title. */
    title() {
      return webview.getTitle();
    },

    /** Navigate the guest to a URL and resolve once it finishes loading. */
    navigate(target) {
      log(`navigate → ${target}`);
      return new Promise((resolve) => {
        const onDone = () => {
          webview.removeEventListener('did-stop-loading', onDone);
          resolve(webview.getURL());
        };
        webview.addEventListener('did-stop-loading', onDone);
        webview.loadURL(target);
      });
    },

    /** Whether a selector currently matches at least one element. */
    exists(selector) {
      return runInGuest((sel) => !!document.querySelector(sel), [selector]);
    },

    /** Number of elements matching a selector. */
    count(selector) {
      return runInGuest(
        (sel) => document.querySelectorAll(sel).length,
        [selector]
      );
    },

    /** Trimmed textContent of the first match (null if absent). */
    text(selector) {
      return runInGuest((sel) => {
        const el = document.querySelector(sel);
        return el ? (el.textContent || '').trim() : null;
      }, [selector]);
    },

    /** Read an attribute from the first match. */
    attr(selector, name) {
      return runInGuest((sel, attrName) => {
        const el = document.querySelector(sel);
        return el ? el.getAttribute(attrName) : null;
      }, [selector, name]);
    },

    /** Click the first element matching the selector. */
    async click(selector) {
      log(`click → ${selector}`);
      const ok = await runInGuest((sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        el.scrollIntoView({ block: 'center' });
        el.click();
        return true;
      }, [selector]);
      if (!ok) throw new Error(`click: no element matches "${selector}"`);
      return true;
    },

    /**
     * Set the value of an input/textarea and dispatch input + change events so
     * frameworks (React, Vue, etc.) pick up the change.
     */
    async fill(selector, value) {
      log(`fill → ${selector} = ${JSON.stringify(value)}`);
      const ok = await runInGuest((sel, val) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        el.focus();
        const setter = Object.getOwnPropertyDescriptor(
          el.constructor.prototype,
          'value'
        );
        if (setter && setter.set) {
          setter.set.call(el, val);
        } else {
          el.value = val;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }, [selector, value]);
      if (!ok) throw new Error(`fill: no element matches "${selector}"`);
      return true;
    },

    /**
     * Poll until a selector appears (or timeout). Resolves with true, rejects
     * on timeout. Useful before click/fill on dynamic pages.
     */
    waitFor(selector, { timeout = 10000, interval = 200 } = {}) {
      log(`waitFor → ${selector} (timeout ${timeout}ms)`);
      const deadline = Date.now() + timeout;
      return new Promise((resolve, reject) => {
        const tick = async () => {
          if (await api.exists(selector)) return resolve(true);
          if (Date.now() > deadline) {
            return reject(new Error(`waitFor: "${selector}" timed out`));
          }
          setTimeout(tick, interval);
        };
        tick();
      });
    },

    /** Resolve after `ms` milliseconds. */
    sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },

    /**
     * Escape hatch: run an arbitrary function in the guest's page context.
     * `fn` is serialized, so it cannot close over renderer variables — pass
     * data through `args`.
     */
    eval(fn, args = []) {
      return runInGuest(fn, args);
    },

    /** Capture the guest as a PNG data URL. */
    async screenshot() {
      const image = await webview.capturePage();
      return image.toDataURL();
    },

    log
  };

  return api;
}
