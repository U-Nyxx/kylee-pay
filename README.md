# kylee.net — web pembayaran voucher (GitHub Pages)

## Online-kan (gratis, `username.github.io/kylee-pay`)

1. Buat repo baru di GitHub bernama `kylee-pay` (public).
2. Upload 3 file ini ke root repo: `index.html`, `style.css`, `app.js`.
   ```sh
   cd kylee-pay
   git add index.html style.css app.js
   git commit -m "pay v1"
   git remote add origin https://github.com/USERNAME/kylee-pay.git
   git push -u origin main
   ```
3. Di repo GitHub: **Settings → Pages → Deploy from branch → `main` / root**.
4. Jadi online di `https://USERNAME.github.io/kylee-pay/`.

## Sambungkan dari login hotspot

Di `forme-inline/login.html` (dan `forme/login.html`), arahkan link footer:

```html
<a href="https://USERNAME.github.io/kylee-pay/">Beli voucher</a>
```

Ganti `USERNAME` dengan username GitHub kamu.

## Integrasi voucher beneran (bukan demo)

File ini frontend demo: tombol Bayar langsung menampilkan kode contoh.
Untuk produksi, edit fungsi `buatPesanan()` di `app.js`:

1. Backend terima order → buat user/voucher via Mikhmon API / RouterOS API.
2. Tampilkan kode bayar (QRIS/VA) dari payment gateway (Xendit/Midtrans/DOKU).
3. Webhook "lunas" → aktifkan user di hotspot → tampilkan kode voucher asli.

Tanpa backend, kode yang tampil TIDAK bisa dipakai login.

## Mode semi-otomatis (JALAN SEKARANG, tanpa backend/gateway)

1. Isi di `app.js`: `ADMIN_WA` (nomor WA admin) + `PAY_INFO` (instruksi bayar).
2. Pembeli: pilih paket → Bayar → terima Order ID + instruksi → klik
   "Kirim Bukti via WhatsApp" (pesan otomatis terisi order + paket).
3. Admin terima WA → cek bukti → buat user di WinBox
   (IP → Hotspot → Users → `+`: Name = kode, Password = kode,
   Profile = default/profil paket) → balas kode ke pembeli.
4. Pembeli login di tab Voucher dengan kode itu.

## Cek versi RouterOS

WinBox bar bawah tertulis mis. `6.49.4 (stable)`, atau
System → Resources, atau Terminal: `/system resource print`.

## Backend (Cloudflare Workers, mode simulasi)

File `worker.js` + `wrangler.toml` sudah di repo ini (Pages mengabaikannya).

```sh
# install wrangler sekali saja
npm i -g wrangler
wrangler login

# deploy dari folder repo
cd kylee-pay
wrangler deploy
# → dapat URL mis. https://kylee-pay-api.u-nyxx.workers.dev
```

Lalu di `app.js` isi:
```js
var API_BASE = "https://kylee-pay-api.u-nyxx.workers.dev";
```
commit + push — web payment langsung pakai backend (masih simulasi).

Endpoint: `GET /api/paket`, `POST /api/order`, `POST /api/confirm`.

### Naik ke produksi (voucher beneran)

1. **Router**: Worker memanggil RouterOS **v7 REST API**. Router kamu masih
   v6 (6.49.4) → upgrade ke v7, aktifkan `IP → Services → api-ssl`,
   buat user API khusus, lalu simpan sebagai secret:
   ```sh
   wrangler secret put ROUTER_URL   # mis. https://ip-publik:443
   wrangler secret put ROUTER_USER
   wrangler secret put ROUTER_PASS
   ```
2. **Gateway**: daftar Xendit/Midtrans, buat invoice di `/api/order`,
   verifikasi webhook sebelum `/api/confirm` mengembalikan voucher.
3. **KV** (opsional, biar order tidak hilang saat restart):
   ```sh
   wrangler kv:namespace create KV
   ```
   lalu isi `id` di `wrangler.toml` dan deploy ulang.
