import React, { useState, useEffect, useRef, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Terminal as TerminalIcon, 
  Globe, 
  Trash2, 
  Server, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  Code2, 
  ExternalLink, 
  ShieldCheck, 
  Activity, 
  Copy, 
  Check, 
  Info,
  ShieldAlert,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Plus,
  UploadCloud,
  FileCode,
  FileText,
  File,
  Link as LinkIcon,
  Play,
  FolderOpen
} from "lucide-react";
import { templates, CodeTemplate } from "./templates";

export interface ProjectFile {
  name: string;
  content: string;
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<"startup" | "file">("startup");

  // Input states
  const [subdomain, setSubdomain] = useState("");
  
  // Workspace files with local storage persistence
  const [files, setFiles] = useState<ProjectFile[]>(() => {
    const saved = localStorage.getItem("rete_killer_workspace_files");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Gagal parsing local storage:", e);
      }
    }
    return [
      { name: "index.html", content: templates.landing.html },
      { name: "style.css", content: templates.landing.css },
      { name: "script.js", content: templates.landing.js }
    ];
  });

  const [selectedFileName, setSelectedFileName] = useState<string>("index.html");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("landing");

  // New file input state
  const [newFileName, setNewFileName] = useState("");
  const [dragActive, setDragActive] = useState(false);

  // System status states
  const [deployMode, setDeployMode] = useState<"VPS" | "Sandbox">("Sandbox");
  const [deployModeReason, setDeployModeReason] = useState("");
  const [activeSites, setActiveSites] = useState<any[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([
    "[SYSTEM] Konsol Log Deployment siap.",
    "[SYSTEM] Multi-file workspace aktif. Menunggu instruksi dari Anda..."
  ]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [newDeployedUrl, setNewDeployedUrl] = useState<string | null>(null);

  // Guide UI states
  const [activeGuideTab, setActiveGuideTab] = useState<"sudoers" | "vps" | "rollback">("sudoers");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Sync files to local storage on changes
  useEffect(() => {
    localStorage.setItem("rete_killer_workspace_files", JSON.stringify(files));
  }, [files]);

  // Load system status & deployed sites on mount
  useEffect(() => {
    fetchStatus();
    fetchSites();
  }, []);

  // Auto scroll terminal logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      setDeployMode(data.mode);
      setDeployModeReason(data.reason);
    } catch (err) {
      console.error("Gagal memuat status sistem:", err);
    }
  };

  const fetchSites = async () => {
    try {
      const res = await fetch("/api/sites");
      const data = await res.json();
      if (data.success) {
        setActiveSites(data.sites);
      }
    } catch (err) {
      console.error("Gagal memuat daftar website:", err);
    }
  };

  // Switch design template (overwrites default files but keeps others)
  const handleTemplateChange = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    const tmpl = templates[templateKey];
    if (tmpl) {
      // Overwrite or create index.html, style.css, and script.js in files array
      setFiles(prev => {
        const otherFiles = prev.filter(f => f.name !== "index.html" && f.name !== "style.css" && f.name !== "script.js");
        return [
          { name: "index.html", content: tmpl.html },
          { name: "style.css", content: tmpl.css },
          { name: "script.js", content: tmpl.js },
          ...otherFiles
        ];
      });
      setSelectedFileName("index.html");
      setLogs(prev => [
        ...prev,
        `[SYSTEM] Template '${tmpl.name}' berhasil dimuat ke workspace.`
      ]);
    }
  };

  // Trigger copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Validate subdomain format
  const validateSubdomain = (val: string): string | null => {
    if (!val) return "Nama subdomain wajib diisi.";
    const clean = val.trim().toLowerCase();
    if (clean.length < 3 || clean.length > 30) {
      return "Subdomain harus berukuran 3 hingga 30 karakter.";
    }
    const regex = /^[a-zA-Z0-9-]+$/;
    if (!regex.test(clean)) {
      return "Format subdomain tidak valid. Hanya huruf, angka, dan tanda hubung (-) yang diperbolehkan.";
    }
    return null;
  };

  // Handle deploying multi-file project
  const handleDeploy = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setNewDeployedUrl(null);

    const error = validateSubdomain(subdomain);
    if (error) {
      setErrorMessage(error);
      return;
    }

    // Ensure index.html exists
    const hasIndex = files.some(f => f.name === "index.html");
    if (!hasIndex) {
      setErrorMessage("Proyek tidak memiliki berkas utama 'index.html'. Silakan buat index.html terlebih dahulu sebelum melakukan deployment.");
      return;
    }

    setIsDeploying(true);
    setLogs([
      `[${new Date().toLocaleTimeString()}] Menghubungkan ke API /api/deploy...`,
      `[SYSTEM] Mengirimkan total ${files.length} berkas dari workspace...`
    ]);

    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain: subdomain.trim().toLowerCase(),
          files, // Passing entire files array
          // Fallback legacy values for older backend compatibility
          htmlCode: files.find(f => f.name === "index.html")?.content || "",
          cssCode: files.find(f => f.name === "style.css")?.content || "",
          jsCode: files.find(f => f.name === "script.js")?.content || ""
        })
      });

      const data = await res.json();
      
      if (data.logs && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }

      if (res.ok && data.success) {
        setSuccessMessage(`Sukses menyinkronkan seluruh berkas dan meluncurkan Nginx! Website Anda sudah aktif.`);
        setNewDeployedUrl(data.url);
        fetchSites();
        setSubdomain(""); // Reset subdomain input on success
      } else {
        setErrorMessage(data.error || "Gagal melakukan deployment. Silakan periksa log terminal.");
      }
    } catch (err: any) {
      setErrorMessage("Koneksi gagal atau server terputus.");
      setLogs(prev => [
        ...prev,
        `[FATAL] Gagal menghubungi API server: ${err.message || err}`
      ]);
    } finally {
      setIsDeploying(false);
    }
  };

  // Handle site deletion
  const handleDeleteSite = async (sub: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus situs '${sub}'? Seluruh file dan konfigurasi Nginx vHost terkait akan dibersihkan.`)) {
      return;
    }

    setIsDeleting(sub);
    setLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Memulai pembongkaran (Undeploy) untuk subdomain: ${sub}...`
    ]);

    // Berikan jeda waktu 800ms agar animasi exit 3D berputar dulu dengan anggun
    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      const res = await fetch(`/api/sites/${sub}`, {
        method: "DELETE"
      });
      const data = await res.json();

      if (data.logs && Array.isArray(data.logs)) {
        setLogs(prev => [...prev, ...data.logs]);
      }

      if (res.ok && data.success) {
        setSuccessMessage(`Situs '${sub}' berhasil dihapus dan konfigurasi Nginx dilepaskan.`);
        fetchSites();
      } else {
        setErrorMessage(data.error || "Gagal menghapus situs.");
      }
    } catch (err: any) {
      setErrorMessage("Gagal memproses permintaan hapus.");
      setLogs(prev => [
        ...prev,
        `[ERROR] Gagal menghapus: ${err.message || err}`
      ]);
    } finally {
      setIsDeleting(null);
    }
  };

  // File explorer helper: create a new blank file
  const handleCreateFile = () => {
    const cleanName = newFileName.trim();
    if (!cleanName) return;

    // Check formatting
    if (!/\.(html|css|js)$/i.test(cleanName)) {
      alert("Format nama berkas salah! Nama berkas harus berakhiran .html, .css, atau .js!");
      return;
    }

    // Check unique name
    if (files.some(f => f.name.toLowerCase() === cleanName.toLowerCase())) {
      alert(`Berkas dengan nama '${cleanName}' sudah ada dalam workspace.`);
      return;
    }

    // Default templates based on extension
    let initialContent = "";
    if (cleanName.endsWith(".html")) {
      initialContent = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Halaman ${cleanName.replace(".html", "")}</title>
</head>
<body>
    <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1>Selamat Datang di Halaman Baru</h1>
        <p>Halaman ini (${cleanName}) berhasil dibuat di workspace Anda.</p>
        <p><a href="index.html">Kembali ke Halaman Utama</a></p>
    </div>
</body>
</html>`;
    } else if (cleanName.endsWith(".css")) {
      initialContent = `/* Stylesheet baru untuk ${cleanName} */\nbody {\n    background-color: #f0fdf4;\n}`;
    } else if (cleanName.endsWith(".js")) {
      initialContent = `// JavaScript baru untuk ${cleanName}\nconsole.log("Script ${cleanName} aktif!");`;
    }

    setFiles(prev => [...prev, { name: cleanName, content: initialContent }]);
    setSelectedFileName(cleanName);
    setNewFileName("");
    setLogs(prev => [
      ...prev,
      `[FILE] Berkas baru berhasil dibuat: ${cleanName}`
    ]);
  };

  // Delete a workspace file
  const handleDeleteFile = (name: string) => {
    if (name === "index.html") {
      alert("Berkas 'index.html' adalah halaman utama wajib dan tidak boleh dihapus!");
      return;
    }

    if (!confirm(`Hapus berkas '${name}' dari workspace Anda?`)) {
      return;
    }

    setFiles(prev => prev.filter(f => f.name !== name));
    setLogs(prev => [
      ...prev,
      `[FILE] Berkas dihapus dari workspace: ${name}`
    ]);

    // Fallback selection to index.html if the active file was deleted
    if (selectedFileName === name) {
      setSelectedFileName("index.html");
    }
  };

  // Parse uploaded files
  const handleFileUpload = (uploadedFiles: FileList | null) => {
    if (!uploadedFiles) return;

    Array.from(uploadedFiles).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const name = file.name.toLowerCase();
        
        // Match only web files
        if (name.endsWith(".html") || name.endsWith(".css") || name.endsWith(".js")) {
          setFiles(prev => {
            const exists = prev.some(f => f.name === file.name);
            if (exists) {
              return prev.map(f => f.name === file.name ? { ...f, content } : f);
            } else {
              return [...prev, { name: file.name, content }];
            }
          });

          setLogs(prev => [
            ...prev,
            `[UPLOAD] Sukses mengunggah berkas: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`
          ]);
        } else {
          alert(`Berkas '${file.name}' ditolak! Hanya berkas .html, .css, dan .js yang dapat diunggah.`);
        }
      };
      reader.readAsText(file);
    });
  };

  // Drag and drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Helper action: inject style/script links into an HTML file
  const autoConnectStyleScript = (fileName: string) => {
    setFiles(prev => prev.map(f => {
      if (f.name === fileName && f.name.endsWith(".html")) {
        let content = f.content;
        
        // CSS check & inject
        const hasStyle = prev.some(pf => pf.name === "style.css");
        if (hasStyle && !content.includes("style.css")) {
          if (content.includes("</head>")) {
            content = content.replace("</head>", '    <link rel="stylesheet" href="style.css">\n</head>');
          } else if (content.includes("<head>")) {
            content = content.replace("<head>", '<head>\n    <link rel="stylesheet" href="style.css">');
          } else {
            content = '<link rel="stylesheet" href="style.css">\n' + content;
          }
        }

        // JS check & inject
        const hasScript = prev.some(pf => pf.name === "script.js");
        if (hasScript && !content.includes("script.js")) {
          if (content.includes("</body>")) {
            content = content.replace("</body>", '    <script src="script.js"></script>\n</body>');
          } else {
            content = content + '\n<script src="script.js"></script>';
          }
        }

        setLogs(logsPrev => [
          ...logsPrev,
          `[INTEGRASI] Otomatis menyematkan style.css dan script.js ke dalam ${fileName}.`
        ]);

        return { ...f, content };
      }
      return f;
    }));
  };

  // Render log line in terminal with syntax colors
  const renderLogLine = (line: string, index: number) => {
    let colorClass = "text-slate-300";
    if (line.includes("[ERROR]") || line.includes("[FATAL]")) {
      colorClass = "text-rose-400 font-semibold";
    } else if (line.includes("[ROLLBACK]")) {
      colorClass = "text-amber-400";
    } else if (line.includes("🎉 DEPLOYMENT SUKSES") || line.includes("Sukses!") || line.includes("valid!") || line.includes("berhasil")) {
      colorClass = "text-emerald-400 font-semibold";
    } else if (line.includes("[SYSTEM]") || line.includes("[INFO]")) {
      colorClass = "text-sky-400";
    } else if (line.includes("[FILE]") || line.includes("[UPLOAD]")) {
      colorClass = "text-indigo-400";
    } else if (line.includes("[SIMULASI]")) {
      colorClass = "text-purple-400";
    }

    return (
      <div key={index} className={`font-mono text-[11px] leading-relaxed py-1 border-b border-slate-900/30 last:border-0 ${colorClass}`}>
        <span className="text-slate-600 select-none mr-2">{(index + 1).toString().padStart(2, '0')}</span>
        {line}
      </div>
    );
  };

  // Find the selected file context
  const activeWorkspaceFile = files.find(f => f.name === selectedFileName) || files[0] || { name: "", content: "" };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans pb-28 selection:bg-blue-500/10 selection:text-blue-800">
      
      {/* 1. TOP HEADER BRAND PANEL */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 px-6 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/10">
              <Server className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-tight text-slate-800">
                  RETE-KILLER <span className="text-blue-600 font-extrabold">DEPLOY</span>
                </h1>
                <span className="text-[10px] uppercase font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                  v1.1.0 Multi-File
                </span>
              </div>
              <p className="text-[10.5px] text-slate-500">
                Sistem Manajemen Otomatisasi Nginx vHost & Direktori Satu Tombol
              </p>
            </div>
          </div>

          {/* ENVIRONMENT STATUS BADGE */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-2 px-3.5 self-start md:self-auto">
            <div className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${deployMode === "VPS" ? "bg-emerald-400" : "bg-purple-400"}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${deployMode === "VPS" ? "bg-emerald-500" : "bg-purple-500"}`}></span>
            </div>
            <div className="text-left">
              <div className="text-xs font-semibold flex items-center gap-1.5">
                <span className="text-slate-500">Mode:</span>
                <span className={deployMode === "VPS" ? "text-emerald-600 font-bold" : "text-purple-600 font-bold"}>
                  {deployMode === "VPS" ? "Ubuntu VPS Live" : "Sandbox Simulator"}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 max-w-[280px] truncate" title={deployModeReason}>
                {deployModeReason || "Mendeteksi kesiapan konfigurasi server..."}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT WRAPPER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">

        {/* FEEDBACK NOTIFICATION BANNERS */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-sm">Operasi Gagal</p>
              <p className="text-xs text-rose-700 mt-1">{errorMessage}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-sm">Sukses Beroperasi</p>
              <p className="text-xs text-emerald-700 mt-1">{successMessage}</p>
              {newDeployedUrl && (
                <div className="mt-3 flex items-center gap-2">
                  <a 
                    href={newDeployedUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 py-1.5 px-3.5 rounded-lg transition-colors shadow-sm"
                  >
                    <span>Kunjungi Website</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================= TAB 1: STARTUP (DEPLOY & SITE LIST) ======================= */}
        {currentTab === "startup" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* LEFT COLUMN: FORM & TERMINAL */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                
                {/* 1. DEPLOYMENT INPUT CARD */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Sparkles className="h-24 w-24 text-slate-400" />
                  </div>

                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <span>Mulai Deploy Baru</span>
                  </h2>

                  <form onSubmit={handleDeploy} className="space-y-4">
                    
                    {/* SUBDOMAIN INPUT FIELD */}
                    <div>
                      <label htmlFor="subdomain" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Nama Subdomain <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative rounded-xl shadow-sm">
                        <input
                          type="text"
                          id="subdomain"
                          value={subdomain}
                          onChange={(e) => setSubdomain(e.target.value.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase())}
                          placeholder="portofolio-saya"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-4 pr-[180px] text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono font-medium"
                          disabled={isDeploying}
                          required
                        />
                        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-xs font-bold text-slate-400 bg-slate-100/80 my-[1px] mr-[1px] border-l border-slate-200 px-3 rounded-r-xl font-mono">
                          .rete-killer.web.id
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                        Hanya huruf, angka, dan tanda hubung (-). Contoh: <code className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded font-mono">portofolio-saya</code>
                      </p>
                    </div>

                    {/* QUICK START PRESETS */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Gunakan Preset Desain (Template)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(templates).map(([key, value]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleTemplateChange(key)}
                            className={`py-2 px-1 text-center rounded-xl border text-[11px] font-bold transition-all duration-200 block truncate ${
                              selectedTemplate === key
                                ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm"
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                            title={value.description}
                            disabled={isDeploying}
                          >
                            {value.name.split(" ")[0]} {value.name.split(" ")[1] || ""}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1.5">
                        ⚠️ Memuat preset akan mereset berkas <code className="font-mono">index.html</code>, <code className="font-mono">style.css</code>, dan <code className="font-mono">script.js</code> di workspace.
                      </p>
                    </div>

                    {/* THE SUBMIT BUTTON */}
                    <button
                      type="submit"
                      disabled={isDeploying || !subdomain}
                      className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-lg ${
                        isDeploying
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
                          : !subdomain 
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                            : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/10 active:scale-[0.99]"
                      }`}
                    >
                      {isDeploying ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Mendeploy {files.length} File...</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          <span>Deploy Website ({files.length} Berkas)</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* 2. REAL-TIME UNIX TERMINAL CONSOLE LOGS */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                      <span className="text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase">
                        Terminal Log Deployment
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                        STDOUT
                      </span>
                      <button 
                        onClick={() => setLogs(["[SYSTEM] Log dibersihkan.", "[SYSTEM] Menunggu aksi..."])}
                        className="text-[10px] hover:text-white text-slate-500 underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Log view */}
                  <div className="bg-slate-950 border border-slate-950 rounded-xl p-3 h-[240px] overflow-y-auto font-mono scrollbar-thin scrollbar-thumb-slate-800">
                    {logs.map((line, index) => renderLogLine(line, index))}
                    <div ref={terminalEndRef} />
                  </div>
                  <p className="text-[9px] text-slate-500 font-mono mt-2 text-right">
                    VPS Log sync: 2026-07-07 UTC
                  </p>
                </div>

              </div>

              {/* RIGHT COLUMN: ACTIVE SITES & DOCUMENTATION */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                
                {/* LIST OF ACTIVE DEPLOYMENTS LIST CARD */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4 mb-4">
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Globe className="h-4.5 w-4.5 text-blue-500" />
                        <span>Situs Aktif Di-deploy</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Daftar website statis yang aktif berjalan di server Nginx.
                      </p>
                    </div>
                    
                    <button
                      onClick={fetchSites}
                      className="flex items-center gap-1.5 text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl px-4 py-2 transition-all cursor-pointer shadow-sm"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Refresh List</span>
                    </button>
                  </div>

                  {activeSites.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <Globe className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-slate-500">Belum Ada Website yang Terpasang</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                        Silakan ketik nama subdomain di panel kiri dan tekan tombol "Deploy Website" untuk meluncurkan situs pertama Anda.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1" style={{ perspective: "1200px" }}>
                      <AnimatePresence>
                        {activeSites.map((site) => {
                          const isCurrentlyDeleting = isDeleting === site.subdomain;
                          return (
                            <motion.div
                              key={site.subdomain}
                              initial={{ opacity: 0, y: 20, scale: 0.95, rotateX: 0 }}
                              animate={isCurrentlyDeleting ? {
                                opacity: 0,
                                scale: 0.4,
                                rotateX: -85,
                                rotateY: 30,
                                z: -180,
                                y: 50,
                                transition: { duration: 0.8, ease: "easeInOut" }
                              } : {
                                opacity: 1,
                                y: 0,
                                scale: 1,
                                rotateX: 0,
                                rotateY: 0,
                                z: 0
                              }}
                              exit={{
                                opacity: 0,
                                scale: 0.4,
                                rotateX: -85,
                                rotateY: 30,
                                z: -180,
                                y: 50,
                                transition: { duration: 0.8 }
                              }}
                              whileHover={!isCurrentlyDeleting ? {
                                scale: 1.02,
                                rotateY: 4,
                                rotateX: -2,
                                z: 12,
                                transition: { duration: 0.2 }
                              } : {}}
                              style={{ transformStyle: "preserve-3d" }}
                              className={`bg-white border rounded-2xl p-4 shadow-sm transition-shadow hover:shadow-md relative overflow-hidden flex flex-col justify-between h-40 ${
                                isCurrentlyDeleting
                                  ? "border-rose-300 bg-rose-50/50 ring-2 ring-rose-500/20"
                                  : "border-slate-200"
                              }`}
                            >
                              {/* 3D background grid effect */}
                              <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,transparent)] pointer-events-none opacity-40" />
                              
                              {/* Glowing status dot */}
                              <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                                <span className="relative flex h-2 w-2">
                                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isCurrentlyDeleting ? "bg-rose-500 animate-pulse" : "bg-emerald-500 animate-pulse"}`}></span>
                                </span>
                                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                  isCurrentlyDeleting ? "bg-rose-100 text-rose-700" : "bg-emerald-50 text-emerald-700"
                                }`}>
                                  {isCurrentlyDeleting ? "Menghapus..." : "Running"}
                                </span>
                              </div>

                              <div className="space-y-1 z-10">
                                <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                                  Subdomain
                                </div>
                                <div className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                                  <div className="h-6 w-6 rounded bg-blue-50 flex items-center justify-center border border-blue-100">
                                    <Globe className="h-3.5 w-3.5 text-blue-600" />
                                  </div>
                                  <span>{site.subdomain}</span>
                                </div>
                                <div className="text-xs text-blue-600 font-semibold font-mono truncate hover:underline mt-1">
                                  <a href={deployMode === "VPS" ? site.vpsUrl : site.sandboxUrl} target="_blank" rel="noopener noreferrer">
                                    {site.domain}
                                  </a>
                                </div>
                              </div>

                              <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-2 z-10">
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(site.deployedAt).toLocaleDateString("id-ID")}
                                </span>
                                
                                <div className="flex items-center gap-2">
                                  {/* Go to Site Link */}
                                  <a
                                    href={deployMode === "VPS" ? site.vpsUrl : site.sandboxUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 py-1.5 px-3 rounded-xl transition-all font-sans text-xs font-semibold shadow-sm"
                                  >
                                    <span>Open</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </a>

                                  {/* Delete Site Action with 3D Trigger */}
                                  <button
                                    onClick={() => handleDeleteSite(site.subdomain)}
                                    disabled={isDeleting !== null}
                                    className={`inline-flex items-center gap-1 py-1.5 px-3 rounded-xl transition-all border font-sans text-xs font-semibold shadow-sm ${
                                      isCurrentlyDeleting
                                        ? "bg-rose-100 border-rose-300 text-rose-400 cursor-not-allowed"
                                        : isDeleting !== null
                                          ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                                          : "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700 cursor-pointer hover:scale-[1.03] active:scale-[0.97]"
                                    }`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>{isCurrentlyDeleting ? "Deleting" : "Hapus"}</span>
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* VPS IMPLEMENTATION GUIDELINES */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="border-b border-slate-200 pb-3 mb-4">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <ShieldAlert className="h-4.5 w-4.5 text-amber-500" />
                      <span>Panduan Implementasi Sudoers & VPS (Ubuntu)</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Ikuti instruksi di bawah ini untuk mengizinkan server Node.js mengontrol Nginx tanpa kata sandi.
                    </p>
                  </div>

                  {/* Guide Subtabs */}
                  <div className="flex border-b border-slate-200/80 mb-5 gap-4 overflow-x-auto pb-1">
                    <button
                      onClick={() => setActiveGuideTab("sudoers")}
                      className={`pb-2 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
                        activeGuideTab === "sudoers"
                          ? "border-blue-600 text-blue-600 font-extrabold"
                          : "border-transparent text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      1. Konfigurasi Sudoers
                    </button>
                    <button
                      onClick={() => setActiveGuideTab("vps")}
                      className={`pb-2 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
                        activeGuideTab === "vps"
                          ? "border-blue-600 text-blue-600 font-extrabold"
                          : "border-transparent text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      2. Persiapan Server VPS
                    </button>
                    <button
                      onClick={() => setActiveGuideTab("rollback")}
                      className={`pb-2 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
                        activeGuideTab === "rollback"
                          ? "border-blue-600 text-blue-600 font-extrabold"
                          : "border-transparent text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      3. Keamanan & Rollback
                    </button>
                  </div>

                  {/* Sudoers Guide */}
                  {activeGuideTab === "sudoers" && (
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3">
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Secara default, menjalankan perintah <code className="text-rose-600 bg-slate-100 px-1 py-0.5 rounded font-mono">sudo nginx -s reload</code> membutuhkan hak akses root. Berikan izin spesifik tanpa kata sandi via <code className="text-blue-600 bg-slate-100 px-1 py-0.5 rounded font-mono">sudo visudo</code>.
                        </p>
                        <div className="text-xs bg-blue-50/50 border border-blue-100 text-blue-700 p-3 rounded-lg flex items-start gap-2.5">
                          <Info className="h-4 w-4 shrink-0 mt-0.5" />
                          <p className="leading-relaxed">
                            <strong>Penting:</strong> Jangan pernah menjalankan proses Node.js sebagai <code className="text-rose-600 font-semibold bg-slate-100 px-1 py-0.5 rounded font-mono">root</code> karena berbahaya bagi keamanan server. Gunakan hak istimewa terkontrol.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-700 uppercase">Langkah-Langkah:</h4>
                        <ol className="list-decimal list-inside text-xs text-slate-600 space-y-2.5 pl-2 leading-relaxed">
                          <li>
                             SSH ke VPS Anda dan buka editor sudoers:
                            <div className="mt-2 flex items-center justify-between bg-slate-900 border border-slate-800 p-2.5 px-3.5 rounded-lg font-mono text-slate-200">
                              <span className="text-blue-400">sudo visudo</span>
                              <button
                                onClick={() => copyToClipboard("sudo visudo", "visudo")}
                                className="text-[10px] font-sans hover:text-white text-slate-400 flex items-center gap-1 cursor-pointer"
                              >
                                {copiedText === "visudo" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                <span>{copiedText === "visudo" ? "Copied" : "Copy"}</span>
                              </button>
                            </div>
                          </li>
                          <li>
                            Tambahkan baris berikut di bagian paling bawah file (ganti <code className="text-slate-800 font-semibold font-mono">deploy</code> dengan user Node.js):
                            <div className="mt-2 flex items-center justify-between bg-slate-900 border border-slate-800 p-2.5 px-3.5 rounded-lg font-mono text-[11px] text-slate-200">
                              <span className="text-emerald-400 text-left block overflow-x-auto whitespace-pre">
                                deploy ALL=(ALL) NOPASSWD: /usr/sbin/nginx -t, /usr/sbin/nginx -s reload
                              </span>
                              <button
                                onClick={() => copyToClipboard("deploy ALL=(ALL) NOPASSWD: /usr/sbin/nginx -t, /usr/sbin/nginx -s reload", "sudoers_line")}
                                className="text-[10px] font-sans hover:text-white text-slate-400 flex items-center gap-1 ml-4 cursor-pointer shrink-0"
                              >
                                {copiedText === "sudoers_line" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                <span>{copiedText === "sudoers_line" ? "Copied" : "Copy"}</span>
                              </button>
                            </div>
                          </li>
                          <li>
                            Simpan dan ubah kepemilikan folder vHost Nginx:
                            <div className="mt-2 flex items-center justify-between bg-slate-900 border border-slate-800 p-2.5 px-3.5 rounded-lg font-mono text-[11px] text-slate-200">
                              <span className="text-blue-400 text-left block overflow-x-auto whitespace-pre">
                                sudo chown -R deploy:deploy /etc/nginx/sites-available /etc/nginx/sites-enabled
                              </span>
                              <button
                                onClick={() => copyToClipboard("sudo chown -R deploy:deploy /etc/nginx/sites-available /etc/nginx/sites-enabled", "chmod_nginx")}
                                className="text-[10px] font-sans hover:text-white text-slate-400 flex items-center gap-1 ml-4 cursor-pointer shrink-0"
                              >
                                {copiedText === "chmod_nginx" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                <span>{copiedText === "chmod_nginx" ? "Copied" : "Copy"}</span>
                              </button>
                            </div>
                          </li>
                        </ol>
                      </div>
                    </div>
                  )}

                  {/* VPS Setup */}
                  {activeGuideTab === "vps" && (
                    <div className="space-y-4">
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Pastikan dependensi server Nginx dan Node.js diinstal dengan benar pada VPS Ubuntu Anda.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                          <h4 className="text-xs font-bold text-blue-600 flex items-center gap-1.5 uppercase">
                            <ChevronRight className="h-4 w-4" />
                            <span>1. Instalasi Node & Nginx</span>
                          </h4>
                          <div className="bg-slate-900 border border-slate-800 p-2.5 rounded font-mono text-[11px] leading-relaxed text-slate-200 select-all whitespace-pre-line">
                            sudo apt update
                            sudo apt install nginx nodejs npm -y
                            sudo mkdir -p /var/www/rete-killer
                            sudo chown -R deploy:deploy /var/www/rete-killer
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                          <h4 className="text-xs font-bold text-blue-600 flex items-center gap-1.5 uppercase">
                            <ChevronRight className="h-4 w-4" />
                            <span>2. Wildcard DNS</span>
                          </h4>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            Tambahkan A Record Wildcard pada DNS Manager domain Anda (Cloudflare, IDWebhost, dll):
                          </p>
                          <div className="bg-slate-900 border border-slate-800 p-2.5 rounded text-[11px] font-mono text-emerald-400">
                            Type: A &mdash; Name: *.rete-killer.web.id &mdash; Value: IP_VPS_ANDA
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Safety & Rollback */}
                  {activeGuideTab === "rollback" && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-emerald-600" />
                        <h4 className="text-xs font-bold text-slate-700 uppercase">
                          Sistem Transaksional & Proteksi Shell Injection
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-2 leading-relaxed">
                          <p className="font-bold text-blue-600">1. Proteksi Eksekusi Child Process</p>
                          <p className="text-slate-500 text-[11px]">
                            Setiap subdomain disaring ketat menggunakan regex <code className="text-slate-600 font-mono">/^[a-zA-Z0-9-]+$/</code>. Karakter jahat seperti <code className="text-rose-600">;</code>, <code className="text-rose-600">&amp;&amp;</code>, <code className="text-rose-600">|</code> ditolak mentah-mentah.
                          </p>
                        </div>
                        <div className="space-y-2 leading-relaxed">
                          <p className="font-bold text-amber-600 font-mono">2. Rollback Atomik (Gagal-Aman)</p>
                          <p className="text-slate-500 text-[11px]">
                            Jika reload Nginx gagal, rutin pembersihan instan dijalankan otomatis untuk menghapus sisa-sisa symlink, file, dan direktori yang cacat.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB 2: FILE MANAGER & CODE WORKSPACE ======================= */}
        {currentTab === "file" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
            
            {/* LEFT COLUMN: WORKSPACE EXPLORER & FILE ADDERS (4 Columns) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* WORKSPACE FILE EXPLORER CARD */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
                <div className="border-b border-slate-200 pb-3 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-blue-500" />
                    <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                      Berkas Workspace ({files.length})
                    </h2>
                  </div>
                  <span className="text-[10px] font-bold font-mono bg-slate-100 text-slate-500 py-0.5 px-2 rounded-full">
                    Sistem File Virtual
                  </span>
                </div>

                {/* Explorer File List */}
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto mb-4 pr-1 scrollbar-thin">
                  {files.map((file) => {
                    const isSelected = selectedFileName === file.name;
                    const isHtml = file.name.endsWith(".html");
                    const isCss = file.name.endsWith(".css");
                    const isJs = file.name.endsWith(".js");

                    return (
                      <div 
                        key={file.name}
                        onClick={() => setSelectedFileName(file.name)}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border group ${
                          isSelected 
                            ? "bg-blue-50 border-blue-200 text-blue-900 shadow-sm" 
                            : "bg-slate-50 hover:bg-slate-100/70 border-slate-200 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isHtml && <FileCode className="h-4.5 w-4.5 text-blue-500 shrink-0" />}
                          {isCss && <Code2 className="h-4.5 w-4.5 text-purple-500 shrink-0" />}
                          {isJs && <FileText className="h-4.5 w-4.5 text-amber-500 shrink-0" />}
                          {!isHtml && !isCss && !isJs && <File className="h-4.5 w-4.5 text-slate-500 shrink-0" />}
                          
                          <span className={`text-xs font-mono truncate ${isSelected ? "font-bold" : "font-medium"}`}>
                            {file.name}
                          </span>
                        </div>

                        {/* File Action buttons */}
                        <div className="flex items-center gap-1.5">
                          {isHtml && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                autoConnectStyleScript(file.name);
                              }}
                              className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[10px] font-bold bg-blue-600 text-white hover:bg-blue-700 py-1 px-2 rounded-lg transition-all"
                              title="Hubungkan file CSS & JS ini secara otomatis"
                            >
                              Integrasikan Style & JS
                            </button>
                          )}
                          
                          {file.name !== "index.html" && (
                            <div
                              className="icon-trash text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFile(file.name);
                              }}
                              title="Hapus berkas"
                              role="button"
                              tabIndex={0}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* FILE INTEGRATION HELP CHEATSHEET */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-500 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 border-b border-slate-200 pb-1.5">
                    <LinkIcon className="h-3.5 w-3.5 text-blue-500" />
                    <span>Panduan Menghubungkan Halaman (Hyperlink)</span>
                  </div>
                  <p className="leading-relaxed">
                    Setiap berkas diletakkan pada folder yang sama. Hubungkan halaman satu dengan yang lain menggunakan tag jangkar biasa:
                  </p>
                  <div className="space-y-1.5 font-mono text-[10px] text-slate-600">
                    {files.filter(f => f.name !== selectedFileName && f.name.endsWith(".html")).map(f => (
                      <div key={f.name} className="flex items-center justify-between bg-white border border-slate-200 rounded p-1.5">
                        <span className="truncate">&lt;a href="{f.name}"&gt;Ke {f.name}&lt;/a&gt;</span>
                        <button
                          onClick={() => copyToClipboard(`<a href="${f.name}">Ke ${f.name.replace(".html", "")}</a>`, `link-${f.name}`)}
                          className="text-blue-500 hover:underline flex items-center gap-0.5"
                        >
                          {copiedText === `link-${f.name}` ? "Copied" : "Copy"}
                        </button>
                      </div>
                    ))}
                    {files.filter(f => f.name.endsWith(".html")).length <= 1 && (
                      <p className="text-[10px] text-slate-400 font-sans italic">Buat berkas HTML tambahan terlebih dahulu untuk memunculkan jalan pintas link di sini.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* NEW FILE GENERATOR CARD */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5">
                  <Plus className="h-4.5 w-4.5 text-blue-500" />
                  <span>Tambah Berkas Baru</span>
                </h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value.replace(/[^a-zA-Z0-9.-]/g, ""))}
                    placeholder="about.html, custom.css, script-baru.js"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <button
                    onClick={handleCreateFile}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl px-4 py-2.5 transition-all shadow-sm"
                  >
                    Buat File
                  </button>
                </div>
                <p className="text-[9.5px] text-slate-400 mt-2">
                  Nama file harus menyertakan ekstensi web valid: <code className="font-semibold text-slate-500">.html</code>, <code className="font-semibold text-slate-500">.css</code>, atau <code className="font-semibold text-slate-500">.js</code>.
                </p>
              </div>

              {/* Sleek FILE UPLOADER CARD */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5">
                  <UploadCloud className="h-4.5 w-4.5 text-blue-500" />
                  <span>Unggah Berkas Komponen</span>
                </h2>
                
                {/* Drag zone box */}
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                    dragActive 
                      ? "border-blue-500 bg-blue-50/50" 
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/30"
                  }`}
                >
                  <UploadCloud className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Tarik & Lepaskan File di Sini</p>
                  <p className="text-[10px] text-slate-400 mt-1">Hanya mendukung tipe berkas .html, .css, atau .js</p>
                  
                  <div className="mt-3">
                    <label className="cursor-pointer inline-flex items-center justify-center bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 py-1.5 px-3 rounded-lg text-[11px] font-bold transition-all shadow-sm">
                      <span>Pilih File Manual</span>
                      <input 
                        type="file" 
                        multiple 
                        accept=".html,.css,.js" 
                        className="hidden" 
                        onChange={(e) => handleFileUpload(e.target.files)}
                      />
                    </label>
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: DYNAMIC CODE EDITOR WORKSPACE (8 Columns) */}
            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col overflow-hidden min-h-[500px]">
              
              {/* Editor Header Toolbar */}
              <div className="bg-slate-900/80 border-b border-slate-800 px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-blue-400" />
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">
                    Editor Workspace Multi-Berkas
                  </h3>
                </div>

                {/* Tabs showing current files for rapid switching */}
                <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl self-start sm:self-auto max-w-full overflow-x-auto scrollbar-none gap-0.5">
                  {files.map(f => (
                    <button
                      key={f.name}
                      onClick={() => setSelectedFileName(f.name)}
                      className={`px-3 py-1 text-xs font-mono font-bold transition-all rounded-lg shrink-0 ${
                        selectedFileName === f.name
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code window interface */}
              <div className="relative bg-slate-950 p-4 flex-1 flex flex-col">
                
                {/* Meta file data label */}
                <div className="text-[10px] font-mono text-slate-500 mb-2 border-b border-slate-900 pb-1.5 flex items-center justify-between">
                  <span>BERKAS AKTIF: /var/www/rete-killer/[subdomain]/{activeWorkspaceFile.name}</span>
                  <div className="flex items-center gap-3">
                    <span>Kapasitas: {((activeWorkspaceFile.content.length) / 1024).toFixed(2)} KB</span>
                    <span className="text-emerald-400">● Tersimpan di Local Workspace</span>
                  </div>
                </div>

                {/* Editor Textarea */}
                <textarea
                  value={activeWorkspaceFile.content}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFiles(prev => prev.map(f => f.name === activeWorkspaceFile.name ? { ...f, content: val } : f));
                  }}
                  className="w-full flex-1 bg-transparent font-mono text-xs text-slate-200 focus:outline-none resize-none leading-relaxed min-h-[380px]"
                  style={{ tabSize: 4 }}
                  spellCheck={false}
                />

                {/* Security alert banner inside editor */}
                <div className="mt-4 bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-start gap-2.5 text-[10px] text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>Pemeriksaan Sanitasi Otomatis:</strong> Seluruh berkas dalam workspace diunggah dalam satu transaksi asinkron. Sistem menyaring nama subdomain secara ketat untuk mencegah injeksi perintah shell pada VPS.
                  </div>
                </div>
              </div>

              {/* Status footer banner */}
              <div className="bg-slate-900 border-t border-slate-800 p-3 px-5 text-xs text-slate-400 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span>
                    Sedang mengedit <strong className="font-mono text-white">{activeWorkspaceFile.name}</strong>
                  </span>
                </div>
                {activeWorkspaceFile.name.endsWith(".html") && (
                  <button
                    onClick={() => autoConnectStyleScript(activeWorkspaceFile.name)}
                    className="text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-blue-400 py-1 px-2.5 border border-slate-700 rounded-lg transition-all"
                  >
                    Auto-Link style.css & script.js
                  </button>
                )}
              </div>

            </div>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 mb-14">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p>&copy; 2026 RETE-KILLER DEPLOY. All rights reserved.</p>
          <p className="font-mono">VPS Local Time: 2026-07-07 02:31 UTC</p>
        </div>
      </footer>

      {/* ======================= PERSISTENT FLOATING BOTTOM NAVIGATION BAR ======================= */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-xl z-50 py-3.5 px-6">
        <div className="max-w-md mx-auto flex items-center justify-around gap-4">
          
          {/* STARTUP TAB BUTTON */}
          <button
            onClick={() => setCurrentTab("startup")}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
              currentTab === "startup"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/15"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            <Play className={`h-5 w-5 ${currentTab === "startup" ? "text-white" : "text-slate-500"}`} />
            <span className="text-[10px] font-extrabold uppercase tracking-widest mt-1">
              𝐒𝐓𝐀𝐑𝐓𝐔𝐏 (Deploy)
            </span>
          </button>

          {/* FILE TAB BUTTON */}
          <button
            onClick={() => setCurrentTab("file")}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
              currentTab === "file"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/15"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            <FolderOpen className={`h-5 w-5 ${currentTab === "file" ? "text-white" : "text-slate-500"}`} />
            <span className="text-[10px] font-extrabold uppercase tracking-widest mt-1">
              𝐅𝐈𝐋𝐄 (Workspace)
            </span>
          </button>

        </div>
      </div>

    </div>
  );
}
