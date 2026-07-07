import express from "express";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser
app.use(express.json({ limit: '10mb' }));

// Ensure local deployed_sites directory exists for Sandbox mode
const localDeployDir = path.join(process.cwd(), "deployed_sites");
if (!fs.existsSync(localDeployDir)) {
  fs.mkdirSync(localDeployDir, { recursive: true });
}

// Ensure a temp directory exists for Nginx configuration generation
const tempConfigDir = path.join(process.cwd(), "temp_configs");
if (!fs.existsSync(tempConfigDir)) {
  fs.mkdirSync(tempConfigDir, { recursive: true });
}

// Define paths for VPS environment
const VPS_WEB_ROOT = "/var/www/rete-killer";
const NGINX_AVAILABLE = "/etc/nginx/sites-available";
const NGINX_ENABLED = "/etc/nginx/sites-enabled";

// Serve deployed sites statically at /sites (Sandbox Mode)
app.use("/sites", express.static(localDeployDir));

// Helper function to run terminal commands safely
function runCommand(command: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

// Helper to determine if we should run in real VPS Mode or simulated Sandbox Mode
function getDeployMode(): { mode: "VPS" | "Sandbox"; reason: string } {
  // If explicitly requested via env variable
  if (process.env.VPS_REAL_DEPLOY === "true") {
    return { mode: "VPS", reason: "VPS_REAL_DEPLOY environment variable is set to true." };
  }
  
  // Auto-detect based on directory availability and write permissions
  try {
    const hasNginx = fs.existsSync("/etc/nginx");
    const hasVarWww = fs.existsSync("/var/www");
    if (hasNginx && hasVarWww) {
      return { mode: "VPS", reason: "Nginx directory and /var/www detected on host." };
    }
  } catch (e) {
    // Ignore and fallback
  }

  return { 
    mode: "Sandbox", 
    reason: "Running in sandboxed environment (Nginx directories not detected or VPS_REAL_DEPLOY not enabled)." 
  };
}

// List of reserved subdomains that cannot be registered
const RESERVED_SUBDOMAINS = [
  "api", "admin", "www", "sites", "dashboard", "static", "nginx", "root",
  "system", "config", "control", "panel", "vercel", "net", "com", "org",
  "dev", "test", "demo", "mail", "ftp", "secure", "app", "localhost"
];

/**
 * API ENDPOINT: GET /api/status
 * Returns current deployment mode and configuration info
 */
app.get("/api/status", (req, res) => {
  const { mode, reason } = getDeployMode();
  res.json({
    mode,
    reason,
    vpsPaths: {
      webRoot: VPS_WEB_ROOT,
      nginxAvailable: NGINX_AVAILABLE,
      nginxEnabled: NGINX_ENABLED
    },
    sandboxUrlPrefix: "/sites/"
  });
});

/**
 * API ENDPOINT: GET /api/sites
 * Lists all active deployments
 */
app.get("/api/sites", (req, res) => {
  const { mode } = getDeployMode();
  const sites: any[] = [];

  try {
    const targetDir = mode === "VPS" ? VPS_WEB_ROOT : localDeployDir;
    
    if (fs.existsSync(targetDir)) {
      const folders = fs.readdirSync(targetDir);
      
      for (const folder of folders) {
        const folderPath = path.join(targetDir, folder);
        const stat = fs.statSync(folderPath);
        
        if (stat.isDirectory()) {
          // Read metadata or files to verify it's a deployment
          const hasIndex = fs.existsSync(path.join(folderPath, "index.html"));
          
          if (hasIndex) {
            sites.push({
              subdomain: folder,
              domain: `${folder}.rete-killer.web.id`,
              deployedAt: stat.mtime,
              sandboxUrl: `/sites/${folder}/index.html`,
              vpsUrl: `http://${folder}.rete-killer.web.id`
            });
          }
        }
      }
    }
  } catch (error: any) {
    console.error("Error listing sites:", error);
  }

  // Sort by deployment time (newest first)
  sites.sort((a, b) => b.deployedAt.getTime() - a.deployedAt.getTime());
  res.json({ success: true, sites, mode });
});

/**
 * API ENDPOINT: POST /api/deploy
 * Standard deployment engine with strict sanitization and rollback routines
 */
app.post("/api/deploy", async (req, res) => {
  const { subdomain, htmlCode, cssCode, jsCode } = req.body;
  const logs: string[] = [];
  const { mode } = getDeployMode();

  logs.push(`[${new Date().toLocaleTimeString()}] Menyiapkan deployment...`);
  logs.push(`[SYSTEM] Target lingkungan terdeteksi: ${mode} Mode.`);

  // 1. INPUT SANITIZATION & VALIDATION
  if (!subdomain) {
    return res.status(400).json({ success: false, error: "Nama subdomain wajib diisi.", logs });
  }

  // Strict regex check to prevent command injection & directory traversal
  const cleanSubdomain = subdomain.trim().toLowerCase();
  const subdomainRegex = /^[a-zA-Z0-9-]+$/;
  if (!subdomainRegex.test(cleanSubdomain)) {
    return res.status(400).json({
      success: false,
      error: "Nama subdomain tidak valid. Hanya diperbolehkan huruf, angka, dan tanda hubung (-).",
      logs
    });
  }

  if (cleanSubdomain.length < 3 || cleanSubdomain.length > 30) {
    return res.status(400).json({
      success: false,
      error: "Panjang subdomain harus antara 3 hingga 30 karakter.",
      logs
    });
  }

  if (RESERVED_SUBDOMAINS.includes(cleanSubdomain)) {
    return res.status(400).json({
      success: false,
      error: `Subdomain '${cleanSubdomain}' merupakan subdomain sistem cadangan dan tidak dapat digunakan.`,
      logs
    });
  }

  // 2. DEFINE DEPLOYMENT PATHS
  const webRootFolder = mode === "VPS" ? VPS_WEB_ROOT : localDeployDir;
  const targetWebDir = path.join(webRootFolder, cleanSubdomain);
  
  const nginxConfigAvailable = path.join(NGINX_AVAILABLE, cleanSubdomain);
  const nginxConfigEnabled = path.join(NGINX_ENABLED, cleanSubdomain);
  const localTempConfigPath = path.join(tempConfigDir, `${cleanSubdomain}.conf`);

  // Flags for rollback
  let folderCreated = false;
  let filesWritten: string[] = [];
  let tempConfigCreated = false;
  let nginxConfigCreated = false;
  let nginxSymlinkCreated = false;

  try {
    // 3. FOLDER & FILES CREATION (fs)
    logs.push(`[${new Date().toLocaleTimeString()}] [1/4] Membuat folder website di ${targetWebDir}...`);
    
    // Check duplication (if overwriting is allowed we just proceed, otherwise we could reject. We allow overwriting to enable easy updates)
    const isUpdate = fs.existsSync(targetWebDir);
    if (isUpdate) {
      logs.push(`[INFO] Subdomain '${cleanSubdomain}' sudah ada. Memperbarui file yang ada...`);
    } else {
      fs.mkdirSync(targetWebDir, { recursive: true });
      folderCreated = true;
    }

    // Write index.html
    const htmlWithRefs = htmlCode.includes('href="style.css"') 
      ? htmlCode 
      : htmlCode.replace('</head>', '  <link rel="stylesheet" href="style.css">\n</head>');
    
    const htmlWithScript = htmlWithRefs.includes('src="script.js"')
      ? htmlWithRefs
      : htmlWithRefs.replace('</body>', '  <script src="script.js"></script>\n</body>');

    fs.writeFileSync(path.join(targetWebDir, "index.html"), htmlWithScript);
    filesWritten.push("index.html");

    fs.writeFileSync(path.join(targetWebDir, "style.css"), cssCode || "/* Custom CSS */");
    filesWritten.push("style.css");

    fs.writeFileSync(path.join(targetWebDir, "script.js"), jsCode || "// Custom JavaScript");
    filesWritten.push("script.js");

    logs.push(`[${new Date().toLocaleTimeString()}] Sukses menulis berkas: index.html, style.css, script.js`);

    // 4. AUTOMATED NGINX VHOST CONFIGURATION (child_process)
    if (mode === "VPS") {
      logs.push(`[${new Date().toLocaleTimeString()}] [2/4] Menyusun konfigurasi Nginx vHost untuk ${cleanSubdomain}.rete-killer.web.id...`);
      
      const nginxConfigContent = `server {
    listen 80;
    server_name ${cleanSubdomain}.rete-killer.web.id;

    root ${VPS_WEB_ROOT}/${cleanSubdomain};
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # Custom security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
}
`;

      // Write temp configuration file first (since the main Nginx directory requires root/sudo)
      fs.writeFileSync(localTempConfigPath, nginxConfigContent);
      tempConfigCreated = true;

      logs.push(`[${new Date().toLocaleTimeString()}] Menyalin file konfigurasi ke ${nginxConfigAvailable}...`);
      // Copy to sites-available using sudo
      await runCommand(`sudo cp "${localTempConfigPath}" "${nginxConfigAvailable}"`);
      nginxConfigCreated = true;

      logs.push(`[${new Date().toLocaleTimeString()}] [3/4] Mengaktifkan konfigurasi vHost via symlink ke sites-enabled...`);
      // Create symlink
      await runCommand(`sudo ln -sf "${nginxConfigAvailable}" "${nginxConfigEnabled}"`);
      nginxSymlinkCreated = true;

      logs.push(`[${new Date().toLocaleTimeString()}] Memverifikasi sintaksis konfigurasi Nginx (nginx -t)...`);
      // Test Nginx configuration syntax
      try {
        await runCommand("sudo nginx -t");
        logs.push(`[INFO] Sintaksis Nginx valid!`);
      } catch (nginxTestError: any) {
        logs.push(`[ERROR] Sintaksis Nginx salah:\n${nginxTestError.stderr || nginxTestError.stdout}`);
        throw new Error("Sintaksis Nginx tidak valid. Membatalkan deployment.");
      }

      logs.push(`[${new Date().toLocaleTimeString()}] [4/4] Memuat ulang (reload) server Nginx...`);
      // Reload Nginx service
      await runCommand("sudo nginx -s reload");
      logs.push(`[${new Date().toLocaleTimeString()}] Nginx berhasil direload!`);

      // Clean up temp config file
      if (fs.existsSync(localTempConfigPath)) {
        fs.unlinkSync(localTempConfigPath);
      }
    } else {
      // Sandbox Simulated Mode
      logs.push(`[${new Date().toLocaleTimeString()}] [2/4] Menyusun konfigurasi Nginx (Simulasi)...`);
      logs.push(`[SIMULASI] Menulis file vHost virtual ke ./temp_configs/${cleanSubdomain}.conf`);
      
      const nginxConfigContent = `# SIMULATED NGINX CONFIG FOR SANDBOX
server {
    listen 80;
    server_name ${cleanSubdomain}.rete-killer.web.id;
    root ${targetWebDir};
    index index.html;
}
`;
      fs.writeFileSync(localTempConfigPath, nginxConfigContent);
      tempConfigCreated = true;

      logs.push(`[${new Date().toLocaleTimeString()}] [3/4] Membuat symlink virtual (Simulasi)...`);
      logs.push(`[SIMULASI] Menghubungkan sites-available ke sites-enabled secara virtual.`);
      
      logs.push(`[${new Date().toLocaleTimeString()}] [4/4] Memuat ulang server Nginx (Simulasi)...`);
      logs.push(`[SIMULASI] Perintah 'sudo nginx -s reload' berhasil dieksekusi secara virtual.`);
    }

    logs.push(`[${new Date().toLocaleTimeString()}] 🎉 DEPLOYMENT SUKSES!`);

    const domainUrl = mode === "VPS" 
      ? `http://${cleanSubdomain}.rete-killer.web.id` 
      : `/sites/${cleanSubdomain}/index.html`;

    res.json({
      success: true,
      subdomain: cleanSubdomain,
      domain: `${cleanSubdomain}.rete-killer.web.id`,
      url: domainUrl,
      mode,
      logs
    });

  } catch (err: any) {
    logs.push(`[${new Date().toLocaleTimeString()}] [FATAL] Terjadi kegagalan saat deploy: ${err.message || err}`);
    logs.push(`[ROLLBACK] Memulai proses pembersihan otomatis (Rollback)...`);

    // Clean up temporary local config
    if (tempConfigCreated && fs.existsSync(localTempConfigPath)) {
      try {
        fs.unlinkSync(localTempConfigPath);
        logs.push(`[ROLLBACK] Berkas konfigurasi sementara dihapus.`);
      } catch (e) {}
    }

    // Clean up Nginx enabled symlink
    if (nginxSymlinkCreated) {
      try {
        await runCommand(`sudo rm -f "${nginxConfigEnabled}"`);
        logs.push(`[ROLLBACK] Symlink Nginx di sites-enabled dihapus.`);
      } catch (e) {
        logs.push(`[WARNING] Gagal menghapus symlink Nginx: ${e}`);
      }
    }

    // Clean up Nginx available config
    if (nginxConfigCreated) {
      try {
        await runCommand(`sudo rm -f "${nginxConfigAvailable}"`);
        logs.push(`[ROLLBACK] Konfigurasi Nginx di sites-available dihapus.`);
      } catch (e) {
        logs.push(`[WARNING] Gagal menghapus konfigurasi Nginx: ${e}`);
      }
    }

    // Clean up static website files
    if (folderCreated && fs.existsSync(targetWebDir)) {
      try {
        // Delete directory recursively
        fs.rmSync(targetWebDir, { recursive: true, force: true });
        logs.push(`[ROLLBACK] Direktori website ${targetWebDir} berhasil dihapus.`);
      } catch (e) {
        logs.push(`[WARNING] Gagal menghapus direktori website: ${e}`);
      }
    }

    logs.push(`[ROLLBACK] Selesai membersihkan server. Keadaan server kembali aman.`);

    res.status(500).json({
      success: false,
      error: err.message || "Gagal melakukan deployment.",
      logs
    });
  }
});

/**
 * API ENDPOINT: DELETE /api/sites/:subdomain
 * Deletes an active website and cleans up Nginx configuration
 */
app.delete("/api/sites/:subdomain", async (req, res) => {
  const { subdomain } = req.params;
  const { mode } = getDeployMode();
  const logs: string[] = [];

  const cleanSubdomain = subdomain.trim().toLowerCase();
  const subdomainRegex = /^[a-zA-Z0-9-]+$/;
  if (!subdomainRegex.test(cleanSubdomain)) {
    return res.status(400).json({ success: false, error: "Format subdomain tidak valid." });
  }

  logs.push(`[${new Date().toLocaleTimeString()}] Memulai penghapusan subdomain: ${cleanSubdomain}...`);

  try {
    const webRootFolder = mode === "VPS" ? VPS_WEB_ROOT : localDeployDir;
    const targetWebDir = path.join(webRootFolder, cleanSubdomain);
    const nginxConfigAvailable = path.join(NGINX_AVAILABLE, cleanSubdomain);
    const nginxConfigEnabled = path.join(NGINX_ENABLED, cleanSubdomain);

    // 1. Remove Nginx configuration if in VPS mode
    if (mode === "VPS") {
      logs.push(`Menghapus symlink Nginx di sites-enabled...`);
      await runCommand(`sudo rm -f "${nginxConfigEnabled}"`);

      logs.push(`Menghapus konfigurasi Nginx di sites-available...`);
      await runCommand(`sudo rm -f "${nginxConfigAvailable}"`);

      logs.push(`Memuat ulang konfigurasi Nginx...`);
      await runCommand("sudo nginx -s reload");
    }

    // 2. Remove files
    if (fs.existsSync(targetWebDir)) {
      logs.push(`Menghapus file dan direktori website di ${targetWebDir}...`);
      fs.rmSync(targetWebDir, { recursive: true, force: true });
    }

    logs.push(`Penghapusan sukses!`);
    res.json({ success: true, logs });

  } catch (error: any) {
    logs.push(`[ERROR] Gagal menghapus: ${error.message || error}`);
    res.status(500).json({ success: false, error: error.message || "Gagal menghapus deployment.", logs });
  }
});

async function startServer() {
  // Vite middleware integration for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
