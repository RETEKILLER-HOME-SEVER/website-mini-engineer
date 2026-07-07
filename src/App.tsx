import React, { useState, useEffect, useRef, FormEvent } from "react";
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
  ArrowRight
} from "lucide-react";
import { templates, CodeTemplate } from "./templates";

export default function App() {
  // Input states
  const [subdomain, setSubdomain] = useState("");
  const [activeTab, setActiveTab] = useState<"html" | "css" | "js">("html");
  
  // Code editor states
  const [htmlCode, setHtmlCode] = useState(templates.landing.html);
  const [cssCode, setCssCode] = useState(templates.landing.css);
  const [jsCode, setJsCode] = useState(templates.landing.js);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("landing");

  // System status states
  const [deployMode, setDeployMode] = useState<"VPS" | "Sandbox">("Sandbox");
  const [deployModeReason, setDeployModeReason] = useState("");
  const [activeSites, setActiveSites] = useState<any[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([
    "[SYSTEM] Konsol Log Deployment siap.",
    "[SYSTEM] Menunggu instruksi deployment dari pengguna..."
  ]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [newDeployedUrl, setNewDeployedUrl] = useState<string | null>(null);

  // Guide UI states
  const [activeGuideTab, setActiveGuideTab] = useState<"sudoers" | "vps" | "rollback">("sudoers");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);

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

  // Switch template
  const handleTemplateChange = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    const tmpl = templates[templateKey];
    if (tmpl) {
      setHtmlCode(tmpl.html);
      setCssCode(tmpl.css);
      setJsCode(tmpl.js);
      
      setLogs(prev => [
        ...prev,
        `[SYSTEM] Template '${tmpl.name}' berhasil dimuat ke editor.`
      ]);
    }
  };

  // Trigger copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Validate inputs locally
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

  // Handle Deploy
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

    setIsDeploying(true);
    setLogs([
      `[${new Date().toLocaleTimeString()}] Menghubungkan ke API /api/deploy...`,
    ]);

    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain: subdomain.trim().toLowerCase(),
          htmlCode,
          cssCode,
          jsCode
        })
      });

      const data = await res.json();
      
      // Append logs returned by the server
      if (data.logs && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }

      if (res.ok && data.success) {
        setSuccessMessage(`Sukses menduplikasi file dan merestart Nginx! Website Anda sudah aktif.`);
        setNewDeployedUrl(data.url);
        fetchSites();
        // Clear input after success
        setSubdomain("");
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

  // Handle Delete / Undeploy
  const handleDeleteSite = async (sub: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus situs '${sub}'? Seluruh file dan konfigurasi Nginx vHost terkait akan dibersihkan.`)) {
      return;
    }

    setIsDeleting(sub);
    setLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Memulai pembongkaran (Undeploy) untuk subdomain: ${sub}...`
    ]);

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

  // Render log item with syntax coloring
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-500/10 selection:text-blue-800">
      
      {/* 1. TOP HEADER / BRAND NAVIGATION */}
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
                  v1.0.4
                </span>
              </div>
              <p className="text-[10.5px] text-slate-500">
                Sistem Manajemen Otomatisasi Nginx vHost & Direktori Satu Tombol
              </p>
            </div>
          </div>

          {/* 2. LIVE ENVIRONMENT STATUS BADGE */}
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

      {/* MAIN LAYOUT WRAPPER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">

        {/* FEEDBACK BANNERS */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-sm">Deployment Gagal</p>
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

        {/* BENTO GRID OF DEPLOYER */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT SIDEBAR: FORMS & LOGS (5 Columns) */}
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
                      <span>Sedang Mendeploy...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Deploy Website</span>
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

          {/* RIGHT SIDE: RICH CODE EDITORS (7 Columns) */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col overflow-hidden">
            
            {/* Editor Toolbar Header */}
            <div className="bg-slate-900/80 border-b border-slate-800 px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-blue-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">
                  Situs Editor Kode (HTML/CSS/JS)
                </h3>
              </div>

              {/* Tab Selector buttons */}
              <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl self-start sm:self-auto">
                <button
                  onClick={() => setActiveTab("html")}
                  className={`px-3 py-1 text-xs font-bold transition-all rounded-lg ${
                    activeTab === "html"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  index.html
                </button>
                <button
                  onClick={() => setActiveTab("css")}
                  className={`px-3 py-1 text-xs font-bold transition-all rounded-lg ${
                    activeTab === "css"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  style.css
                </button>
                <button
                  onClick={() => setActiveTab("js")}
                  className={`px-3 py-1 text-xs font-bold transition-all rounded-lg ${
                    activeTab === "js"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  script.js
                </button>
              </div>
            </div>

            {/* Main Code Editor Frame */}
            <div className="relative bg-slate-950 p-4 flex-1 flex flex-col min-h-[380px]">
              
              {/* Static file naming tab indicators inside editing window */}
              <div className="text-[10px] font-mono text-slate-500 mb-2 border-b border-slate-900 pb-1.5 flex items-center justify-between">
                <span>FILE: src/var/www/rete-killer/[subdomain]/{activeTab === "html" ? "index.html" : activeTab === "css" ? "style.css" : "script.js"}</span>
                <span>Type: {activeTab === "html" ? "HTML5 Markup" : activeTab === "css" ? "Cascading Stylesheet" : "ES6 client-script"}</span>
              </div>

              {/* Editor Textareas */}
              {activeTab === "html" && (
                <textarea
                  value={htmlCode}
                  onChange={(e) => setHtmlCode(e.target.value)}
                  className="w-full flex-1 bg-transparent font-mono text-xs text-slate-200 focus:outline-none resize-none leading-relaxed min-h-[340px]"
                  style={{ tabSize: 4 }}
                  spellCheck={false}
                />
              )}

              {activeTab === "css" && (
                <textarea
                  value={cssCode}
                  onChange={(e) => setCssCode(e.target.value)}
                  className="w-full flex-1 bg-transparent font-mono text-xs text-slate-200 focus:outline-none resize-none leading-relaxed min-h-[340px]"
                  style={{ tabSize: 4 }}
                  spellCheck={false}
                />
              )}

              {activeTab === "js" && (
                <textarea
                  value={jsCode}
                  onChange={(e) => setJsCode(e.target.value)}
                  className="w-full flex-1 bg-transparent font-mono text-xs text-slate-200 focus:outline-none resize-none leading-relaxed min-h-[340px]"
                  style={{ tabSize: 4 }}
                  spellCheck={false}
                />
              )}

              {/* Security Banner alert */}
              <div className="mt-4 bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-start gap-2.5 text-[10px] text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Pemeriksaan Sanitasi Otomatis:</strong> Seluruh script di atas akan dikompilasi secara asinkron. Backend Express menyaring input subdomain untuk mencegah injeksi perintah shell sistem.
                </div>
              </div>
            </div>

            {/* Preset description footer */}
            <div className="bg-slate-900 border-t border-slate-800 p-3 px-5 text-xs text-slate-400 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <span>
                <strong>Aktif:</strong> {templates[selectedTemplate]?.name} &mdash; {templates[selectedTemplate]?.description}
              </span>
            </div>
          </div>

        </div>

        {/* 3. LIST OF ACTIVE DEPLOYMENTS LIST CARD */}
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
              className="flex items-center gap-1.5 text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl px-4 py-2 transition-all cursor-pointer"
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
                Silakan ketik nama subdomain di panel atas dan tekan tombol "Deploy Website" untuk meluncurkan situs pertama Anda.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Nama Subdomain</th>
                    <th className="py-3.5 px-4">Live URL Domain</th>
                    <th className="py-3.5 px-4 hidden sm:table-cell">Waktu Deployment</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {activeSites.map((site) => (
                    <tr key={site.subdomain} className="hover:bg-slate-50/50 transition-all">
                      <td className="py-3.5 px-4 text-slate-900 font-bold">{site.subdomain}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600 font-semibold">{site.domain}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200 rounded px-1.5 py-0.5 font-sans">
                            {deployMode === "VPS" ? "Live DNS" : "Sandbox Preview"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 hidden sm:table-cell text-slate-400 font-sans">
                        {new Date(site.deployedAt).toLocaleString("id-ID")}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {/* Go to Site Link */}
                          <a
                            href={deployMode === "VPS" ? site.vpsUrl : site.sandboxUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-1.5 px-3 rounded-lg transition-all font-sans text-xs font-semibold shadow-sm"
                          >
                            <span>Open</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>

                          {/* Delete Site Action */}
                          <button
                            onClick={() => handleDeleteSite(site.subdomain)}
                            disabled={isDeleting === site.subdomain}
                            className={`inline-flex items-center gap-1 py-1.5 px-3 rounded-lg transition-all border font-sans text-xs font-semibold shadow-sm ${
                              isDeleting === site.subdomain
                                ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                                : "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700 cursor-pointer"
                            }`}
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>{isDeleting === site.subdomain ? "Deleting..." : "Hapus"}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 4. VPS DOCUMENTATION & PERMISSION GUIDELINES CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="border-b border-slate-200 pb-3 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-amber-500" />
              <span>Panduan Implementasi Sudoers & VPS (Ubuntu)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Ikuti instruksi di bawah ini untuk mengizinkan server Node.js mengontrol Nginx tanpa memerlukan input kata sandi interaktif.
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
              3. Mekanisme Rollback & Keamanan
            </button>
          </div>

          {/* Sudoers Configuration Guide */}
          {activeGuideTab === "sudoers" && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Secara default, menjalankan perintah <code className="text-rose-600 bg-slate-100 px-1 py-0.5 rounded font-mono">sudo nginx -s reload</code> membutuhkan hak akses root. Agar aplikasi Node.js (yang berjalan di bawah user non-root, misal: <code className="text-blue-600 bg-slate-100 px-1 py-0.5 rounded font-mono">deploy</code> atau <code className="text-blue-600 bg-slate-100 px-1 py-0.5 rounded font-mono">node</code>) bisa melakukan restart Nginx, berikan izin spesifik tanpa kata sandi via <code className="text-blue-600 bg-slate-100 px-1 py-0.5 rounded font-mono">sudo visudo</code>.
                </p>
                <div className="text-xs bg-blue-50/50 border border-blue-100 text-blue-700 p-3 rounded-lg flex items-start gap-2.5">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Penting:</strong> Jangan pernah menjalankan proses Node.js sebagai <code className="text-rose-600 font-semibold bg-slate-100 px-1 py-0.5 rounded font-mono">root</code> karena sangat berbahaya bagi keamanan server. Gunakan hak istimewa terkontrol ini sebagai gantinya.
                  </p>
                </div>
              </div>

              {/* Step-by-Step list */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase">Langkah-Langkah:</h4>
                <ol className="list-decimal list-inside text-xs text-slate-600 space-y-2.5 pl-2 leading-relaxed">
                  <li>
                    Masuk ke VPS Ubuntu Anda via SSH dan buka editor sudoers khusus dengan mengetik perintah berikut:
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
                    Tambahkan baris berikut di bagian paling bawah file tersebut (ganti <code className="text-slate-800 font-semibold">deploy</code> dengan nama user linux yang menjalankan proses Node.js Express Anda):
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
                    Simpan file tersebut (<code className="text-slate-300 font-sans">Ctrl+O</code> lalu <code className="text-slate-300 font-sans">Enter</code> di editor Nano), kemudian keluar (<code className="text-slate-300 font-sans">Ctrl+X</code>).
                  </li>
                  <li>
                    Ubah kepemilikan folder vHost Nginx agar user Node.js Anda dapat menulis file konfigurasi secara langsung tanpa memicu error permission:
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

          {/* VPS Setup Instructions */}
          {activeGuideTab === "vps" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Untuk menerapkan aplikasi ini pada VPS Ubuntu baru Anda, pastikan dependensi server Nginx dan Node.js sudah terinstal serta dikonfigurasi dengan benar.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* VPS Step 1 */}
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
                  <p className="text-[10px] text-slate-400">
                    Ganti <code className="text-slate-500 font-mono">deploy</code> dengan user Node Anda agar proses deployment dapat berjalan lancar.
                  </p>
                </div>

                {/* VPS Step 2 */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-blue-600 flex items-center gap-1.5 uppercase">
                    <ChevronRight className="h-4 w-4" />
                    <span>2. Konfigurasi Wildcard DNS</span>
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Agar setiap subdomain yang dibuat otomatis langsung bisa diakses secara global, tambahkan A Record Wildcard pada DNS Manager domain Anda (Cloudflare, IDWebhost, dll):
                  </p>
                  <div className="bg-slate-900 border border-slate-800 p-2.5 rounded text-[11px] font-mono text-emerald-400">
                    Type: A &mdash; Name: *.rete-killer.web.id &mdash; Value: IP_VPS_ANDA
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Dengan ini, Nginx akan langsung merespons dan mencocokkan setiap subdomain ke folder dinamis secara otomatis.
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* Rollback Details */}
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
                    Command Injection sering terjadi ketika parameter input dimasukkan langsung ke fungsi eksekusi shell. Deployer ini menerapkan pertahanan ketat menggunakan regular expression <code className="text-slate-600 font-mono">/^[a-zA-Z0-9-]+$/</code>. Karakter berbahaya seperti <code className="text-rose-600">;</code>, <code className="text-rose-600">&amp;&amp;</code>, <code className="text-rose-600">|</code>, <code className="text-rose-600">&gt;</code>, dan spasi akan ditolak sepenuhnya sebelum perintah dieksekusi.
                  </p>
                </div>

                <div className="space-y-2 leading-relaxed">
                  <p className="font-bold text-amber-600 font-mono">2. Rollback Atomik (Gagal-Aman)</p>
                  <p className="text-slate-500 text-[11px]">
                    Jika langkah reload Nginx menemui kegagalan (misalnya karena bentrok port atau format konfigurasi rusak), blok penanganan error (<code className="text-amber-600">try-catch</code>) akan mendeteksi masalah tersebut dan langsung mengeksekusi rutin pembersihan instan: menghapus symlink di <code className="text-slate-600 font-mono">sites-enabled</code>, menghapus file di <code className="text-slate-600 font-mono">sites-available</code>, and menghapus direktori web yang sempat terbuat.
                  </p>
                </div>
              </div>

              <div className="bg-slate-900 text-slate-300 p-3.5 rounded-lg border border-slate-800 flex items-center justify-between text-xs font-mono">
                <span>Rutin Rollback Diaktifkan secara Otomatis</span>
                <span className="text-emerald-400 font-bold uppercase text-[10px] tracking-wider px-2 py-0.5 bg-emerald-950/40 border border-emerald-900 rounded">
                  Status: Secure Active
                </span>
              </div>
            </div>
          )}

        </div>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p>&copy; 2026 RETE-KILLER DEPLOY. All rights reserved.</p>
          <p className="font-mono">VPS local clock: 2026-07-07 01:45 UTC</p>
        </div>
      </footer>

    </div>
  );
}
