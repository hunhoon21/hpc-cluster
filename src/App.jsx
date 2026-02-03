import { useState, useEffect, useCallback, useRef } from "react";

/* ═══════════════════════════════════════════════════════
   AVATAR OnE  v1.2  —  ML Training Platform Demo
   
   v1.2 Changes:
   · Test execution = user-initiated (same as pipeline execution)
   · Resource threshold-based approval (above → admin, below → immediate)
   · Test run reference (optional annotation in main execution)
   · Concurrent execution limit (max 1 running → others queue)
   
   Flow: Builder → Test Run → Execution Request → Approval → Run → Model
   ═══════════════════════════════════════════════════════ */

const uid = () => "WL-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 3).toUpperCase();
const mid = () => "MD-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 3).toUpperCase();
const rid = () => "TR-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 3).toUpperCase();
const now = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0") + " " + String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0"); };

// Resource threshold — requests above this require admin approval
const THRESHOLD = { gpu: 4, mem: 128 };

const INIT_SPECS = [
  { id: "SP-001", name: "LLM-FineTune-v3", version: "1.2.0", image: "registry.avatar.io/llm-trainer:3.1", status: "ready", created: "2025-02-01", components: 4, gpu: "A100 x 4", mem: "128GB" },
  { id: "SP-002", name: "ResNet-Exp-42", version: "2.0.1", image: "registry.avatar.io/cv-resnet:2.0", status: "ready", created: "2025-01-28", components: 3, gpu: "V100 x 2", mem: "64GB" },
];

const INIT_TEST_RUNS = [
  { id: "TR-INIT01", specId: "SP-001", specName: "LLM-FineTune-v3", status: "passed", gpu: "A100 x 2", mem: "64GB", created: "2025-01-29 15:30", duration: "0.34s", log: "[OK] 이미지 로드 성공 (A100 x 2)\n[OK] 환경 변수 검증 완료\n[OK] 컴포넌트 초기화 성공\n[OK] 파이프라인 실행 완료 (0.34s)\nResult: PASS" },
];

const INIT_WORKLOADS = [
  { id: "WL-DEMO1", name: "BERT-Classifier", specId: "SP-001", requester: "정연구원", status: "completed", priority: "high", gpu: "A100 x 2", mem: "64GB", submitted: "2025-01-30 11:00", approved: "2025-01-30 12:00", testRunRef: "TR-INIT01", completedAt: "2025-01-31 09:15", needsApproval: true },
];

const INIT_MODELS = [
  { id: "MD-DEMO1", name: "bert-cls-ep30", workloadId: "WL-DEMO1", workload: "BERT-Classifier", created: "2025-01-31 09:15", size: "1.8 GB", metrics: { accuracy: "91.7%", loss: "0.058" } },
];

const RESOURCES = {
  gpu_a100: { total: 16, label: "GPU (A100)", unit: "기", color: "#1D4ED8" },
  gpu_v100: { total: 8, label: "GPU (V100)", unit: "기", color: "#7E22CE" },
  memory: { total: 2048, label: "메모리", unit: "GB", color: "#B45309" },
  cpu: { total: 256, label: "CPU", unit: "코어", color: "#047857" },
};

const LABEL = { high: "높음", medium: "보통", low: "낮음", running: "실행 중", queued: "대기", pending: "승인대기", completed: "완료", failed: "실패", rejected: "반려", ready: "준비됨", draft: "작성중", passed: "통과", waiting: "대기중", immediate: "자동승인" };

/* ─── Icons (SVG path data) ─── */
const ICONS = { builder: "M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h4v4H7V7zm6 0h4v2h-4V7zm0 4h4v2h-4v-2zM7 13h10v2H7v-2z", play: "M8 5v14l11-7L8 5z", check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z", queue: "M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z", monitor: "M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7v2H8v2h8v-2h-2v-2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z", model: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5", user: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z", admin: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z", up: "M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z", down: "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41 1.41z", close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z", test: "M19.8 18.4L14 10.67V6.5l1.35-1.69c.26-.33.03-.81-.39-.81H9.04c-.42 0-.65.48-.39.81L10 6.5v4.17L4.2 18.4c-.49.66-.02 1.6.8 1.6h14c.82 0 1.29-.94.8-1.6z", dl: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z", home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z", file: "M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z", run: "M8 5v14l11-7L8 5z", dot: "M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z", link: "M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z", threshold: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" };

const I = ({ n, s = 18, c = "currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={c} style={{ flexShrink: 0 }}>
    <path d={ICONS[n] || ICONS.dot}/>
  </svg>
);

/* ─── Shared Components ─── */
const Badge = ({ v, children }) => {
  const m = { high: ["#FEE2E2","#B91C1C"], medium: ["#FEF3C7","#92400E"], low: ["#DCFCE7","#166534"], running: ["#DBEAFE","#1E40AF"], queued: ["#FEF3C7","#92400E"], pending: ["#F3E8FF","#6B21A8"], completed: ["#DCFCE7","#166534"], ready: ["#DCFCE7","#166534"], draft: ["#F3F4F6","#374151"], passed: ["#DCFCE7","#166534"], waiting: ["#FEF3C7","#92400E"], failed: ["#FEE2E2","#B91C1C"], rejected: ["#FEE2E2","#B91C1C"], immediate: ["#DBEAFE","#1E40AF"] };
  const [bg, fg] = m[v] || ["#F3F4F6","#374151"];
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: bg, color: fg, letterSpacing: 0.2 }}>{children}</span>;
};

const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", padding: 24, transition: "box-shadow .15s", ...(onClick ? { cursor: "pointer" } : {}), ...style }}>{children}</div>
);
const Title = ({ children, sub }) => (
  <div style={{ marginBottom: 24 }}>
    <h2 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: -0.4, color: "#0F172A" }}>{children}</h2>
    {sub && <p style={{ margin: "5px 0 0", fontSize: 13, color: "#64748B", lineHeight: 1.5 }}>{sub}</p>}
  </div>
);

const Btn = ({ children, v = "default", sz = "md", onClick, disabled, icon, style: st }) => {
  const szz = { sm: { padding: "5px 12px", fontSize: 12 }, md: { padding: "8px 18px", fontSize: 13 }, lg: { padding: "11px 24px", fontSize: 14 } };
  const vv = { primary: { background: "#0F172A", color: "#fff" }, danger: { background: "#FEF2F2", color: "#B91C1C" }, success: { background: "#F0FDF4", color: "#166534" }, ghost: { background: "transparent", color: "#64748B" }, default: { background: "#F1F5F9", color: "#334155" }, accent: { background: "#EFF6FF", color: "#1E40AF" } };
  return (
    <button onClick={disabled ? undefined : onClick} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", borderRadius: 8, cursor: disabled ? "default" : "pointer", fontWeight: 600, fontFamily: "inherit", transition: "all .12s", opacity: disabled ? 0.35 : 1, whiteSpace: "nowrap", ...szz[sz], ...vv[v], ...st }}>
      {icon && <I n={icon} s={sz === "sm" ? 13 : 15} />}{children}
    </button>
  );
};

const TH = ({ children, w, a = "left" }) => <th style={{ padding: "10px 14px", fontSize: 11, fontWeight: 600, color: "#64748B", textAlign: a, borderBottom: "2px solid #E2E8F0", background: "#F8FAFC", width: w, letterSpacing: 0.4, textTransform: "uppercase", whiteSpace: "nowrap" }}>{children}</th>;
const TD = ({ children, a = "left", b }) => <td style={{ padding: "12px 14px", fontSize: 13, textAlign: a, borderBottom: "1px solid #F1F5F9", fontWeight: b ? 600 : 400, color: b ? "#0F172A" : "#334155" }}>{children}</td>;

const InputField = ({ label, value, onChange, placeholder, mono, disabled }) => (
  <div>
    <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#64748B", marginBottom: 5 }}>{label}</label>
    <input value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, fontFamily: mono ? "'JetBrains Mono',monospace" : "inherit", outline: "none", boxSizing: "border-box", background: disabled ? "#F8FAFC" : "#fff", color: "#0F172A", transition: "border-color .15s" }} />
  </div>
);

/* helper: parse gpu count from string like "A100 x 4" */
const parseGpuCount = (gpuStr) => {
  const m = gpuStr.match(/x\s*(\d+)/i);
  return m ? parseInt(m[1]) : 1;
};
const parseMemNum = (memStr) => parseInt(memStr) || 0;

/* check if workload exceeds resource threshold */
const exceedsThreshold = (gpuStr, memStr) => {
  return parseGpuCount(gpuStr) >= THRESHOLD.gpu || parseMemNum(memStr) >= THRESHOLD.mem;
};

/* ═══════════════════════════ MAIN APP ═══════════════════════════ */
export default function App() {
  const [mode, setMode] = useState("user");
  const [page, setPage] = useState("home");
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [specs, setSpecs] = useState(INIT_SPECS);
  const [testRuns, setTestRuns] = useState(INIT_TEST_RUNS);
  const [workloads, setWorkloads] = useState(INIT_WORKLOADS);
  const [models, setModels] = useState(INIT_MODELS);

  const flash = useCallback((m) => { setToast(m); setTimeout(() => setToast(null), 3500); }, []);
  useEffect(() => { setPage("home"); }, [mode]);

  /* ─── Execution Engine (max 1 concurrent, ~10s per job) ─── */
  const MAX_CONCURRENT = 1;
  const EXEC_TIME = 10000; // 10 seconds

  // Process queue: start next queued job if under concurrency limit
  const processQueue = useCallback(() => {
    setWorkloads(prev => {
      const runCount = prev.filter(w => w.status === "running").length;
      if (runCount >= MAX_CONCURRENT) return prev;
      const sorted = [...prev.filter(w => w.status === "queued")].sort((a,b) => {
        const p = {high:0,medium:1,low:2};
        return (p[a.priority]??1) - (p[b.priority]??1);
      });
      const next = sorted[0];
      if (!next) return prev;
      return prev.map(w => w.id === next.id ? { ...w, status: "running" } : w);
    });
  }, []);

  // On workloads change, check if we should start execution or process queue
  const prevWorkloadsRef = useRef(workloads);
  useEffect(() => {
    const prev = prevWorkloadsRef.current;
    prevWorkloadsRef.current = workloads;
    
    // Find newly running workloads
    const prevStatusMap = new Map(prev.map(w => [w.id, w.status]));
    const newlyRunning = workloads.filter(w => w.status === "running" && prevStatusMap.get(w.id) !== "running");
    newlyRunning.forEach(w => {
      setTimeout(() => {
        const t = now();
        setWorkloads(wl => {
          const updated = wl.map(x => x.id === w.id ? { ...x, status: "completed", completedAt: t } : x);
          const completed = updated.find(x => x.id === w.id);
          if (completed) {
            const mName = completed.name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-") + "-final";
            const sizes = ["380 MB", "1.2 GB", "2.4 GB", "5.8 GB", "14.2 GB"];
            setModels(prev => [...prev, {
              id: mid(), name: mName, workloadId: w.id, workload: completed.name,
              created: t, size: sizes[Math.floor(Math.random() * sizes.length)],
              metrics: { accuracy: (85 + Math.random() * 10).toFixed(1) + "%", loss: (0.02 + Math.random() * 0.1).toFixed(3) }
            }]);
            flash(`✓ ${completed.name} 실행 완료 — 결과 모델이 생성되었습니다.`);
          }
          return updated;
        });
      }, EXEC_TIME);
    });
    
    // If a job just completed or just queued, try to start next
    const justCompleted = workloads.some(w => w.status === "completed" && prevStatusMap.get(w.id) === "running");
    const justQueued = workloads.some(w => w.status === "queued" && prevStatusMap.get(w.id) !== "queued");
    if (justCompleted || justQueued) {
      setTimeout(processQueue, 300);
    }
  }, [workloads, flash, processQueue]);

  /* ─── Test Run (user-initiated, same as pipeline execution) ─── */
  const runTest = useCallback((specId) => {
    const spec = specs.find(s => s.id === specId);
    if (!spec) return;
    const tr = {
      id: rid(), specId, specName: spec.name, status: "running",
      gpu: spec.gpu, mem: spec.mem, created: now(), duration: null, log: ""
    };
    setTestRuns(prev => [...prev, tr]);
    flash("테스트 실행을 시작합니다...");
    
    setTimeout(() => {
      setTestRuns(prev => prev.map(t => t.id === tr.id ? {
        ...t, status: "passed", duration: (0.2 + Math.random() * 0.5).toFixed(2) + "s",
        log: `[OK] 이미지 로드 성공 (${spec.gpu})\n[OK] 환경 변수 검증 완료\n[OK] 컴포넌트 초기화 성공 (${spec.components}개)\n[OK] 파이프라인 실행 완료\nResult: PASS`
      } : t));
      flash("✓ 테스트 실행 완료 — 결과를 확인하세요.");
    }, 2500);
    
    return tr.id;
  }, [specs, flash]);

  /* ─── Workload Submission ─── */
  const addWorkload = useCallback((data) => {
    const needs = exceedsThreshold(data.gpu, data.mem);
    const wl = {
      id: uid(), ...data,
      status: needs ? "pending" : "queued",
      needsApproval: needs,
      submitted: now(), approved: null, completedAt: null
    };
    setWorkloads(prev => [...prev, wl]);
    
    if (needs) {
      flash("⚠ 자원 임계치 초과 — 관리자 승인이 필요합니다.");
    } else {
      flash("✓ 자원 임계치 미만 — 실행 대기열에 진입합니다.");
    }
  }, [flash]);

  /* ─── Admin Approval ─── */
  const approveWorkload = useCallback((id) => {
    setWorkloads(wl => wl.map(w => w.id === id ? { ...w, status: "queued", approved: now() } : w));
    flash("✓ 승인 완료 — 실행 대기열에 진입했습니다.");
  }, [flash]);

  const rejectWorkload = useCallback((id) => {
    setWorkloads(wl => wl.map(w => w.id === id ? { ...w, status: "rejected" } : w));
    flash("반려 처리되었습니다.");
  }, [flash]);

  const addSpec = useCallback((s) => setSpecs(prev => [...prev, s]), []);

  /* ─── Derived State ─── */
  const pending = workloads.filter(w => w.status === "pending");
  const queued = workloads.filter(w => w.status === "queued");
  const running = workloads.filter(w => w.status === "running");

  const userNav = [
    { id: "home", l: "홈", ic: "home" },
    { id: "builder", l: "Builder", ic: "builder" },
    { id: "test", l: "테스트 실행", ic: "test" },
    { id: "request", l: "실행 요청", ic: "play" },
    { id: "workloads", l: "워크로드 목록", ic: "file" },
    { id: "models", l: "결과 모델", ic: "model" },
  ];
  const adminNav = [
    { id: "home", l: "홈", ic: "home" },
    { id: "approval", l: "승인 관리", ic: "check" },
    { id: "queue", l: "대기열 관리", ic: "queue" },
    { id: "resources", l: "리소스 현황", ic: "monitor" },
    { id: "workloads", l: "워크로드 목록", ic: "file" },
    { id: "models", l: "결과 모델", ic: "model" },
  ];
  const nav = mode === "user" ? userNav : adminNav;

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Outfit','Pretendard',-apple-system,sans-serif", color: "#0F172A" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      
      {/* ─── Header ─── */}
      <header style={{ height: 56, background: "#fff", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", padding: "0 24px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#0F172A,#475569)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 14, fontWeight: 800, letterSpacing: -0.5 }}>A</span>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>AVATAR OnE</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: "#94A3B8", marginLeft: 2 }}>v1.2</span>
        </div>
        <div style={{ flex: 1 }} />
        
        {/* Live indicators */}
        {pending.length > 0 && mode === "admin" && (
          <div style={{ marginRight: 16, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "4px 10px", borderRadius: 6, background: "#FEF2F2" }} onClick={() => setPage("approval")}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: "#DC2626", animation: "pulse 1.5s infinite" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#B91C1C" }}>승인대기 {pending.length}</span>
          </div>
        )}
        {running.length > 0 && (
          <div style={{ marginRight: 16, display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 6, background: "#EFF6FF" }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: "#1D4ED8", animation: "pulse 1.5s infinite" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#1E40AF" }}>실행 중 {running.length}</span>
          </div>
        )}
        
        {/* Mode toggle */}
        <div style={{ display: "flex", background: "#F1F5F9", borderRadius: 10, padding: 3, gap: 2 }}>
          {[["user", "사용자", "user"], ["admin", "관리자", "admin"]].map(([m, lb, ic]) => (
            <button key={m} onClick={() => setMode(m)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: mode === m ? 600 : 400, background: mode === m ? "#fff" : "transparent", color: mode === m ? "#0F172A" : "#64748B", boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,.06)" : "none", transition: "all .15s" }}>
              <I n={ic} s={14} />{lb}
            </button>
          ))}
        </div>
      </header>

      <div style={{ display: "flex", minHeight: "calc(100vh - 56px)" }}>
        {/* ─── Sidebar ─── */}
        <nav style={{ width: 210, background: "#fff", borderRight: "1px solid #E2E8F0", padding: "16px 8px", flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", padding: "4px 14px 10px", letterSpacing: 1, textTransform: "uppercase" }}>
            {mode === "user" ? "사용자 메뉴" : "관리자 메뉴"}
          </div>
          {nav.map(n => {
            const badge = n.id === "approval" ? pending.length : n.id === "queue" ? queued.length : 0;
            const active = page === n.id;
            return (
              <button key={n.id} onClick={() => setPage(n.id)} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 400, background: active ? "#F1F5F9" : "transparent", color: active ? "#0F172A" : "#64748B", marginBottom: 2, transition: "all .1s" }}>
                <I n={n.ic} s={16} c={active ? "#0F172A" : "#94A3B8"} />{n.l}
                {badge > 0 && <span style={{ marginLeft: "auto", background: "#DC2626", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99, minWidth: 18, textAlign: "center" }}>{badge}</span>}
              </button>
            );
          })}
          
          {/* Threshold info */}
          <div style={{ margin: "20px 10px 0", padding: "12px 14px", background: "#F8FAFC", borderRadius: 8, border: "1px solid #E2E8F0" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: 0.5, marginBottom: 6, textTransform: "uppercase" }}>자원 임계치</div>
            <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.7 }}>
              GPU ≥ {THRESHOLD.gpu}기 또는<br/>메모리 ≥ {THRESHOLD.mem}GB<br/>
              <span style={{ fontSize: 11, color: "#94A3B8" }}>→ 관리자 승인 필요</span>
            </div>
          </div>
        </nav>

        {/* ─── Main Content ─── */}
        <main style={{ flex: 1, padding: 32, maxWidth: 1120, overflowY: "auto" }}>
          {page === "home" && <HomePage {...{ mode, setPage, workloads, models, specs, testRuns, pending, running, queued }} />}
          {page === "builder" && <BuilderPage {...{ flash, addSpec }} />}
          {page === "test" && <TestRunPage {...{ specs, testRuns, runTest, setPage }} />}
          {page === "request" && <RequestPage {...{ specs, testRuns, addWorkload }} />}
          {page === "approval" && <ApprovalPage {...{ pending, approveWorkload, rejectWorkload, testRuns, setModal }} />}
          {page === "queue" && <QueuePage {...{ workloads, setWorkloads, running, queued, flash }} />}
          {page === "resources" && <ResourcesPage workloads={workloads} />}
          {page === "workloads" && <WorkloadsPage workloads={workloads} />}
          {page === "models" && <ModelsPage models={models} flash={flash} />}
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#0F172A", color: "#fff", padding: "11px 28px", borderRadius: 10, fontSize: 13, fontWeight: 500, boxShadow: "0 8px 30px rgba(0,0,0,.15)", zIndex: 100, animation: "fadeUp .25s ease-out", maxWidth: "90vw" }}>
          {toast}
        </div>
      )}
      
      {/* Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.3)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90 }} onClick={() => setModal(null)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: 560, width: "90%", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,.12)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{modal.title}</h3>
              <button onClick={() => setModal(null)} style={{ background: "#F1F5F9", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, display: "flex" }}><I n="close" s={16} c="#64748B" /></button>
            </div>
            {modal.content}
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateX(-50%) translateY(10px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.3 } }
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        input:focus, textarea:focus, select:focus { border-color: #94A3B8 !important; }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════ HOME PAGE ═══════════════════════════ */
function HomePage({ mode, setPage, workloads, models, specs, testRuns, pending, running, queued }) {
  const stats = mode === "user"
    ? [
        { l: "스펙 파일", v: specs.length, ic: "file", pg: "builder" },
        { l: "테스트 실행", v: testRuns.length + "회", ic: "test", pg: "test" },
        { l: "진행 중", v: workloads.filter(w => !["completed","failed","rejected"].includes(w.status)).length + "건", ic: "play", pg: "workloads" },
        { l: "완료 모델", v: models.length, ic: "model", pg: "models" },
      ]
    : [
        { l: "승인 대기", v: pending.length, ic: "check", pg: "approval", alert: pending.length > 0 },
        { l: "실행 대기열", v: queued.length, ic: "queue", pg: "queue" },
        { l: "실행 중", v: running.length, ic: "run", pg: "workloads" },
        { l: "완료 모델", v: models.length, ic: "model", pg: "models" },
      ];
      
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>
          {mode === "user" ? "ML 학습 파이프라인" : "플랫폼 관리"} 
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "#64748B" }}>
          {mode === "user" ? "파이프라인을 정의하고, 테스트하고, 워크로드를 실행하세요." : "워크로드 승인과 클러스터 리소스를 관리하세요."}
        </p>
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${stats.length},1fr)`, gap: 14, marginBottom: 28 }}>
        {stats.map((s, i) => (
          <Card key={i} style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={() => setPage(s.pg)}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: s.alert ? "#FEF2F2" : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <I n={s.ic} s={20} c={s.alert ? "#B91C1C" : "#334155"} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500, marginBottom: 2 }}>{s.l}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.alert ? "#B91C1C" : "#0F172A", letterSpacing: -0.5 }}>{s.v}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* v1.2 Workflow guide */}
      <Card style={{ marginBottom: 20, background: "linear-gradient(135deg, #F8FAFC, #F1F5F9)", border: "1px solid #E2E8F0" }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>v1.2 워크플로우</div>
        <div style={{ display: "flex", gap: 0, alignItems: "stretch" }}>
          {[
            { step: "1", title: "Builder", desc: "파이프라인 정의\n스펙 파일 생성", color: "#475569" },
            { step: "2", title: "테스트 실행", desc: "파이프라인 검증\n(선택 사항)", color: "#7E22CE" },
            { step: "3", title: "실행 요청", desc: "자원 요청 + 테스트\nrun 참조(선택)", color: "#1E40AF" },
            { step: "4", title: "승인", desc: "임계치 이상 → 관리자\n임계치 미만 → 자동승인", color: "#B45309" },
            { step: "5", title: "실행 · 완료", desc: "학습 파이프라인\n실행 → 모델 생성", color: "#047857" },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, display: "flex", alignItems: "center" }}>
              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{ width: 28, height: 28, borderRadius: 99, background: s.color, color: "#fff", fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 6 }}>{s.step}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: s.color, marginBottom: 3 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.5, whiteSpace: "pre-line" }}>{s.desc}</div>
              </div>
              {i < 4 && <div style={{ color: "#CBD5E1", fontSize: 18, fontWeight: 300, padding: "0 2px" }}>›</div>}
            </div>
          ))}
        </div>
      </Card>
      
      {/* Recent activity */}
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>최근 활동</div>
        {workloads.length === 0 ? (
          <p style={{ textAlign: "center", color: "#94A3B8", fontSize: 13, padding: 20 }}>아직 활동이 없습니다.</p>
        ) : workloads.slice(-5).reverse().map(w => (
          <div key={w.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid #F1F5F9" }}>
            <Badge v={w.status}>{LABEL[w.status]}</Badge>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{w.name}</span>
            {w.testRunRef && <span style={{ fontSize: 11, color: "#7E22CE", background: "#F3E8FF", padding: "1px 6px", borderRadius: 4 }}>테스트 참조</span>}
            {!w.needsApproval && w.status !== "completed" && w.status !== "rejected" && <span style={{ fontSize: 11, color: "#1E40AF", background: "#EFF6FF", padding: "1px 6px", borderRadius: 4 }}>자동승인</span>}
            <span style={{ fontSize: 12, color: "#94A3B8", marginLeft: "auto" }}>{w.submitted}</span>
          </div>
        ))}
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          {mode === "user" ? (
            <>
              <Btn v="primary" icon="builder" onClick={() => setPage("builder")}>파이프라인 정의</Btn>
              <Btn icon="test" onClick={() => setPage("test")}>테스트 실행</Btn>
              <Btn icon="play" onClick={() => setPage("request")}>실행 요청</Btn>
            </>
          ) : (
            <>
              <Btn v="primary" icon="check" onClick={() => setPage("approval")}>승인 관리</Btn>
              <Btn icon="queue" onClick={() => setPage("queue")}>대기열 관리</Btn>
              <Btn icon="monitor" onClick={() => setPage("resources")}>리소스 현황</Btn>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════ BUILDER ═══════════════════════════ */
function BuilderPage({ flash, addSpec }) {
  const [form, setForm] = useState({ name: "", image: "", tag: "", envVars: [{ key: "", value: "" }], components: [{ name: "", type: "trainer", params: "" }], gpuType: "A100", gpuCount: "2", mem: "64GB" });
  const [generated, setGenerated] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const generate = () => {
    const specName = form.name || "MyPipeline-v1";
    const specObj = {
      pipeline_id: "PL-" + Math.random().toString(36).substr(2, 6).toUpperCase(),
      name: specName, version: "1.0.0",
      image: { registry: form.image || "registry.avatar.io/my-image", tag: form.tag || "latest" },
      env_vars: Object.fromEntries(form.envVars.filter(e => e.key).map(e => [e.key, e.value])),
      components: form.components.map((c, i) => ({ order: i+1, name: c.name || `component_${i+1}`, type: c.type, params: c.params ? (() => { try { return JSON.parse(c.params); } catch { return c.params; } })() : {} })),
      resources: { gpu_type: form.gpuType, gpu_count: parseInt(form.gpuCount)||2, memory: form.mem },
      storage: { type: "distributed", path: "/training-data/" + specName.toLowerCase() },
      created_at: new Date().toISOString()
    };
    setGenerated(specObj);
    addSpec({
      id: "SP-" + Math.random().toString(36).substr(2,4).toUpperCase(),
      name: specName, version: "1.0.0",
      image: (form.image||"registry.avatar.io/my-image") + ":" + (form.tag||"latest"),
      status: "ready", created: now().split(" ")[0],
      components: form.components.length,
      gpu: form.gpuType + " x " + (form.gpuCount||"2"), mem: form.mem || "64GB"
    });
    flash("스펙 파일이 생성되었습니다.");
  };

  return (
    <div>
      <Title sub="컨테이너 이미지, 환경 변수, 컴포넌트 스펙을 입력하면 스펙 파일(JSON)이 생성됩니다.">Builder — 파이프라인 정의</Title>
      {!generated ? <>
        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>기본 정보</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <InputField label="파이프라인 이름" value={form.name} onChange={e=>set("name",e.target.value)} placeholder="MyPipeline-v1" />
            <InputField label="이미지 주소" value={form.image} onChange={e=>set("image",e.target.value)} placeholder="registry.avatar.io/my-image" mono />
            <InputField label="태그" value={form.tag} onChange={e=>set("tag",e.target.value)} placeholder="latest" mono />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <InputField label="GPU 유형" value={form.gpuType} onChange={e=>set("gpuType",e.target.value)} placeholder="A100" />
            <InputField label="GPU 수" value={form.gpuCount} onChange={e=>set("gpuCount",e.target.value)} placeholder="2" />
            <InputField label="메모리" value={form.mem} onChange={e=>set("mem",e.target.value)} placeholder="64GB" />
          </div>
        </Card>
        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>환경 변수</div>
            <Btn sz="sm" onClick={() => set("envVars",[...form.envVars,{key:"",value:""}])}>+ 추가</Btn>
          </div>
          {form.envVars.map((env, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <input value={env.key} onChange={e => set("envVars",form.envVars.map((x,j)=>j===i?{...x,key:e.target.value}:x))} placeholder="KEY" style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, fontFamily: "'JetBrains Mono',monospace", outline: "none" }} />
              <input value={env.value} onChange={e => set("envVars",form.envVars.map((x,j)=>j===i?{...x,value:e.target.value}:x))} placeholder="VALUE" style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, fontFamily: "'JetBrains Mono',monospace", outline: "none" }} />
              <button onClick={() => set("envVars",form.envVars.filter((_,j)=>j!==i))} style={{ padding: 6, background: "none", border: "none", cursor: "pointer" }}><I n="close" s={14} c="#94A3B8" /></button>
            </div>
          ))}
        </Card>
        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>컴포넌트 스펙</div>
            <Btn sz="sm" onClick={() => set("components",[...form.components,{name:"",type:"trainer",params:""}])}>+ 컴포넌트</Btn>
          </div>
          {form.components.map((c, i) => (
            <div key={i} style={{ padding: 14, border: "1px solid #E2E8F0", borderRadius: 10, marginBottom: 8, background: "#FAFBFC" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>컴포넌트 #{i+1}</span>
                <button onClick={() => set("components",form.components.filter((_,j)=>j!==i))} style={{ padding: 2, background: "none", border: "none", cursor: "pointer" }}><I n="close" s={14} c="#94A3B8" /></button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <input value={c.name} onChange={e => set("components",form.components.map((x,j)=>j===i?{...x,name:e.target.value}:x))} placeholder="이름" style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, outline: "none" }} />
                <select value={c.type} onChange={e => set("components",form.components.map((x,j)=>j===i?{...x,type:e.target.value}:x))} style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, outline: "none", background: "#fff" }}>
                  <option value="trainer">Trainer</option><option value="data_loader">Data Loader</option><option value="preprocessor">Preprocessor</option><option value="evaluator">Evaluator</option>
                </select>
              </div>
              <textarea value={c.params} onChange={e => set("components",form.components.map((x,j)=>j===i?{...x,params:e.target.value}:x))} placeholder='파라미터 JSON: {"lr": 0.001}' rows={2} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12, fontFamily: "'JetBrains Mono',monospace", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
            </div>
          ))}
        </Card>
        <Btn v="primary" sz="lg" onClick={generate}>스펙 파일 생성</Btn>
      </> : (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <I n="check" s={18} c="#166534" />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#166534" }}>스펙 파일 생성 완료</span>
            </div>
            <Btn sz="sm" onClick={() => setGenerated(null)}>새로 작성</Btn>
          </div>
          <pre style={{ background: "#0F172A", borderRadius: 10, padding: 18, fontSize: 12, fontFamily: "'JetBrains Mono',monospace", overflow: "auto", lineHeight: 1.7, color: "#E2E8F0", margin: 0 }}>{JSON.stringify(generated, null, 2)}</pre>
          <p style={{ margin: "14px 0 0", fontSize: 12, color: "#64748B" }}>→ 테스트 실행 또는 실행 요청 페이지에서 이 스펙 파일을 선택할 수 있습니다.</p>
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════ TEST RUN PAGE (v1.2 new) ═══════════════════════ */
function TestRunPage({ specs, testRuns, runTest, setPage }) {
  const [selSpec, setSelSpec] = useState(null);
  
  return (
    <div>
      <Title sub="파이프라인 스펙 파일을 선택하여 테스트 실행합니다. 테스트 실행은 일반 파이프라인 실행과 동일하게 동작합니다.">테스트 실행</Title>
      
      {/* Spec selection for new test */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>스펙 파일 선택</div>
        <div style={{ display: "grid", gap: 8 }}>
          {specs.filter(s => s.status === "ready").map(s => (
            <div key={s.id} onClick={() => setSelSpec(s.id)} style={{ padding: "14px 16px", borderRadius: 10, border: `2px solid ${selSpec === s.id ? "#0F172A" : "#E2E8F0"}`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", background: selSpec === s.id ? "#F8FAFC" : "#fff", transition: "all .15s" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name} <span style={{ fontWeight: 400, color: "#94A3B8", fontSize: 12 }}>v{s.version}</span></div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>{s.image} · 컴포넌트 {s.components}개 · {s.gpu}, {s.mem}</div>
              </div>
              <Badge v="ready">준비됨</Badge>
            </div>
          ))}
        </div>
        {selSpec && (
          <div style={{ marginTop: 14 }}>
            <Btn v="primary" icon="test" onClick={() => { runTest(selSpec); setSelSpec(null); }}>테스트 실행 시작</Btn>
          </div>
        )}
      </Card>

      {/* Test run history */}
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>테스트 실행 이력</div>
        {testRuns.length === 0 ? (
          <p style={{ textAlign: "center", color: "#94A3B8", fontSize: 13, padding: 24 }}>테스트 실행 이력이 없습니다.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><TH>Run ID</TH><TH>파이프라인</TH><TH a="center">상태</TH><TH>자원</TH><TH>실행 시간</TH><TH>실행일시</TH></tr></thead>
            <tbody>
              {[...testRuns].reverse().map(tr => (
                <tr key={tr.id}>
                  <TD><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#7E22CE" }}>{tr.id}</span></TD>
                  <TD b>{tr.specName}</TD>
                  <TD a="center">
                    {tr.status === "running" ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#1E40AF", fontSize: 12, fontWeight: 600 }}>
                        <span style={{ width: 12, height: 12, borderRadius: 99, border: "2px solid #1D4ED8", borderTopColor: "transparent", animation: "spin .8s linear infinite", display: "inline-block" }} />
                        실행 중
                      </span>
                    ) : <Badge v={tr.status}>{LABEL[tr.status] || tr.status}</Badge>}
                  </TD>
                  <TD>{tr.gpu}, {tr.mem}</TD>
                  <TD>{tr.duration || "—"}</TD>
                  <TD>{tr.created}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p style={{ margin: "14px 0 0", fontSize: 12, color: "#64748B" }}>→ 실행 요청 시 테스트 run을 참조(annotate)할 수 있습니다.</p>
      </Card>
    </div>
  );
}

/* ═══════════════════════ REQUEST PAGE (v1.2 updated) ═══════════════════════ */
function RequestPage({ specs, testRuns, addWorkload }) {
  const [sel, setSel] = useState(null);
  const [done, setDone] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [form, setForm] = useState({ gpuType: "A100", gpuCount: "4", mem: "128GB", maxTime: "24h", testRunRef: "" });

  const passedRuns = testRuns.filter(t => t.status === "passed");
  const selSpec = specs.find(s => s.id === sel);
  const gpuStr = form.gpuType + " x " + form.gpuCount;
  const needsApproval = exceedsThreshold(gpuStr, form.mem);

  if (done) return (
    <div>
      <Title>워크로드 실행 요청</Title>
      <Card>
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ width: 52, height: 52, borderRadius: 99, background: lastResult?.immediate ? "#EFF6FF" : "#F0FDF4", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <I n={lastResult?.immediate ? "play" : "check"} s={26} c={lastResult?.immediate ? "#1D4ED8" : "#166534"} />
          </div>
          <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700 }}>실행 요청 완료</h3>
          {lastResult?.immediate ? (
            <>
              <p style={{ margin: "0 0 4px", fontSize: 13, color: "#1E40AF", fontWeight: 500 }}>자원 임계치 미만 — 실행 대기열에 진입했습니다.</p>
              <p style={{ margin: 0, fontSize: 12, color: "#94A3B8" }}>워크로드 목록에서 실행 상태를 확인하세요.</p>
            </>
          ) : (
            <>
              <p style={{ margin: "0 0 4px", fontSize: 13, color: "#64748B" }}>자원 임계치 초과 — 관리자 승인을 대기합니다.</p>
              <p style={{ margin: 0, fontSize: 12, color: "#94A3B8" }}>→ 우측 상단에서 관리자 모드로 전환하여 승인하세요.</p>
            </>
          )}
          <div style={{ marginTop: 20 }}>
            <Btn onClick={() => { setDone(false); setSel(null); setLastResult(null); }}>새 요청 작성</Btn>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <div>
      <Title sub="스펙 파일 선택 → 자원 요청 → 테스트 run 참조(선택) → 실행 요청 제출">워크로드 실행 요청</Title>
      
      {/* Step 1: Spec selection */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>① 스펙 파일 선택</div>
        {specs.filter(s => s.status === "ready").map(s => (
          <div key={s.id} onClick={() => setSel(s.id)} style={{ padding: "12px 16px", borderRadius: 10, border: `2px solid ${sel === s.id ? "#0F172A" : "#E2E8F0"}`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, background: sel === s.id ? "#F8FAFC" : "#fff", transition: "all .15s" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name} <span style={{ fontWeight: 400, color: "#94A3B8", fontSize: 12 }}>v{s.version}</span></div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{s.image} · 컴포넌트 {s.components}개 · {s.gpu}</div>
            </div>
            <Badge v="ready">준비됨</Badge>
          </div>
        ))}
      </Card>
      
      {sel && <>
        {/* Step 2: Resource request */}
        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>② 자원 요청</div>
            {/* Threshold indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 6, background: needsApproval ? "#FEF3C7" : "#DCFCE7" }}>
              <I n="threshold" s={14} c={needsApproval ? "#92400E" : "#166534"} />
              <span style={{ fontSize: 11, fontWeight: 600, color: needsApproval ? "#92400E" : "#166534" }}>
                {needsApproval ? "임계치 초과 — 관리자 승인 필요" : "임계치 미만 — 승인 없이 실행 가능"}
              </span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
            <InputField label="GPU 유형" value={form.gpuType} onChange={e=>setForm(f=>({...f,gpuType:e.target.value}))} />
            <InputField label="GPU 수" value={form.gpuCount} onChange={e=>setForm(f=>({...f,gpuCount:e.target.value}))} />
            <InputField label="메모리" value={form.mem} onChange={e=>setForm(f=>({...f,mem:e.target.value}))} />
            <InputField label="최대 실행 시간" value={form.maxTime} onChange={e=>setForm(f=>({...f,maxTime:e.target.value}))} />
          </div>
          <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 6, background: "#F8FAFC", border: "1px solid #E2E8F0", fontSize: 11, color: "#64748B" }}>
            임계치: GPU ≥ {THRESHOLD.gpu}기 또는 메모리 ≥ {THRESHOLD.mem}GB → 현재 요청: GPU {form.gpuCount}기, 메모리 {form.mem}
          </div>
        </Card>

        {/* Step 3: Test run reference (optional) */}
        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>③ 테스트 run 참조 <span style={{ fontWeight: 400, fontSize: 12, color: "#94A3B8" }}>(선택 사항)</span></div>
          <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 10px" }}>사전 테스트 실행 결과를 본 실행 요청에 참조(annotate)할 수 있습니다.</p>
          {passedRuns.length > 0 ? (
            <div style={{ display: "grid", gap: 6 }}>
              <div onClick={() => setForm(f=>({...f,testRunRef:""}))} style={{ padding: "10px 14px", borderRadius: 8, border: `2px solid ${!form.testRunRef ? "#0F172A" : "#E2E8F0"}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, background: !form.testRunRef ? "#F8FAFC" : "#fff", fontSize: 13, transition: "all .15s" }}>
                <span style={{ color: "#64748B" }}>참조 없음 (테스트 실행 생략)</span>
              </div>
              {passedRuns.map(tr => (
                <div key={tr.id} onClick={() => setForm(f=>({...f,testRunRef:tr.id}))} style={{ padding: "10px 14px", borderRadius: 8, border: `2px solid ${form.testRunRef === tr.id ? "#7E22CE" : "#E2E8F0"}`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", background: form.testRunRef === tr.id ? "#FAF5FF" : "#fff", transition: "all .15s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#7E22CE", fontWeight: 500 }}>{tr.id}</span>
                    <span style={{ fontSize: 13 }}>{tr.specName}</span>
                    <span style={{ fontSize: 11, color: "#94A3B8" }}>{tr.created}</span>
                  </div>
                  <Badge v="passed">통과</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: "14px", background: "#F8FAFC", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12, color: "#94A3B8", textAlign: "center" }}>
              아직 완료된 테스트 run이 없습니다. 테스트 실행 페이지에서 먼저 테스트를 실행하세요.
            </div>
          )}
        </Card>
        
        <Btn v="primary" sz="lg" onClick={() => {
          addWorkload({
            name: selSpec.name, specId: selSpec.id, requester: "나",
            priority: "medium", gpu: gpuStr, mem: form.mem,
            testRunRef: form.testRunRef || null
          });
          setLastResult({ immediate: !needsApproval });
          setDone(true);
        }}>
          {needsApproval ? "실행 요청 제출 (승인 필요)" : "실행 요청 제출"}
        </Btn>
      </>}
    </div>
  );
}

/* ═══════════════════════ APPROVAL PAGE (v1.2 updated) ═══════════════════════ */
function ApprovalPage({ pending, approveWorkload, rejectWorkload, testRuns, setModal }) {
  return (
    <div>
      <Title sub="자원 임계치를 초과한 워크로드를 검토하고 승인합니다. (임계치 미만 요청은 자동 실행됩니다)">승인 관리</Title>
      
      {pending.length === 0 ? (
        <Card>
          <p style={{ textAlign: "center", color: "#94A3B8", fontSize: 14, padding: 32 }}>승인 대기 중인 요청이 없습니다.</p>
          <p style={{ textAlign: "center", fontSize: 12, color: "#CBD5E1" }}>자원 임계치(GPU ≥ {THRESHOLD.gpu}기, 메모리 ≥ {THRESHOLD.mem}GB)를 초과한 요청만 승인이 필요합니다.</p>
        </Card>
      ) : pending.map(w => {
        const refRun = w.testRunRef ? testRuns.find(t => t.id === w.testRunRef) : null;
        return (
          <Card key={w.id} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{w.name}</div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>
                  신청자: {w.requester} · {w.submitted} · {w.gpu}, {w.mem}
                </div>
              </div>
              <Badge v="pending">승인대기</Badge>
            </div>
            
            {/* Resource threshold info */}
            <div style={{ marginTop: 14, padding: "10px 14px", background: "#FEF3C7", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <I n="threshold" s={16} c="#92400E" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#92400E" }}>자원 임계치 초과: GPU {parseGpuCount(w.gpu)}기, 메모리 {parseMemNum(w.mem)}GB</span>
            </div>
            
            {/* Test run reference */}
            <div style={{ marginTop: 12, padding: 14, background: "#F8FAFC", borderRadius: 10, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", marginBottom: 8 }}>테스트 run 참조</div>
              {refRun ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Badge v="passed">통과</Badge>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#7E22CE" }}>{refRun.id}</span>
                  <span style={{ fontSize: 12, color: "#64748B" }}>{refRun.specName} · {refRun.duration}</span>
                  <Btn sz="sm" v="ghost" onClick={() => setModal({ title: `테스트 결과: ${refRun.id}`, content: <pre style={{ background: "#0F172A", borderRadius: 8, padding: 14, fontSize: 12, fontFamily: "'JetBrains Mono',monospace", color: "#A5F3FC", margin: 0, lineHeight: 1.7 }}>{refRun.log}</pre> })}>로그 보기</Btn>
                </div>
              ) : (
                <span style={{ fontSize: 12, color: "#94A3B8" }}>테스트 run 참조 없음</span>
              )}
            </div>
            
            <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
              <Btn v="success" icon="check" onClick={() => approveWorkload(w.id)}>승인</Btn>
              <Btn v="danger" onClick={() => rejectWorkload(w.id)}>반려</Btn>
              <Btn v="ghost" onClick={() => setModal({
                title: `${w.name} 상세`,
                content: (
                  <div style={{ fontSize: 13, lineHeight: 2.2 }}>
                    <p><b>ID:</b> <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#64748B" }}>{w.id}</span></p>
                    <p><b>스펙:</b> {w.specId}</p>
                    <p><b>신청자:</b> {w.requester}</p>
                    <p><b>GPU:</b> {w.gpu} · <b>메모리:</b> {w.mem}</p>
                    <p><b>신청일시:</b> {w.submitted}</p>
                    <p><b>테스트 run:</b> {w.testRunRef || "없음"}</p>
                    <p><b>승인 필요:</b> 자원 임계치 초과</p>
                  </div>
                )
              })}>상세</Btn>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* ═══════════════════════ QUEUE MANAGEMENT ═══════════════════════ */
function QueuePage({ workloads, setWorkloads, running, queued, flash }) {
  const sorted = [...queued].sort((a,b) => { const p = {high:0,medium:1,low:2}; return (p[a.priority]??1)-(p[b.priority]??1); });
  const changePri = (id, dir) => {
    setWorkloads(wl => wl.map(w => {
      if (w.id !== id) return w;
      const o = ["low","medium","high"];
      const i = o.indexOf(w.priority);
      return {...w, priority: o[dir==="up"?Math.min(i+1,2):Math.max(i-1,0)]};
    }));
    flash("우선순위가 변경되었습니다.");
  };
  
  return (
    <div>
      <Title sub="대기열의 우선순위를 관리합니다.">대기열 관리</Title>
      
      {running.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1E40AF", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: "#1D4ED8", animation: "pulse 1.5s infinite" }} />현재 실행 중
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><TH>워크로드</TH><TH>자원</TH><TH>신청자</TH><TH a="center">상태</TH></tr></thead>
            <tbody>{running.map(w => (
              <tr key={w.id}>
                <TD b>{w.name}</TD><TD>{w.gpu}, {w.mem}</TD><TD>{w.requester}</TD>
                <TD a="center"><Badge v="running">실행 중</Badge></TD>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      )}
      
      <Card>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#64748B", marginBottom: 10 }}>대기 중 ({sorted.length}건)</div>
        {sorted.length === 0 ? (
          <p style={{ textAlign: "center", color: "#94A3B8", fontSize: 13, padding: 24 }}>대기 중인 워크로드가 없습니다.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><TH w={40}>#</TH><TH>워크로드</TH><TH a="center">우선순위</TH><TH>요청 자원</TH><TH>신청자</TH><TH a="center">조정</TH></tr></thead>
            <tbody>{sorted.map((w,i) => (
              <tr key={w.id}>
                <TD a="center">{i+1}</TD><TD b>{w.name}</TD>
                <TD a="center"><Badge v={w.priority}>{LABEL[w.priority]}</Badge></TD>
                <TD>{w.gpu}, {w.mem}</TD><TD>{w.requester}</TD>
                <TD a="center">
                  <div style={{ display: "flex", gap: 3, justifyContent: "center" }}>
                    <button onClick={() => changePri(w.id,"up")} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><I n="up" s={14} c="#334155" /></button>
                    <button onClick={() => changePri(w.id,"down")} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><I n="down" s={14} c="#334155" /></button>
                  </div>
                </TD>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

/* ═══════════════════════ RESOURCES ═══════════════════════ */
function ResourcesPage({ workloads }) {
  const active = workloads.filter(w => ["running","queued"].includes(w.status));
  let uA=0, uV=0, uM=0;
  active.forEach(w => {
    const m = w.gpu.match(/(A100|V100)\s*x\s*(\d+)/i);
    if (m) { if (m[1].toUpperCase()==="A100") uA+=parseInt(m[2]); else uV+=parseInt(m[2]); }
    uM+=parseInt(w.mem)||0;
  });
  const res = [
    { ...RESOURCES.gpu_a100, requested: Math.min(uA+2,16), used: Math.min(uA,16) },
    { ...RESOURCES.gpu_v100, requested: Math.min(uV+1,8), used: Math.min(uV,8) },
    { ...RESOURCES.memory, requested: Math.min(uM+200,2048), used: Math.min(uM,2048) },
    { ...RESOURCES.cpu, requested: Math.min(active.length*20+40,256), used: Math.min(active.length*16,256) },
  ].map(r => ({...r, idle: r.total-r.requested}));

  return (
    <div>
      <Title sub="클러스터 리소스의 요청량, 사용량, 유휴량을 확인합니다.">리소스 현황</Title>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        {res.map(r => (
          <Card key={r.label}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{r.label}</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: r.color, letterSpacing: -0.5 }}>
                {Math.max(0,r.idle)} <span style={{ fontSize: 12, fontWeight: 400, color: "#94A3B8" }}>{r.unit} 유휴</span>
              </span>
            </div>
            <div style={{ height: 22, background: "#F1F5F9", borderRadius: 8, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${(r.requested/r.total)*100}%`, background: `${r.color}18`, borderRadius: 8, transition: "width .4s" }} />
              <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${(r.used/r.total)*100}%`, background: r.color, borderRadius: 8, transition: "width .4s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12 }}>
              <span style={{ color: "#94A3B8" }}>총 {r.total}{r.unit}</span>
              <div style={{ display: "flex", gap: 14 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: r.color }} />사용 {r.used}{r.unit}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: `${r.color}33` }} />요청 {r.requested}{r.unit}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════ WORKLOADS LIST ═══════════════════════ */
function WorkloadsPage({ workloads }) {
  return (
    <div>
      <Title sub="전체 워크로드의 실행 상태를 확인합니다.">워크로드 목록</Title>
      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><TH>워크로드</TH><TH a="center">상태</TH><TH a="center">우선순위</TH><TH>자원</TH><TH>신청자</TH><TH>신청일시</TH><TH a="center">승인 방식</TH><TH a="center">테스트 참조</TH></tr></thead>
          <tbody>
            {[...workloads].reverse().map(w => (
              <tr key={w.id}>
                <TD b>{w.name}</TD>
                <TD a="center">
                  {w.status === "running" ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 99, border: "2px solid #1D4ED8", borderTopColor: "transparent", animation: "spin .8s linear infinite", display: "inline-block" }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#1E40AF" }}>실행 중</span>
                    </span>
                  ) : <Badge v={w.status}>{LABEL[w.status]}</Badge>}
                </TD>
                <TD a="center"><Badge v={w.priority}>{LABEL[w.priority]}</Badge></TD>
                <TD>{w.gpu}, {w.mem}</TD>
                <TD>{w.requester}</TD>
                <TD>{w.submitted}</TD>
                <TD a="center">
                  {w.needsApproval 
                    ? <span style={{ fontSize: 11, color: "#92400E", background: "#FEF3C7", padding: "2px 8px", borderRadius: 4 }}>관리자</span>
                    : <span style={{ fontSize: 11, color: "#1E40AF", background: "#EFF6FF", padding: "2px 8px", borderRadius: 4 }}>자동승인</span>
                  }
                </TD>
                <TD a="center">
                  {w.testRunRef 
                    ? <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#7E22CE" }}>{w.testRunRef}</span>
                    : <span style={{ fontSize: 11, color: "#CBD5E1" }}>—</span>
                  }
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ═══════════════════════ MODELS ═══════════════════════ */
function ModelsPage({ models, flash }) {
  return (
    <div>
      <Title sub="워크로드 실행 완료 후 자동 생성된 결과 모델입니다.">결과 모델</Title>
      {models.length === 0 ? (
        <Card><p style={{ textAlign: "center", color: "#94A3B8", fontSize: 14, padding: 36 }}>아직 생성된 모델이 없습니다.</p></Card>
      ) : (
        <Card>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><TH>모델명</TH><TH>원본 워크로드</TH><TH a="center">생성일시</TH><TH a="center">크기</TH><TH a="center">Accuracy</TH><TH a="center">Loss</TH><TH a="center">작업</TH></tr></thead>
            <tbody>
              {[...models].reverse().map(m => (
                <tr key={m.id}>
                  <TD b>{m.name}</TD>
                  <TD>{m.workload}</TD>
                  <TD a="center">{m.created}</TD>
                  <TD a="center">{m.size}</TD>
                  <TD a="center"><span style={{ fontWeight: 700, color: "#166534" }}>{m.metrics.accuracy}</span></TD>
                  <TD a="center"><span style={{ color: "#64748B" }}>{m.metrics.loss}</span></TD>
                  <TD a="center"><Btn sz="sm" icon="dl" onClick={() => flash(`${m.name} 다운로드 시작`)}>다운로드</Btn></TD>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

