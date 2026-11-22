// Service worker (sw.js) eseguito in un contesto vm con self, caches, fetch, clients, registration e importScripts finti.
// Le richieste di rete passano da `net(req)` (restituisce una Response o lancia = offline).
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { root } from './_load.mjs';

export const SCOPE = 'https://hh.test/app/';

export function loadSW({ net = () => { throw new TypeError('offline'); }, active = null, pages = [], caches: pre = {} } = {}) {
  const base = SCOPE + 'sw.js';
  class Request {
    constructor(input, init = {}) {
      const src = typeof input === 'string' ? {} : input;
      this.url = new URL(typeof input === 'string' ? input : input.url, base).href;
      this.method = init.method || src.method || 'GET';
      this.mode = init.mode || src.mode || 'cors';
      this.cache = init.cache || src.cache || 'default';
    }
  }
  class Response {
    constructor(body = '', init = {}) { this.body = body; this.status = init.status ?? 200; this.ok = this.status >= 200 && this.status < 300; this.type = 'basic'; }
    clone() { return new Response(this.body, { status: this.status }); }
    static error() { const r = new Response('', { status: 0 }); r.type = 'error'; return r; }
  }
  const key = (x) => new URL(typeof x === 'string' ? x : x.url, base).href;
  const strip = (u) => { const x = new URL(u); return x.origin + x.pathname; };
  const store = new Map();
  class Cache {
    constructor() { this.m = new Map(); }
    async match(req, o = {}) {
      const k = key(req);
      if (this.m.has(k)) return this.m.get(k);
      if (o.ignoreSearch) for (const [u, r] of this.m) if (strip(u) === strip(k)) return r;
      return undefined;
    }
    async put(req, res) { this.m.set(key(req), res); }
    async addAll(reqs) {
      // come il vero: tutto o niente, una risposta non ok fa fallire l'installazione
      const got = await Promise.all(reqs.map(async (r) => { const res = await fakeFetch(r); if (!res.ok) throw new TypeError('addAll ' + res.status); return [r, res]; }));
      for (const [r, res] of got) await this.put(r, res);
    }
    async keys() { return [...this.m.keys()].map((u) => new Request(u)); }
  }
  const caches = {
    async open(n) { if (!store.has(n)) store.set(n, new Cache()); return store.get(n); },
    async keys() { return [...store.keys()]; },
    async delete(n) { return store.delete(n); },
    async match(req) { for (const c of store.values()) { const r = await c.match(req); if (r) return r; } return undefined; },
  };
  for (const [n, files] of Object.entries(pre)) {
    const c = new Cache(); store.set(n, c);
    for (const [u, body] of Object.entries(files)) c.m.set(key(u), new Response(body));
  }
  const calls = [];
  async function fakeFetch(input, init = {}) {
    const req = input instanceof Request && !init.cache ? input : new Request(input, init);
    calls.push(req);
    return net(req, Response);
  }
  const handlers = {};
  const state = { skips: 0, claims: 0, posted: [] };
  const self = {
    addEventListener: (t, f) => (handlers[t] = handlers[t] || []).push(f),
    removeEventListener: (t, f) => { handlers[t] = (handlers[t] || []).filter((x) => x !== f); },
    skipWaiting: async () => { state.skips++; },
    registration: { scope: SCOPE, active },
    clients: {
      async matchAll() { return pages.map((p) => ({ postMessage: (msg) => { state.posted.push(msg); if (p.reply) dispatch('message', { data: p.reply(msg), source: null }); } })); },
      async claim() { state.claims++; },
    },
  };
  function dispatch(type, ev) { for (const f of handlers[type] || []) f(ev); return ev; }
  const ctx = {
    self, caches, Request, Response, URL, Promise, Map, Set, Error, TypeError, console,
    fetch: fakeFetch,
    location: new URL(base),
    // attese brevi: la pagina che non risponde scade subito
    setTimeout: (f, ms) => setTimeout(f, Math.min(ms, 20)), clearTimeout,
    importScripts: (...files) => { for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); },
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  // catalog.js usa globalThis: nel contesto è ctx, e self.HH deve essere lo stesso oggetto
  Object.defineProperty(self, 'HH', { get: () => ctx.HH });
  vm.runInContext(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), ctx, { filename: 'sw.js' });
  const get = (name) => vm.runInContext(name, ctx);

  const lifecycle = async (type, data) => {
    let p = null;
    dispatch(type, { data, waitUntil: (x) => { p = x; } });
    await p;
  };
  // FetchEvent finto: restituisce la risposta data a respondWith, o null se il SW non risponde (va in rete da sé)
  const request = async (url, init = {}) => {
    let p = null;
    dispatch('fetch', { request: new Request(url, init), respondWith: (x) => { p = x; } });
    return p ? await p : null;
  };
  return {
    VERSION: get('VERSION'), SHELL: get('SHELL'), HH: ctx.HH, Response, Request, state, calls, store, handlers,
    install: () => lifecycle('install'), activate: () => lifecycle('activate'),
    message: (data, source) => dispatch('message', { data, source }),
    fetch: request,
    cached: async (name, url) => { const c = store.get(name); return c ? c.m.get(key(url)) : undefined; },
  };
}

// rete finta che risponde con un testo che dice da dove arriva il file
export const online = (tag = 'net') => (req, Response) => new Response(`${tag}:${new URL(req.url).pathname}`);
