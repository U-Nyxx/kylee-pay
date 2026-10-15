/* kylee.net pay — frontend statis.
   INTEGRASI: ganti fungsi buatPesanan() dengan fetch ke backend/Mikhmon API. */
var PAKET = [
  { kode: "1H",  nama: "Paket 1 Jam",  durasi: "Aktif 24 Jam", harga: 3000 },
  { kode: "2H",  nama: "Paket 2 Jam",  durasi: "Aktif 2 Hari", harga: 5000 },
  { kode: "7H",  nama: "Paket 7 Hari", durasi: "Aktif 7 Hari", harga: 15000 },
  { kode: "30H", nama: "Paket 30 Hari", durasi: "Aktif 30 Hari", harga: 35000 }
];
var rupiah = function (n) { return "Rp " + n.toLocaleString("id-ID"); };
var dipilih = null, metode = "QRIS";

var list = document.getElementById("paket-list");
PAKET.forEach(function (p) {
  var b = document.createElement("button");
  b.className = "pkg";
  b.innerHTML = "<span><b>" + p.nama + "</b><small>" + p.durasi + "</small></span>" +
    '<span class="harga">' + rupiah(p.harga) + "</span>";
  b.addEventListener("click", function () {
    dipilih = p;
    document.getElementById("bayar-title").textContent = "Bayar — " + p.nama;
    document.getElementById("bayar-detail").textContent = p.durasi + " · " + rupiah(p.harga);
    document.getElementById("bayar-box").classList.remove("hidden");
    document.getElementById("sukses-box").classList.add("hidden");
    document.getElementById("bayar-box").scrollIntoView({ behavior: "smooth" });
  });
  list.appendChild(b);
});

document.querySelectorAll(".method").forEach(function (m) {
  m.addEventListener("click", function () {
    document.querySelectorAll(".method").forEach(function (x) { x.classList.remove("is-active"); });
    m.classList.add("is-active");
    metode = m.getAttribute("data-m");
  });
});

/* kylee.net pay — frontend.
 * API_BASE: URL Worker backend. Kosongkan ("") = mode demo lokal.
 * Contoh: "https://kylee-pay-api.u-nyxx.workers.dev" */
var API_BASE = "";

var demoOrder = null;

function buatPesanan() {
  if (!API_BASE) {
    /* DEMO: order hanya keluarkan kode bayar. Voucher TIDAK dibuat di sini. */
    demoOrder = { paket: dipilih.kode, metode: metode };
    var oid = "DEMO-" + Date.now().toString(36).toUpperCase();
    return Promise.resolve({
      bayar: metode + "-" + Date.now().toString().slice(-8),
      orderId: oid
    });
  }
  return fetch(API_BASE + "/api/order", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ paket: dipilih.kode, metode: metode })
  }).then(function (r) { return r.json(); });
}

function kodeVoucherAcak() {
  return "KYLEE-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function konfirmasiBayar(orderId) {
  if (!API_BASE || !orderId) {
    /* DEMO: voucher dibuat SEKARANG (saat user klik "Saya Sudah Bayar"),
     * bukan saat order. Tidak pernah ada sebelum tahap ini. */
    if (!demoOrder) return Promise.resolve(null);
    demoOrder = null;
    return Promise.resolve({ voucher: kodeVoucherAcak(), simulasi: true, userDibuat: false });
  }
  /* Backend: tandai simulasi-lunas dulu (DEV), lalu minta voucher. */
  return fetch(API_BASE + "/api/webhook-simulate", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderId: orderId })
  }).then(function () {
    return fetch(API_BASE + "/api/confirm", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId: orderId })
    });
  }).then(function (r) { return r.json(); });
}

function tampilkanVoucher(voucher, simulasi) {
  document.getElementById("voucher-code").textContent = voucher;
  document.getElementById("voucher-note").textContent = simulasi
    ? "Mode simulasi — kode ini belum aktif di hotspot."
    : "Kode aktif. Masukkan di halaman login hotspot.";
  document.getElementById("sukses-box").classList.remove("hidden");
  document.getElementById("sukses-box").scrollIntoView({ behavior: "smooth" });
}

var orderAktif = null;

document.getElementById("btn-bayar").addEventListener("click", function () {
  if (!dipilih) return;
  document.getElementById("paycode").textContent = "Memproses…";
  buatPesanan().then(function (res) {
    orderAktif = res.orderId;
    document.getElementById("paycode").textContent = "Kode bayar (" + metode + "): " + res.bayar;
    /* Tahap 1 selesai: voucher BELUM ada. User harus bayar dulu. */
    document.getElementById("btn-bayar").classList.add("hidden");
    document.getElementById("btn-lunas").classList.remove("hidden");
  });
});
document.getElementById("btn-lunas").addEventListener("click", function () {
  if (!orderAktif) return;
  document.getElementById("paycode").textContent = "Memverifikasi pembayaran…";
  konfirmasiBayar(orderAktif).then(function (c) {
    if (c && c.voucher) {
      tampilkanVoucher(c.voucher, c.simulasi !== false);
      orderAktif = null;
      document.getElementById("btn-lunas").classList.add("hidden");
      document.getElementById("btn-bayar").classList.remove("hidden");
    } else {
      document.getElementById("paycode").textContent = "Belum lunas. Selesaikan pembayaran dulu.";
    }
  });
});
function resetBayar() {
  orderAktif = null;
  demoOrder = null;
  document.getElementById("bayar-box").classList.add("hidden");
  document.getElementById("btn-lunas").classList.add("hidden");
  document.getElementById("btn-bayar").classList.remove("hidden");
  document.getElementById("paycode").textContent = "Klik Bayar untuk kode pembayaran.";
}
document.getElementById("btn-batal").addEventListener("click", resetBayar);
document.getElementById("btn-lagi").addEventListener("click", function () {
  document.getElementById("sukses-box").classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
});
