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
