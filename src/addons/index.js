'use strict';

/**
 * Add-on registry.
 *
 * Each add-on is a plain object implementing the Add-on interface:
 *
 *   {
 *     id:          string   // unique, kebab-case
 *     name:        string   // human label
 *     description: string   // shown in the sidebar
 *     async run(api, ctx)   // entry point; receives the automation API
 *   }
 *
 * `api`  → the injected automation API (see ../renderer/automation.js)
 * `ctx`  → { log, params } where params is whatever the user typed in the
 *          add-on's input box.
 *
 * To add a new add-on, create a module that default-exports the object and
 * register it in the `addons` array below.
 */

import hermes from './hermes.js';
import linkExtractor from './link-extractor.js';

export const addons = [hermes, linkExtractor];

export function getAddon(id) {
  return addons.find((a) => a.id === id) || null;
}
