/* kylee-pay backend — Cloudflare Worker (mode SIMULASI + titik colok produksi).
 * Deploy: wrangler deploy (lihat README.md bagian Backend).
 * Secrets produksi: ROUTER_URL, ROUTER_USER, ROUTER_PASS (RouterOS v7 REST API).
 */

var PAKET = {
  "1H":  { nama: "Paket 1 Jam",   durasi: "Aktif 24 Jam", harga: 3000,  uptime: "1h" },
  "2H":  { nama: "Paket 2 Jam",   durasi: "Aktif 2 Hari", harga: 5000,  uptime: "2h" },
  "7H":  { nama: "Paket 7 Hari",  durasi: "Aktif 7 Hari", harga: 15000, uptime: "7d" },
  "30H": { nama: "Paket 30 Hari", durasi: "Aktif 30 Hari", harga: 35000, uptime: "30d" }
};

/* Penyimpanan order: KV kalau ada, memori kalau tidak (ephemeral!). */
function store(env) {
  if (env.KV) {
    return {
      get: function (k) { return env.KV.get(k, "json"); },
      put: function (k, v) { return env.KV.put(k, JSON.stringify(v), { expirationTtl: 86400 }); }
    };
  }
  if (!globalThis.__ORDERS) globalThis.__ORDERS = new Map();
  var m = globalThis.__ORDERS;
  return {
    get: async function (k) { return m.get(k) || null; },
    put: async function (k, v) { m.set(k, v); }
  };
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type"
    }
  });
}
function rnd(n) {
  var c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = "";
  for (var i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

/* PRODUKSI: buat user hotspot di RouterOS v7 REST API.
 * RouterOS v6 (mis. 6.49.4) TIDAK punya REST API — upgrade ke v7 dulu,
 * atau ganti fungsi ini dengan client API-SSL port 8728. */
async function buatUserHotspot(env, voucher, paket) {
  if (!env.ROUTER_URL || !env.ROUTER_USER || !env.ROUTER_PASS) {
    return { ok: false, simulasi: true };
  }
  var auth = btoa(env.ROUTER_USER + ":" + env.ROUTER_PASS);
  var r = await fetch(env.ROUTER_URL + "/rest/ip/hotspot/user", {
    method: "PUT",
    headers: { "content-type": "application/json", "authorization": "Basic " + auth },
    body: JSON.stringify({
      name: voucher, password: voucher,
      profile: "default", "limit-uptime": paket.uptime,
      comment: "kylee-pay " + new Date().toISOString().slice(0, 10)
    })
  });
  return { ok: r.ok, simulasi: false };
}

export default {
  async fetch(req, env) {
    var url = new URL(req.url);
    if (req.method === "OPTIONS") return json({}, 204);
    var s = store(env);

    if (url.pathname === "/api/paket" && req.method === "GET") {
      return json(Object.keys(PAKET).map(function (k) {
        return { kode: k, nama: PAKET[k].nama, durasi: PAKET[k].durasi, harga: PAKET[k].harga };
      }));
    }

    if (url.pathname === "/api/order" && req.method === "POST") {
      var b = await req.json().catch(function () { return {}; });
      var p = PAKET[b.paket];
      if (!p) return json({ error: "paket tidak dikenal" }, 400);
      var orderId = "ORD-" + Date.now().toString(36).toUpperCase() + rnd(4);
      await s.put(orderId, { paket: b.paket, metode: b.metode || "QRIS", lunas: false });
      /* SIMULASI: kode bayar dibuat lokal. Produksi: buat invoice via
       * Xendit/Midtrans di sini, kembalikan qr_string / payment_url. */
      return json({
        orderId: orderId, jumlah: p.harga,
        bayar: (b.metode || "QRIS") + "-" + rnd(8),
        simulasi: true
      });
    }

    if (url.pathname === "/api/confirm" && req.method === "POST") {
      var c = await req.json().catch(function () { return {}; });
      var o = await s.get(c.orderId);
      if (!o) return json({ error: "order tidak ditemukan" }, 404);
      /* Voucher HANYA keluar kalau order sudah lunas. Tidak ada jalan pintas. */
      if (!o.lunas) return json({ error: "belum lunas", voucher: null }, 402);
      if (o.voucher) return json({ voucher: o.voucher, userDibuat: o.userDibuat, simulasi: true });
      var voucher = rnd(6);
      o.voucher = voucher;
      var res = await buatUserHotspot(env, voucher, PAKET[o.paket]);
      o.userDibuat = res.ok;
      await s.put(c.orderId, o);
      return json({ voucher: voucher, userDibuat: res.ok, simulasi: res.simulasi });
    }

    /* DEV ONLY: simulasi callback gateway. Produksi: HAPUS endpoint ini,
     * ganti webhook asli gateway (verifikasi signature) yang set lunas=true.
     * Matikan via ALLOW_SIMULATE=0 di wrangler.toml. */
    if (url.pathname === "/api/webhook-simulate" && req.method === "POST") {
      if ((env.ALLOW_SIMULATE || "1") === "0") return json({ error: "simulasi dimatikan" }, 403);
      var w = await req.json().catch(function () { return {}; });
      var ow = await s.get(w.orderId);
      if (!ow) return json({ error: "order tidak ditemukan" }, 404);
      ow.lunas = true;
      await s.put(w.orderId, ow);
      return json({ ok: true, simulasi: true });
    }

    return json({ error: "not found" }, 404);
  }
};
