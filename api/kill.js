// api/kill.js - Vercel endpoint
// URL: https://tvoj-projekt.vercel.app/api/kill
// Otvor tuto URL v prehliadaci a klikni na tlacidlo

export default async function handler(req, res) {
    // Zobraz potvrdzovaciu stranku (GET)
    if (req.method === 'GET') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(`
<!DOCTYPE html>
<html lang="sk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kill Switch</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: sans-serif; background:#111; display:flex; align-items:center; justify-content:center; min-height:100vh; color:#fff; }
        .box { text-align:center; padding:50px 40px; max-width:420px; background:#1a1a1a; border-radius:12px; border:1px solid #333; }
        h1 { color:#e74c3c; margin-bottom:12px; font-size:1.4rem; }
        p { color:#aaa; margin-bottom:30px; line-height:1.6; font-size:0.9rem; }
        .warning { background:#2a1a1a; border:1px solid #e74c3c; border-radius:8px; padding:16px; margin-bottom:24px; color:#e74c3c; font-size:0.85rem; }
        button { background:#e74c3c; color:#fff; border:none; padding:14px 32px; border-radius:8px; font-size:1rem; cursor:pointer; width:100%; font-weight:bold; letter-spacing:1px; }
        button:hover { background:#c0392b; }
        button:disabled { background:#555; cursor:not-allowed; }
        #status { margin-top:20px; padding:12px; border-radius:8px; display:none; font-size:0.9rem; }
        .success { background:#1a2a1a; border:1px solid #27ae60; color:#27ae60; }
        .error { background:#2a1a1a; border:1px solid #e74c3c; color:#e74c3c; }
    </style>
</head>
<body>
    <div class="box">
        <h1>⚠️ Kill Switch</h1>
        <p>Táto akcia zazálohuje web na Google Drive a následne ho <strong>zmaže</strong>.</p>
        <div class="warning">Akcia je NEVRATNÁ. Web bude okamžite nedostupný.</div>
        <button id="btn" onclick="execute()">AKTIVOVAŤ KILL SWITCH</button>
        <div id="status"></div>
    </div>
    <script>
        async function execute() {
            const btn = document.getElementById('btn');
            const status = document.getElementById('status');
            
            if (!confirm('Si si ISTÝ? Web bude zmazaný a záloha odoslaná na Drive.')) return;
            
            btn.disabled = true;
            btn.textContent = 'Spracúvam...';
            status.style.display = 'none';

            try {
                const res = await fetch('/api/kill', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ confirm: true })
                });
                const data = await res.json();

                status.style.display = 'block';
                if (data.success) {
                    status.className = 'success';
                    status.textContent = '✓ ' + data.message;
                    btn.textContent = 'HOTOVO';
                } else {
                    status.className = 'error';
                    status.textContent = '✗ ' + (data.error || 'Chyba');
                    btn.disabled = false;
                    btn.textContent = 'SKÚSIŤ ZNOVA';
                }
            } catch(e) {
                status.style.display = 'block';
                status.className = 'error';
                status.textContent = '✗ Sieťová chyba: ' + e.message;
                btn.disabled = false;
                btn.textContent = 'SKÚSIŤ ZNOVA';
            }
        }
    </script>
</body>
</html>`);
    }

    // Spracuj aktivaciu (POST)
    if (req.method === 'POST') {
        const { confirm } = req.body || {};
        if (!confirm) {
            return res.status(400).json({ success: false, error: 'Chybajuce potvrdenie' });
        }

        // Tajny token - musi sa zhodovat s kill_executor.php
        const SECRET_TOKEN = process.env.KILL_SECRET_TOKEN;
        // URL tvojho webu kde je kill_executor.php
        const EXECUTOR_URL = process.env.KILL_EXECUTOR_URL; // napr. https://zlatapodkova.sk/kill_executor.php

        try {
            const response = await fetch(EXECUTOR_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    token: SECRET_TOKEN,
                    action: 'execute'
                }),
                signal: AbortSignal.timeout(280000) // 4.5 minuty timeout
            });

            const text = await response.text();
            let data;
            try { data = JSON.parse(text); } catch { data = { raw: text }; }

            if (data.success) {
                return res.json({ success: true, message: 'Web bol úspešne zazálohovaný a zmazaný.' });
            } else {
                return res.status(500).json({ success: false, error: data.error || 'Neznama chyba', log: data.log });
            }
        } catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    }

    res.status(405).json({ error: 'Method not allowed' });
}
