# DesignOps AI — Web Prototype

Prototype static untuk AI-powered Design Request Management System.

## Struktur

- `index.html` — halaman utama
- `css/style.css` — seluruh styling
- `js/app.js` — interaksi, request queue, AI simulation, analytics, localStorage
- `assets/logo.svg` — logo default

## Menjalankan

Bisa dibuka langsung dengan double-click `index.html`, atau upload seluruh folder ke GitHub dan aktifkan GitHub Pages.

## GitHub Pages

1. Buat repository, misalnya `designops-ai`.
2. Upload **seluruh isi folder ini**, bukan folder pembungkusnya.
3. Pastikan `index.html` berada di root repository.
4. Settings → Pages.
5. Source: Deploy from a branch.
6. Branch: `main`, folder `/ (root)`.
7. Save.

## Catatan

AI pada prototype ini masih simulasi berbasis rules. Untuk production, panggilan AI harus melalui backend/serverless function. Jangan pernah menaruh API key LLM di `index.html` atau `js/app.js`.

Data request dan settings prototype disimpan di localStorage browser. Untuk multi-user production, ganti dengan database + authentication.
