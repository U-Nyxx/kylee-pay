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

function buatPesanan() {
  if (!API_BASE) {
    var kode = "KYLEE-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    return Promise.resolve({ bayar: metode + "-" + Date.now().toString().slice(-8), voucher: kode, orderId: null });
  }
  return fetch(API_BASE + "/api/order", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ paket: dipilih.kode, metode: metode })
  }).then(function (r) { return r.json(); });
}

function konfirmasiBayar(orderId) {
  if (!API_BASE || !orderId) return Promise.resolve(null);
  return fetch(API_BASE + "/api/confirm", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderId: orderId })
  }).then(function (r) { return r.json(); });
}

document.getElementById("btn-bayar").addEventListener("click", function () {
  if (!dipilih) return;
  document.getElementById("paycode").textContent = "Memproses…";
  buatPesanan().then(function (res) {
    document.getElementById("paycode").textContent = "Kode bayar (" + metode + "): " + res.bayar;
    if (res.orderId) {
      /* Mode backend: voucher muncul setelah konfirmasi (simulasi: langsung). */
      document.getElementById("paycode").textContent += " — menunggu lunas…";
      konfirmasiBayar(res.orderId).then(function (c) {
        if (c && c.voucher) {
          document.getElementById("voucher-code").textContent = c.voucher;
          document.getElementById("sukses-box").classList.remove("hidden");
          document.getElementById("sukses-box").scrollIntoView({ behavior: "smooth" });
        }
      });
      return;
    }
    // DEMO lokal: langsung tampilkan voucher.
    document.getElementById("voucher-code").textContent = res.voucher;
    document.getElementById("sukses-box").classList.remove("hidden");
    document.getElementById("sukses-box").scrollIntoView({ behavior: "smooth" });
  });
});
document.getElementById("btn-batal").addEventListener("click", function () {
  document.getElementById("bayar-box").classList.add("hidden");
});
document.getElementById("btn-lagi").addEventListener("click", function () {
  document.getElementById("sukses-box").classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
});
