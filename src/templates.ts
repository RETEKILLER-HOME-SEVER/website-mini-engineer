export interface CodeTemplate {
  name: string;
  description: string;
  html: string;
  css: string;
  js: string;
}

export const templates: Record<string, CodeTemplate> = {
  landing: {
    name: "Minimalist Landing Page",
    description: "Halaman landing modern dengan interaksi tombol dan tema monokrom yang elegan.",
    html: `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Situs Saya yang Baru</title>
</head>
<body>
    <div class="card">
        <div class="badge">Live on VPS</div>
        <h1>Website Pertama Saya</h1>
        <p>Halaman ini berhasil di-deploy secara otomatis menggunakan <strong>Vercel VPS Deployer</strong>. Konfigurasi Nginx vHost selesai dalam hitungan detik.</p>
        
        <div class="interactive-box">
            <span id="counter">0</span>
            <p>Klik tombol di bawah ini untuk menguji interaktivitas JavaScript:</p>
            <button id="btn-click">Klik Saya!</button>
        </div>

        <footer>
            <p>Powered by <span class="accent">Nginx</span> &amp; <span class="accent">Node.js</span></p>
        </footer>
    </div>
</body>
</html>`,
    css: `* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

body {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: #f8fafc;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
}

.card {
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 40px;
    max-width: 500px;
    width: 100%;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    text-align: center;
}

.badge {
    display: inline-block;
    background: #10b981;
    color: #ffffff;
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
    padding: 4px 12px;
    border-radius: 20px;
    margin-bottom: 20px;
    letter-spacing: 1px;
}

h1 {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 15px;
    letter-spacing: -0.5px;
    background: linear-gradient(to right, #60a5fa, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

p {
    font-size: 15px;
    line-height: 1.6;
    color: #94a3b8;
    margin-bottom: 25px;
}

.interactive-box {
    background: rgba(15, 23, 42, 0.5);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 25px;
}

#counter {
    display: block;
    font-size: 48px;
    font-weight: 800;
    color: #60a5fa;
    margin-bottom: 5px;
    transition: transform 0.1s ease;
}

button {
    background: linear-gradient(to right, #3b82f6, #8b5cf6);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 12px 24px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    transition: all 0.2s ease;
}

button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}

button:active {
    transform: translateY(0);
}

footer {
    font-size: 12px;
    color: #64748b;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    padding-top: 20px;
}

.accent {
    color: #3b82f6;
    font-weight: 600;
}`,
    js: `document.addEventListener("DOMContentLoaded", () => {
    const counterEl = document.getElementById("counter");
    const buttonEl = document.getElementById("btn-click");
    let count = 0;

    buttonEl.addEventListener("click", () => {
        count++;
        counterEl.textContent = count;
        
        // Add a bounce animation to counter
        counterEl.style.transform = "scale(1.2)";
        setTimeout(() => {
            counterEl.style.transform = "scale(1)";
        }, 100);
    });
});`
  },
  glassStopwatch: {
    name: "Glassmorphic Stopwatch",
    description: "Desain timer modern menggunakan efek kaca tembus pandang dan kontrol interaktif.",
    html: `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Glassmorphic Stopwatch</title>
</head>
<body>
    <div class="glass-container">
        <h2>Smart Stopwatch</h2>
        <div class="display" id="time-display">00:00.00</div>
        
        <div class="controls">
            <button id="btn-start" class="btn btn-green">Mulai</button>
            <button id="btn-stop" class="btn btn-red" disabled>Berhenti</button>
            <button id="btn-reset" class="btn btn-gray">Reset</button>
        </div>

        <div class="lap-section">
            <h3>Lap Record</h3>
            <ul id="lap-list"></ul>
        </div>
    </div>
</body>
</html>`,
    css: `* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

body {
    background: radial-gradient(circle at 20% 30%, #4f46e5 0%, #0f172a 80%);
    color: #ffffff;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
}

.glass-container {
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 24px;
    padding: 35px;
    width: 100%;
    max-width: 420px;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
    text-align: center;
}

h2 {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 25px;
    letter-spacing: -0.5px;
    color: rgba(255, 255, 255, 0.9);
}

.display {
    font-family: monospace;
    font-size: 48px;
    font-weight: 700;
    background: rgba(0, 0, 0, 0.2);
    padding: 15px;
    border-radius: 12px;
    margin-bottom: 25px;
    letter-spacing: 1px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    color: #a5b4fc;
}

.controls {
    display: flex;
    gap: 10px;
    margin-bottom: 25px;
}

.btn {
    flex: 1;
    border: none;
    padding: 12px 10px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
}

.btn-green {
    background: #10b981;
    color: white;
}
.btn-green:hover:not(:disabled) {
    background: #059669;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    transform: translateY(-1px);
}

.btn-red {
    background: #ef4444;
    color: white;
}
.btn-red:hover:not(:disabled) {
    background: #dc2626;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    transform: translateY(-1px);
}

.btn-gray {
    background: rgba(255, 255, 255, 0.15);
    color: white;
}
.btn-gray:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.25);
    transform: translateY(-1px);
}

.lap-section {
    text-align: left;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 20px;
}

h3 {
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 10px;
}

#lap-list {
    list-style: none;
    max-height: 120px;
    overflow-y: auto;
}

#lap-list li {
    font-family: monospace;
    font-size: 14px;
    padding: 6px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    display: flex;
    justify-content: space-between;
    color: rgba(255, 255, 255, 0.8);
}
#lap-list li:first-child {
    color: #818cf8;
}`,
    js: `document.addEventListener("DOMContentLoaded", () => {
    let timer = null;
    let startTime = 0;
    let elapsedTime = 0;
    
    const displayEl = document.getElementById("time-display");
    const startBtn = document.getElementById("btn-start");
    const stopBtn = document.getElementById("btn-stop");
    const resetBtn = document.getElementById("btn-reset");
    const lapList = document.getElementById("lap-list");

    function formatTime(ms) {
        const date = new Date(ms);
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');
        const centiseconds = String(Math.floor(date.getUTCMilliseconds() / 10)).padStart(2, '0');
        return \`\${minutes}:\${seconds}.\${centiseconds}\`;
    }

    startBtn.addEventListener("click", () => {
        startTime = Date.now() - elapsedTime;
        timer = setInterval(() => {
            elapsedTime = Date.now() - startTime;
            displayEl.textContent = formatTime(elapsedTime);
        }, 10);
        
        startBtn.disabled = true;
        stopBtn.disabled = false;
        startBtn.textContent = "Lanjutkan";
    });

    stopBtn.addEventListener("click", () => {
        clearInterval(timer);
        timer = null;
        
        // Record a lap
        const li = document.createElement("li");
        const lapIndex = lapList.children.length + 1;
        li.innerHTML = \`<span>Lap \${lapIndex}</span> <span>\${formatTime(elapsedTime)}</span>\`;
        lapList.insertBefore(li, lapList.firstChild);

        startBtn.disabled = false;
        stopBtn.disabled = true;
    });

    resetBtn.addEventListener("click", () => {
        clearInterval(timer);
        timer = null;
        elapsedTime = 0;
        displayEl.textContent = "00:00.00";
        lapList.innerHTML = "";
        
        startBtn.disabled = false;
        stopBtn.disabled = true;
        startBtn.textContent = "Mulai";
    });
});`
  },
  cyberpunk: {
    name: "Cyberpunk Digital Dashboard",
    description: "UI Retro-Futuristik neon dengan visualizer gelombang CSS dan status server.",
    html: `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cyberpunk System Control</title>
</head>
<body>
    <div class="cyber-panel">
        <header class="cyber-header">
            <div class="glitch-text" data-text="SYS_ONLINE">SYS_ONLINE</div>
            <div class="scanline"></div>
        </header>
        
        <main class="cyber-grid">
            <div class="system-status">
                <div class="status-item">
                    <span class="label">CORES:</span>
                    <span class="value cyan-glow">ONLINE [8]</span>
                </div>
                <div class="status-item">
                    <span class="label">MEMORY:</span>
                    <span class="value pink-glow">84.2% USED</span>
                </div>
                <div class="status-item">
                    <span class="label">NET_SPEED:</span>
                    <span class="value yellow-glow">741 MB/S</span>
                </div>
            </div>

            <div class="visualizer-container">
                <div class="wave-bar" style="--h: 30%"></div>
                <div class="wave-bar" style="--h: 60%"></div>
                <div class="wave-bar" style="--h: 90%"></div>
                <div class="wave-bar" style="--h: 50%"></div>
                <div class="wave-bar" style="--h: 70%"></div>
                <div class="wave-bar" style="--h: 40%"></div>
                <div class="wave-bar" style="--h: 80%"></div>
                <div class="wave-bar" style="--h: 95%"></div>
            </div>

            <button id="alert-trigger" class="cyber-btn">TRIGGER SECURITY BREAK</button>
        </main>
    </div>
</body>
</html>`,
    css: `@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;700&display=swap');

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: 'Fira Code', monospace;
}

body {
    background-color: #030310;
    color: #00ffcc;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    padding: 20px;
}

.cyber-panel {
    border: 2px solid #ff0055;
    background: rgba(3, 3, 16, 0.85);
    padding: 30px;
    width: 100%;
    max-width: 450px;
    position: relative;
    box-shadow: 0 0 20px rgba(255, 0, 85, 0.3), inset 0 0 10px rgba(255, 0, 85, 0.2);
}

.cyber-panel::before {
    content: "RETE-KILLER";
    position: absolute;
    top: -12px;
    left: 20px;
    background: #030310;
    padding: 0 10px;
    font-size: 12px;
    font-weight: bold;
    color: #ff0055;
}

.glitch-text {
    font-size: 32px;
    font-weight: bold;
    text-align: center;
    letter-spacing: 2px;
    color: #00ffcc;
    text-shadow: 0 0 8px rgba(0, 255, 204, 0.8);
    margin-bottom: 25px;
}

.cyber-grid {
    display: flex;
    flex-direction: column;
    gap: 25px;
}

.system-status {
    border-left: 3px solid #00ffcc;
    padding-left: 15px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.status-item {
    font-size: 14px;
    display: flex;
    justify-content: space-between;
}

.label {
    color: #8c8ca6;
}

.cyan-glow { color: #00ffcc; text-shadow: 0 0 5px rgba(0, 255, 204, 0.5); }
.pink-glow { color: #ff0055; text-shadow: 0 0 5px rgba(255, 0, 85, 0.5); }
.yellow-glow { color: #ffcc00; text-shadow: 0 0 5px rgba(255, 204, 0, 0.5); }

.visualizer-container {
    height: 100px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px dashed rgba(0, 255, 204, 0.3);
}

.wave-bar {
    width: 10%;
    height: var(--h);
    background: linear-gradient(to top, #ff0055, #00ffcc);
    box-shadow: 0 0 8px rgba(0, 255, 204, 0.4);
    transition: height 0.15s ease-in-out;
}

.cyber-btn {
    background: transparent;
    border: 2px solid #ffcc00;
    color: #ffcc00;
    padding: 12px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
    text-shadow: 0 0 5px rgba(255, 204, 0, 0.5);
}

.cyber-btn:hover {
    background: #ffcc00;
    color: #030310;
    box-shadow: 0 0 15px #ffcc00;
}

.cyber-btn:active {
    transform: scale(0.98);
}

/* scanline scan effect */
.scanline {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background: rgba(0, 255, 204, 0.1);
    animation: scan 4s linear infinite;
}

@keyframes scan {
    0% { top: 0%; }
    100% { top: 100%; }
}
`,
    js: `document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("alert-trigger");
    const bars = document.querySelectorAll(".wave-bar");

    // Dynamic wave simulation
    setInterval(() => {
        bars.forEach(bar => {
            const newHeight = Math.floor(Math.random() * 85) + 15;
            bar.style.height = newHeight + "%";
        });
    }, 150);

    btn.addEventListener("click", () => {
        document.body.style.backgroundColor = "#2a0010";
        const glText = document.querySelector(".glitch-text");
        glText.textContent = "SYS_BREACH";
        glText.style.color = "#ff0055";
        glText.style.textShadow = "0 0 10px #ff0055";
        
        btn.textContent = "RESTORE SYSTEM CORES";
        btn.style.borderColor = "#00ffcc";
        btn.style.color = "#00ffcc";
        btn.style.textShadow = "0 0 5px #00ffcc";

        btn.onclick = () => {
            window.location.reload();
        };
    });
});`
  }
};
