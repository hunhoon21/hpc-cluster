import { useState, useEffect, useCallback, useRef } from "react";

/* ═══════════════════════════════════════════════════════
   AVATAR OnE  v1.9  —  ML/RL Training Platform Demo

   v1.9 Changes:
   · Unified component design tab (single card grid)
   · Workflow derived from composition relationships
   · Connection popup handles composition + method_call in one step
   · Connection deletion cascade (composition + method_calls)

   v1.8 Changes:
   · Editable class design (attributes/methods) in Builder
   · GUI-based component connection (composition/method_call)
   · base.py code generation + download

   v1.7 Changes:
   · Component library: className, attributes, methods
   · Builder "클래스 설계" tab with base class preview
   · RCP blade optimization sample App (APP-003)

   v1.6 Changes:
   · Developer pre-test execution in Trainer (TR-09)
   · Test result attachment to training request (TR-10)
   · Admin review of attached results (AP-06)
   · loopTest data structure: attachedToRequest, reviewedBy, reviewedAt

   Flow: Builder → Trainer (+ pre-test) → Review/Approval → Queue → Run → Model → Operator
   ═══════════════════════════════════════════════════════ */

const uid = () => "WL-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 3).toUpperCase();
const mid = () => "MD-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 3).toUpperCase();
const rid = () => "RUN-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 3).toUpperCase();
const cid = () => "C-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 3).toUpperCase();
const tid = () => "TASK-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 3).toUpperCase();
const now = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0") + " " + String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0"); };

// Resource threshold — requests above this require admin approval
const THRESHOLD = { gpu: 4, mem: 128 };

const INIT_SPECS = [
  { id: "APP-001", name: "LLM-FineTune-v3", version: "1.2.0", status: "ready", created: "2025-02-01",
    tasks: [
      { id: "TASK-001", name: "training-pipeline", imported_from: null,
        components: [
          { id: "C-001", name: "data-loader", image: "registry.avatar.io/data-loader:1.0", tag: "1.0", gpu_type: "V100", gpu_count: 1, mem: "32GB", params: {}, order: 1 },
          { id: "C-002", name: "preprocessor", image: "registry.avatar.io/preprocessor:2.1", tag: "2.1", gpu_type: "A100", gpu_count: 2, mem: "64GB", params: { batch_size: 128 }, order: 2 },
          { id: "C-003", name: "trainer", image: "registry.avatar.io/llm-trainer:3.1", tag: "3.1", gpu_type: "A100", gpu_count: 4, mem: "128GB", params: { lr: 0.001, epochs: 30 }, order: 3 },
          { id: "C-004", name: "evaluator", image: "registry.avatar.io/evaluator:1.5", tag: "1.5", gpu_type: "V100", gpu_count: 1, mem: "16GB", params: {}, order: 4 },
        ],
        workflow: [{ from: "C-001", to: "C-002" }, { from: "C-002", to: "C-003" }, { from: "C-003", to: "C-004" }]
      }
    ],
    imported_apps: []
  },
  { id: "APP-002", name: "ResNet-Exp-42", version: "2.0.1", status: "ready", created: "2025-01-28",
    tasks: [
      { id: "TASK-002", name: "cv-training", imported_from: null,
        components: [
          { id: "C-005", name: "data-loader", image: "registry.avatar.io/cv-loader:1.2", tag: "1.2", gpu_type: "V100", gpu_count: 1, mem: "32GB", params: {}, order: 1 },
          { id: "C-006", name: "trainer", image: "registry.avatar.io/cv-resnet:2.0", tag: "2.0", gpu_type: "V100", gpu_count: 2, mem: "64GB", params: { lr: 0.01, epochs: 50 }, order: 2 },
          { id: "C-007", name: "evaluator", image: "registry.avatar.io/cv-eval:1.0", tag: "1.0", gpu_type: "V100", gpu_count: 1, mem: "16GB", params: {}, order: 3 },
        ],
        workflow: [{ from: "C-005", to: "C-006" }, { from: "C-006", to: "C-007" }]
      }
    ],
    imported_apps: []
  },
  { id: "APP-003", name: "RCP-BladeOpt", version: "1.0.0", status: "ready", created: "2025-03-01",
    tasks: [
      { id: "TASK-RCP-01", name: "blade-optimization", imported_from: null,
        components: [
          { id: "C-RCP-01", name: "rcp-setup", image: "registry.avatar.io/rcp-setup:1.0", tag: "1.0", gpu_type: "V100", gpu_count: 1, mem: "16GB", params: {}, order: 1, libraryRef: "CL-10" },
          { id: "C-RCP-11", name: "impeller-agent", image: "registry.avatar.io/impeller-agent:1.0", tag: "1.0", gpu_type: "V100", gpu_count: 1, mem: "8GB", params: {}, order: 2, libraryRef: "CL-11" },
          { id: "C-RCP-12", name: "diffuser-agent", image: "registry.avatar.io/diffuser-agent:1.0", tag: "1.0", gpu_type: "V100", gpu_count: 1, mem: "8GB", params: {}, order: 3, libraryRef: "CL-12" },
          { id: "C-RCP-02", name: "multi-agent", image: "registry.avatar.io/multi-agent:1.0", tag: "1.0", gpu_type: "V100", gpu_count: 1, mem: "16GB", params: {}, order: 4, libraryRef: "CL-13" },
          { id: "C-RCP-21", name: "make-blade", image: "registry.avatar.io/make-blade:1.0", tag: "1.0", gpu_type: "V100", gpu_count: 1, mem: "8GB", params: {}, order: 5, libraryRef: "CL-16" },
          { id: "C-RCP-22", name: "mesh-generator", image: "registry.avatar.io/mesh-generator:1.0", tag: "1.0", gpu_type: "V100", gpu_count: 1, mem: "8GB", params: {}, order: 6, libraryRef: "CL-17" },
          { id: "C-RCP-23", name: "run-cfx", image: "registry.avatar.io/run-cfx:1.0", tag: "1.0", gpu_type: "A100", gpu_count: 2, mem: "32GB", params: {}, order: 7, libraryRef: "CL-18" },
          { id: "C-RCP-03", name: "environment", image: "registry.avatar.io/environment:1.0", tag: "1.0", gpu_type: "A100", gpu_count: 2, mem: "64GB", params: {}, order: 8, libraryRef: "CL-14" },
          { id: "C-RCP-04", name: "train", image: "registry.avatar.io/train:1.0", tag: "1.0", gpu_type: "A100", gpu_count: 4, mem: "128GB", params: {}, order: 9, libraryRef: "CL-15" },
        ],
        workflow: []
      }
    ],
    imported_apps: [],
    classSpec: {
      relationships: {
        composition: [
          { owner: "C-RCP-02", attribute: "impeller_agent", target: "C-RCP-11" },
          { owner: "C-RCP-02", attribute: "diffuser_agent", target: "C-RCP-12" },
          { owner: "C-RCP-03", attribute: "make_blade", target: "C-RCP-21" },
          { owner: "C-RCP-03", attribute: "mesh_generator", target: "C-RCP-22" },
          { owner: "C-RCP-03", attribute: "run_cfx", target: "C-RCP-23" },
          { owner: "C-RCP-04", attribute: "rcp_setup_component", target: "C-RCP-01" },
          { owner: "C-RCP-04", attribute: "multi_agent_component", target: "C-RCP-02" },
          { owner: "C-RCP-04", attribute: "environment_component", target: "C-RCP-03" },
        ],
        method_calls: [
          { caller: "C-RCP-04", callerMethod: "apply_rcp_setup", callee: "C-RCP-01", calleeMethod: "provide_state_to_train" },
          { caller: "C-RCP-04", callerMethod: "apply_multi_agent", callee: "C-RCP-02", calleeMethod: "setup_agents_from_train" },
          { caller: "C-RCP-04", callerMethod: "execute_environment_run", callee: "C-RCP-03", calleeMethod: "execute_run_cfx" },
          { caller: "C-RCP-03", callerMethod: "execute_make_blade", callee: "C-RCP-21", calleeMethod: "make_blade" },
          { caller: "C-RCP-03", callerMethod: "execute_mesh_generation", callee: "C-RCP-22", calleeMethod: "generate_mesh" },
          { caller: "C-RCP-03", callerMethod: "execute_run_cfx", callee: "C-RCP-23", calleeMethod: "run" },
        ]
      }
    }
  },
];

const INIT_LIBRARY = [
  { id: "CL-01", name: "env-simulator", image: "registry.avatar.io/env-sim:1.0", description: "RL 환경 시뮬레이터", version: "1.0", created: "2025-01-15" },
  { id: "CL-02", name: "rl-agent", image: "registry.avatar.io/rl-agent:2.0", description: "강화학습 에이전트", version: "2.0", created: "2025-01-20" },
  { id: "CL-03", name: "reward-calculator", image: "registry.avatar.io/reward-calc:1.0", description: "보상 함수 계산기", version: "1.0", created: "2025-01-22" },
  { id: "CL-04", name: "data-loader", image: "registry.avatar.io/data-loader:1.0", description: "데이터 로더", version: "1.0", created: "2025-01-10" },
  { id: "CL-05", name: "preprocessor", image: "registry.avatar.io/preprocessor:2.1", description: "데이터 전처리기", version: "2.1", created: "2025-01-12" },
  { id: "CL-06", name: "evaluator", image: "registry.avatar.io/evaluator:1.5", description: "모델 평가기", version: "1.5", created: "2025-01-18" },
  // RCP 블레이드 최적화 컴포넌트
  { id: "CL-10", name: "rcp-setup", image: "registry.avatar.io/rcp-setup:1.0", description: "RCP 블레이드 상태 초기화", version: "1.0", created: "2025-03-01",
    className: "RCPSetupBase",
    attributes: [{ name: "n_layer", type: "int" }, { name: "impeller_a_variation_ratio", type: "float" }, { name: "diffuser_a_variation_ratio", type: "float" }, { name: "blade_layers", type: "Any" }],
    methods: [{ name: "initialize_state_for_index", params: "s, sr, i", returnType: "None", isAbstract: true }, { name: "provide_state_to_train", params: "s, sr, i", returnType: "None", isAbstract: false }]
  },
  { id: "CL-11", name: "impeller-agent", image: "registry.avatar.io/impeller-agent:1.0", description: "임펠러 에이전트 (상태 정규화)", version: "1.0", created: "2025-03-01",
    className: "ImpellerAgentBase",
    attributes: [{ name: "n_layer", type: "int" }, { name: "impeller_blade_number", type: "float" }, { name: "impeller_blade_number_min", type: "int" }, { name: "impeller_blade_number_max", type: "int" }, { name: "impeller_a_variation_ratio", type: "float" }],
    methods: [{ name: "impeller_agent_setup", params: "s, i", returnType: "None", isAbstract: true }]
  },
  { id: "CL-12", name: "diffuser-agent", image: "registry.avatar.io/diffuser-agent:1.0", description: "디퓨저 에이전트 (상태 정규화)", version: "1.0", created: "2025-03-01",
    className: "DiffuserAgentBase",
    attributes: [{ name: "n_layer", type: "int" }, { name: "diffuser_blade_number", type: "float" }, { name: "diffuser_blade_number_min", type: "int" }, { name: "diffuser_blade_number_max", type: "int" }, { name: "diffuser_a_variation_ratio", type: "float" }],
    methods: [{ name: "diffuser_agent_setup", params: "s, i", returnType: "None", isAbstract: true }]
  },
  { id: "CL-13", name: "multi-agent", image: "registry.avatar.io/multi-agent:1.0", description: "다중 에이전트 조합", version: "1.0", created: "2025-03-01",
    className: "MultiAgentBase",
    attributes: [],  // 컴포넌트 참조 속성은 연결 시 자동 생성
    methods: [{ name: "setup", params: "s, i", returnType: "None", isAbstract: true }, { name: "setup_agents_from_train", params: "s, i", returnType: "None", isAbstract: false }]
  },
  { id: "CL-16", name: "make-blade", image: "registry.avatar.io/make-blade:1.0", description: "블레이드 형상 생성기", version: "1.0", created: "2025-03-01",
    className: "MakeBladeBase",
    attributes: [{ name: "component_name", type: "str" }],
    methods: [{ name: "make_blade", params: "cfg_file, blade_count, output_file_path, destination_dir, blade_geom_data, write_index", returnType: "None", isAbstract: true }]
  },
  { id: "CL-17", name: "mesh-generator", image: "registry.avatar.io/mesh-generator:1.0", description: "CFD 메시 생성기", version: "1.0", created: "2025-03-01",
    className: "MeshGeneratorBase",
    attributes: [{ name: "component_name", type: "str" }],
    methods: [{ name: "generate_mesh", params: "mesh_script_path, blade_set_count, run_index, node_index, slot_index", returnType: "bool", isAbstract: true }]
  },
  { id: "CL-18", name: "run-cfx", image: "registry.avatar.io/run-cfx:1.0", description: "CFX 시뮬레이터 실행", version: "1.0", created: "2025-03-01",
    className: "RunCFXBase",
    attributes: [{ name: "run_index", type: "Optional[str]" }, { name: "node_idx", type: "Optional[int]" }, { name: "slot_idx", type: "Optional[int]" }, { name: "cores_per_task", type: "Optional[Any]" }],
    methods: [{ name: "run", params: "", returnType: "None", isAbstract: true }]
  },
  { id: "CL-14", name: "environment", image: "registry.avatar.io/environment:1.0", description: "시뮬레이션 환경 (MakeBlade + Mesh + RunCFX)", version: "1.0", created: "2025-03-01",
    className: "EnvironmentBase",
    attributes: [],  // 컴포넌트 참조 속성은 연결 시 자동 생성
    methods: []  // 위임 메서드(execute_make_blade 등)는 연결 시 자동 생성
  },
  { id: "CL-15", name: "train", image: "registry.avatar.io/train:1.0", description: "학습 오케스트레이터", version: "1.0", created: "2025-03-01",
    className: "TrainBase",
    attributes: [{ name: "args", type: "Any" }],  // 값 속성만. 컴포넌트 참조는 연결 시 자동 생성
    methods: [{ name: "run", params: "", returnType: "None", isAbstract: true }]  // 위임 메서드는 연결 시 자동 생성
  },
];

const INIT_TEST_RUNS = [
  { id: "RUN-INIT01", specId: "APP-001", specName: "LLM-FineTune-v3", status: "passed", gpu: "A100 x 2", mem: "64GB", created: "2025-01-29 15:30", duration: "0.34s", log: "[OK] 이미지 로드 성공 (A100 x 2)\n[OK] 환경 변수 검증 완료\n[OK] 컴포넌트 초기화 성공\n[OK] App 실행 완료 (0.34s)\nResult: PASS" },
];

const INIT_WORKLOADS = [
  { id: "WL-DEMO1", name: "BERT-Classifier", specId: "APP-001", requester: "정연구원", status: "completed", priority: "high", gpu: "A100 x 2", mem: "64GB", submitted: "2025-01-30 11:00", approved: "2025-01-30 12:00", testRunRef: "RUN-INIT01", completedAt: "2025-01-31 09:15", needsApproval: true, loopTest: { status: "passed", episodes: 5, results: { successRate: "100%", avgDuration: "0.34s", log: "Run 1: SUCCESS (0.32s)\nRun 3: SUCCESS (0.35s)\nRun 5: SUCCESS (0.34s)" }, executedBy: "developer", executedAt: "2025-01-30 11:30", attachedToRequest: true, reviewedBy: "admin", reviewedAt: "2025-01-30 12:00" } },
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

const LABEL = { high: "높음", medium: "보통", low: "낮음", running: "실행 중", queued: "대기", pending: "승인대기", completed: "완료", failed: "실패", rejected: "반려", ready: "준비됨", draft: "작성중", passed: "통과", waiting: "대기중", immediate: "자동승인", reviewed: "확인완료", attached: "결과첨부" };

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

const InputField = ({ label, value, onChange, placeholder, mono, disabled }) => {
  const id = "f-" + label.replace(/\s+/g, "-");
  return (
    <div>
      <label htmlFor={id} style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#64748B", marginBottom: 5 }}>{label}</label>
      <input id={id} value={value} onChange={onChange} placeholder={placeholder || label} disabled={disabled} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, fontFamily: mono ? "'JetBrains Mono',monospace" : "inherit", outline: "none", boxSizing: "border-box", background: disabled ? "#F8FAFC" : "#fff", color: "#0F172A", transition: "border-color .15s" }} />
    </div>
  );
};

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

/* ─── Helpers for 3-tier App→Task→Component structure ─── */
const getAllComponents = (spec) => {
  if (spec.tasks) return spec.tasks.flatMap(t => t.components || []);
  if (Array.isArray(spec.components)) return spec.components;
  return [];
};

const getComponentCount = (spec) => getAllComponents(spec).length;
const getTaskCount = (spec) => (spec.tasks || []).length;

const getMaxGpu = (spec) => {
  const comps = getAllComponents(spec);
  if (comps.length === 0) return "N/A";
  const maxComp = comps.reduce((max, c) => c.gpu_count > (max?.gpu_count || 0) ? c : max, null);
  return maxComp ? `${maxComp.gpu_type} x ${maxComp.gpu_count}` : "N/A";
};

const getMaxMem = (spec) => {
  const comps = getAllComponents(spec);
  if (comps.length === 0) return "0GB";
  return `${Math.max(...comps.map(c => parseInt(c.mem) || 0))}GB`;
};

const getTotalGpuSummary = (spec) => {
  const totals = {};
  getAllComponents(spec).forEach(c => { totals[c.gpu_type] = (totals[c.gpu_type] || 0) + c.gpu_count; });
  return Object.entries(totals).map(([t, n]) => `${t} x ${n}`).join(", ") || "N/A";
};

const getTotalMem = (spec) => {
  const total = getAllComponents(spec).reduce((sum, c) => sum + (parseInt(c.mem) || 0), 0);
  return `${total}GB`;
};

const getSpecImage = (spec) => {
  const comps = getAllComponents(spec);
  if (comps.length === 0) return "N/A";
  const suffix = comps.length > 1 ? ` 외 ${comps.length - 1}개` : "";
  return comps[0].image + suffix;
};

const wouldCreateCycle = (edges, fromId, toId) => {
  const visited = new Set();
  const stack = [toId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === fromId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    edges.filter(e => e.from === current).forEach(e => stack.push(e.to));
  }
  return false;
};

const exceedsThresholdSpec = (spec) => {
  return getAllComponents(spec).some(c =>
    c.gpu_count >= THRESHOLD.gpu || (parseInt(c.mem) || 0) >= THRESHOLD.mem
  );
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
  const [library, setLibrary] = useState(INIT_LIBRARY);

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

  /* ─── Test Run (user-initiated, same as App execution) ─── */
  const runTest = useCallback((specId) => {
    const spec = specs.find(s => s.id === specId);
    if (!spec) return;
    const tr = {
      id: rid(), specId, specName: spec.name, status: "running",
      gpu: getMaxGpu(spec), mem: getMaxMem(spec), created: now(), duration: null, log: ""
    };
    setTestRuns(prev => [...prev, tr]);
    flash("테스트 실행을 시작합니다...");

    setTimeout(() => {
      setTestRuns(prev => prev.map(t => t.id === tr.id ? {
        ...t, status: "passed", duration: (0.2 + Math.random() * 0.5).toFixed(2) + "s",
        log: `[OK] 이미지 로드 성공 (${getMaxGpu(spec)})\n[OK] 환경 변수 검증 완료\n[OK] 컴포넌트 초기화 성공 (${getComponentCount(spec)}개)\n[OK] App 실행 완료\nResult: PASS`
      } : t));
      flash("✓ 테스트 실행 완료 — 결과를 확인하세요.");
    }, 2500);

    return tr.id;
  }, [specs, flash]);

  /* ─── Workload Submission ─── */
  const addWorkload = useCallback((data) => {
    const needs = exceedsThreshold(data.gpu, data.mem);
    const attachedTest = data.attachedLoopTest || null;
    const wl = {
      id: uid(), ...data,
      status: needs ? "pending" : "queued",
      needsApproval: needs,
      submitted: now(), approved: null, completedAt: null,
      ...(needs ? { loopTest: attachedTest
        ? { ...attachedTest, attachedToRequest: true, reviewedBy: null, reviewedAt: null }
        : { status: "pending", episodes: null, results: null, executedBy: null, executedAt: null, attachedToRequest: false, reviewedBy: null, reviewedAt: null }
      } : {})
    };
    delete wl.attachedLoopTest;
    setWorkloads(prev => [...prev, wl]);

    if (needs) {
      flash(attachedTest
        ? "⚠ 자원 임계치 초과 — 테스트 결과가 첨부되었습니다. 관리자 확인 후 승인됩니다."
        : "⚠ 자원 임계치 초과 — 관리자 승인이 필요합니다."
      );
    } else {
      flash("✓ 자원 임계치 미만 — 실행 대기열에 진입합니다.");
    }
  }, [flash]);

  /* ─── Loop Test (minimum execution test for approval) ─── */
  const runLoopTest = useCallback((id, executedBy = "admin") => {
    setWorkloads(wl => wl.map(w => w.id === id ? { ...w, loopTest: { ...w.loopTest, status: "running" } } : w));
    flash("최소 실행 테스트를 시작합니다...");
    setTimeout(() => {
      setWorkloads(wl => wl.map(w => {
        if (w.id !== id) return w;
        const isRL = w.isTrainingRequest;
        return { ...w, loopTest: {
          status: "passed", episodes: isRL ? 10 : 5,
          results: isRL
            ? { convergence: true, avgReward: 85.3, finalReward: 92.1, log: "Episode 1: reward=72.1\nEpisode 5: reward=85.3\nEpisode 10: reward=92.1\nConvergence: YES" }
            : { successRate: "100%", avgDuration: "0.34s", log: "Run 1: SUCCESS (0.32s)\nRun 3: SUCCESS (0.35s)\nRun 5: SUCCESS (0.34s)" },
          executedBy, executedAt: now(), attachedToRequest: false, reviewedBy: null, reviewedAt: null
        }};
      }));
      flash("✓ 최소 실행 테스트 완료");
    }, 2000);
  }, [flash]);

  /* ─── Review Loop Test (admin confirms developer-attached test results) ─── */
  const reviewLoopTest = useCallback((id) => {
    setWorkloads(wl => wl.map(w => w.id === id ? { ...w, loopTest: { ...w.loopTest, reviewedBy: "admin", reviewedAt: now() } } : w));
    flash("✓ 테스트 결과 확인 완료 — 승인이 가능합니다.");
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
  const updateSpec = useCallback((id, updated) => setSpecs(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s)), []);

  /* ─── Derived State ─── */
  const pending = workloads.filter(w => w.status === "pending");
  const queued = workloads.filter(w => w.status === "queued");
  const running = workloads.filter(w => w.status === "running");

  const userNav = [
    { id: "home", l: "홈", ic: "home" },
    { id: "builder", l: "Builder", ic: "builder" },
    { id: "library", l: "컴포넌트 라이브러리", ic: "file" },
    { id: "trainer", l: "Trainer", ic: "play" },
    { id: "test", l: "테스트 실행", ic: "test" },
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
          <span style={{ fontSize: 11, fontWeight: 500, color: "#94A3B8", marginLeft: 2 }}>v1.9</span>
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
          {page === "builder" && <BuilderPage {...{ flash, addSpec, updateSpec, specs, library }} />}
          {page === "library" && <ComponentLibraryPage {...{ library, setLibrary, flash }} />}
          {page === "trainer" && <TrainerPage {...{ specs, addWorkload, flash }} />}
          {page === "test" && <TestRunPage {...{ specs, testRuns, runTest, setPage }} />}
          {page === "approval" && <ApprovalPage {...{ pending, approveWorkload, rejectWorkload, runLoopTest, reviewLoopTest, testRuns, setModal }} />}
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
          {mode === "user" ? "Avatar App 워크스페이스" : "플랫폼 관리"}
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "#64748B" }}>
          {mode === "user" ? "App을 개발하고, 학습을 요청하고, 워크로드를 실행하세요." : "워크로드 승인과 클러스터 리소스를 관리하세요."}
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

      {/* v1.5 Workflow guide */}
      <Card style={{ marginBottom: 20, background: "linear-gradient(135deg, #F8FAFC, #F1F5F9)", border: "1px solid #E2E8F0" }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>v1.6 워크플로우</div>
        <div style={{ display: "flex", gap: 0, alignItems: "stretch" }}>
          {[
            { step: "1", title: "Builder", desc: "App 개발\n(App→Task→Component)", color: "#475569" },
            { step: "2", title: "Trainer", desc: "사전 테스트 실행\n+ 결과 첨부 제출", color: "#7E22CE" },
            { step: "3", title: "확인/승인", desc: "첨부 결과 확인\n또는 관리자 테스트", color: "#1E40AF" },
            { step: "4", title: "실행 대기열", desc: "우선순위 관리", color: "#B45309" },
            { step: "5", title: "실행 · 완료", desc: "학습 실행\n→ 모델 생성", color: "#047857" },
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
              <Btn v="primary" icon="builder" onClick={() => setPage("builder")}>App 개발</Btn>
              <Btn icon="play" onClick={() => setPage("trainer")}>Trainer</Btn>
              <Btn icon="test" onClick={() => setPage("test")}>테스트 실행</Btn>
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

/* ═══════════════════════════ WORKFLOW DIAGRAM ═══════════════════════════ */
function WorkflowDiagram({ components, workflow }) {
  if (!components || components.length === 0 || !workflow || workflow.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
        컴포넌트와 연결을 추가하면 워크플로우 다이어그램이 표시됩니다
      </div>
    );
  }

  const compMap = {};
  components.forEach(c => { compMap[c.id] = c; });

  // Build adjacency and in-degree
  const adj = {};
  const inDeg = {};
  components.forEach(c => { adj[c.id] = []; inDeg[c.id] = 0; });
  workflow.forEach(e => {
    if (adj[e.from] && compMap[e.to]) {
      adj[e.from].push(e.to);
      inDeg[e.to] = (inDeg[e.to] || 0) + 1;
    }
  });

  // BFS from roots, rank = max(predecessor ranks) + 1
  const rank = {};
  const roots = components.filter(c => !inDeg[c.id] || inDeg[c.id] === 0);
  const queue = roots.map(c => c.id);
  roots.forEach(c => { rank[c.id] = 0; });

  const visited = new Set();
  while (queue.length > 0) {
    const cur = queue.shift();
    if (visited.has(cur)) continue;
    visited.add(cur);
    (adj[cur] || []).forEach(nxt => {
      rank[nxt] = Math.max(rank[nxt] || 0, (rank[cur] || 0) + 1);
      queue.push(nxt);
    });
  }

  // Disconnected nodes go to rank 0
  components.forEach(c => { if (rank[c.id] === undefined) rank[c.id] = 0; });

  // Group by rank
  const rankGroups = {};
  let maxRank = 0;
  components.forEach(c => {
    const r = rank[c.id];
    if (!rankGroups[r]) rankGroups[r] = [];
    rankGroups[r].push(c);
    if (r > maxRank) maxRank = r;
  });

  let maxNodesInRank = 0;
  Object.values(rankGroups).forEach(g => { if (g.length > maxNodesInRank) maxNodesInRank = g.length; });

  // Position nodes — top-to-bottom layout (rank = row, idx = column)
  const positions = {};
  const colSpacing = 180;
  const rowSpacing = 90;
  Object.keys(rankGroups).forEach(r => {
    const group = rankGroups[r];
    const groupWidth = group.length * colSpacing;
    const startX = (Math.max(maxNodesInRank * colSpacing, 400) - groupWidth) / 2;
    group.forEach((c, idx) => {
      positions[c.id] = { x: startX + idx * colSpacing + 30, y: parseInt(r) * rowSpacing + 30 };
    });
  });

  const nodeW = 150;
  const nodeH = 56;
  const svgW = Math.max(maxNodesInRank * colSpacing + 60, 400);
  const svgH = Math.max((maxRank + 1) * rowSpacing + 60, 150);

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={svgW} height={svgH} style={{ display: "block", margin: "0 auto" }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto" fill="#94A3B8">
            <polygon points="0 0, 10 3.5, 0 7" />
          </marker>
        </defs>
        {/* Edges — top to bottom */}
        {workflow.map((e, i) => {
          const from = positions[e.from];
          const to = positions[e.to];
          if (!from || !to) return null;
          return (
            <line key={i}
              x1={from.x + nodeW / 2} y1={from.y + nodeH}
              x2={to.x + nodeW / 2} y2={to.y}
              stroke="#94A3B8" strokeWidth={1.5} markerEnd="url(#arrowhead)" />
          );
        })}
        {/* Nodes */}
        {components.map(c => {
          const pos = positions[c.id];
          if (!pos) return null;
          const res = `${c.gpu_type || c.gpuType || ""} x ${c.gpu_count || c.gpuCount || ""}, ${c.mem}`;
          return (
            <g key={c.id}>
              <rect x={pos.x} y={pos.y} width={nodeW} height={nodeH} rx={10}
                fill="#DBEAFE" stroke="#1E40AF" strokeWidth={1.5} />
              <text x={pos.x + nodeW / 2} y={pos.y + 22} textAnchor="middle"
                fontSize={12} fontWeight="bold" fill="#0F172A">
                {(c.name || "unnamed").slice(0, 16)}
              </text>
              <text x={pos.x + nodeW / 2} y={pos.y + 42} textAnchor="middle"
                fontSize={9} fill="#64748B">
                {res}
              </text>
            </g>
);
        })}
      </svg>
    </div>
  );
}

/* ═══════════════════════════ BUILDER ═══════════════════════════ */
function BuilderPage({ flash, addSpec, updateSpec, specs, library }) {
  const [view, setView] = useState("list"); // "list" or "editor"
  const [editingSpecId, setEditingSpecId] = useState(null);
  const [activeTab, setActiveTab] = useState("app");
  const [selTaskIdx, setSelTaskIdx] = useState(0);
  const [form, setForm] = useState({
    name: "", version: "1.0.0",
    envVars: [{ key: "", value: "" }],
    tasks: [{ id: tid(), name: "default-task", imported_from: null, components: [], workflow: [] }],
    classSpec: { relationships: { composition: [], method_calls: [] } },
    implCode: ""
  });
  const [generated, setGenerated] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [expandedComp, setExpandedComp] = useState(null);
  const [classConnectSource, setClassConnectSource] = useState(null);
  const [classConnectPopup, setClassConnectPopup] = useState(null); // { sourceId, targetId }
  const [classConnectAttrName, setClassConnectAttrName] = useState("");
  const [classConnectMethodEntries, setClassConnectMethodEntries] = useState([]); // [{ callerMethod, calleeMethod }]
  const [basePyModal, setBasePyModal] = useState(null); // null or { code: string }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const parseJSON = (s) => { try { return JSON.parse(s); } catch { return s || {}; } };
  const curTask = form.tasks[selTaskIdx] || form.tasks[0];

  const setTask = (taskIdx, key, val) => setForm(f => ({
    ...f, tasks: f.tasks.map((t, i) => i === taskIdx ? { ...t, [key]: val } : t)
  }));
  const setComp = (taskIdx, compIdx, key, val) => setForm(f => ({
    ...f, tasks: f.tasks.map((t, i) => i !== taskIdx ? t : {
      ...t, components: t.components.map((c, j) => j === compIdx ? { ...c, [key]: val } : c)
    })
  }));

  const addTask = () => set("tasks", [...form.tasks, { id: tid(), name: "", imported_from: null, components: [], workflow: [] }]);
  const deleteTask = (idx) => { set("tasks", form.tasks.filter((_, i) => i !== idx)); if (selTaskIdx >= form.tasks.length - 1) setSelTaskIdx(Math.max(0, form.tasks.length - 2)); };

  const addComponentManual = () => {
    const t = form.tasks[selTaskIdx];
    const maxOrder = t.components.reduce((m, c) => Math.max(m, c.order), 0);
    setTask(selTaskIdx, "components", [...t.components, {
      id: cid(), name: "", image: "", tag: "", gpuType: "A100", gpuCount: "2", mem: "64GB", params: "", order: maxOrder + 1,
      className: "", attributes: [], methods: []
    }]);
  };
  const addFromLibrary = (libComp) => {
    const t = form.tasks[selTaskIdx];
    const maxOrder = t.components.reduce((m, c) => Math.max(m, c.order), 0);
    const [img, tag] = libComp.image.split(":");
    setTask(selTaskIdx, "components", [...t.components, {
      id: cid(), name: libComp.name, image: img, tag: tag || "latest",
      gpuType: "A100", gpuCount: "2", mem: "64GB", params: "", order: maxOrder + 1, libraryRef: libComp.id,
      className: libComp.className || "",
      attributes: libComp.attributes ? libComp.attributes.map(a => ({ ...a })) : [],
      methods: libComp.methods ? libComp.methods.map(m => ({ ...m })) : []
    }]);
    flash(`✓ ${libComp.name} 컴포넌트를 라이브러리에서 추가했습니다.`);
  };
  const deleteComponent = (compIdx) => {
    const t = form.tasks[selTaskIdx];
    const comp = t.components[compIdx];
    setTask(selTaskIdx, "components", t.components.filter((_, i) => i !== compIdx).map((c, i) => ({ ...c, order: i + 1 })));
    setTask(selTaskIdx, "workflow", t.workflow.filter(e => e.from !== comp.id && e.to !== comp.id));
    // Also clean up classSpec relationships referencing this component
    const cs = form.classSpec;
    if (cs?.relationships) {
      set("classSpec", {
        ...cs, relationships: {
          composition: (cs.relationships.composition || []).filter(r => r.owner !== comp.id && r.target !== comp.id),
          method_calls: (cs.relationships.method_calls || []).filter(r => r.caller !== comp.id && r.callee !== comp.id)
        }
      });
    }
  };

  const importApp = (appSpec) => {
    const newTasks = (appSpec.tasks || []).map(t => ({ ...t, id: tid(), imported_from: appSpec.id }));
    set("tasks", [...form.tasks, ...newTasks]);
    setShowImport(false);
    flash(`✓ ${appSpec.name}에서 Task ${newTasks.length}개를 가져왔습니다.`);
  };

  // Open existing app for editing
  const openSpec = (spec) => {
    setForm({
      name: spec.name, version: spec.version,
      envVars: [{ key: "", value: "" }],
      tasks: (spec.tasks || []).map(t => ({
        id: t.id, name: t.name, imported_from: t.imported_from || null,
        components: (t.components || []).map(c => {
          const lib = library.find(l => l.id === c.libraryRef || l.name === c.name);
          return {
            id: c.id, name: c.name, image: c.image?.split(":")[0] || c.image || "", tag: c.tag || "",
            gpuType: c.gpu_type || c.gpuType || "A100", gpuCount: String(c.gpu_count || c.gpuCount || 2),
            mem: c.mem || "64GB", params: c.params ? (typeof c.params === "string" ? c.params : JSON.stringify(c.params)) : "",
            order: c.order || 1, libraryRef: c.libraryRef || null,
            className: c.className || lib?.className || "",
            attributes: c.attributes ? c.attributes.map(a => ({ ...a })) : (lib?.attributes ? lib.attributes.map(a => ({ ...a })) : []),
            methods: c.methods ? c.methods.map(m => ({ ...m })) : (lib?.methods ? lib.methods.map(m => ({ ...m })) : [])
          };
        }),
        workflow: t.workflow || []
      })),
      classSpec: spec.classSpec ? JSON.parse(JSON.stringify(spec.classSpec)) : { relationships: { composition: [], method_calls: [] } },
      implCode: spec.implCode || ""
    });
    setEditingSpecId(spec.id);
    setSelTaskIdx(0);
    setActiveTab("app");
    setGenerated(null);
    setView("editor");
  };

  const startNew = () => {
    setForm({
      name: "", version: "1.0.0",
      envVars: [{ key: "", value: "" }],
      tasks: [{ id: tid(), name: "default-task", imported_from: null, components: [], workflow: [] }],
      classSpec: { relationships: { composition: [], method_calls: [] } },
      implCode: ""
    });
    setEditingSpecId(null);
    setSelTaskIdx(0);
    setActiveTab("app");
    setGenerated(null);
    setView("editor");
  };

  const saveSpec = () => {
    const specName = form.name || "MyApp-v1";
    const builtTasks = form.tasks.map(t => ({
      id: t.id, name: t.name || "unnamed-task", imported_from: t.imported_from || null,
      components: t.components.map(c => ({
        id: c.id, name: c.name || `component_${c.order}`,
        image: (c.image || "registry.avatar.io/default") + ":" + (c.tag || "latest"), tag: c.tag || "latest",
        gpu_type: c.gpuType, gpu_count: parseInt(c.gpuCount) || 2, mem: c.mem || "64GB", params: parseJSON(c.params), order: c.order,
        libraryRef: c.libraryRef || null,
        className: c.className || "", attributes: c.attributes || [], methods: c.methods || []
      })),
      workflow: t.workflow
    }));

    if (editingSpecId) {
      updateSpec(editingSpecId, { name: specName, version: form.version || "1.0.0", tasks: builtTasks, classSpec: form.classSpec, implCode: form.implCode || "" });
      flash("✓ App이 업데이트되었습니다.");
    } else {
      const specObj = {
        app_id: "APP-" + Math.random().toString(36).substr(2, 6).toUpperCase(),
        name: specName, version: form.version || "1.0.0",
        env_vars: Object.fromEntries(form.envVars.filter(e => e.key).map(e => [e.key, e.value])),
        tasks: form.tasks.map(t => ({
          task_id: t.id, name: t.name || "unnamed-task", imported_from: t.imported_from || null,
          components: t.components.map(c => ({
            component_id: c.id, name: c.name || `component_${c.order}`,
            image: { registry: c.image || "registry.avatar.io/default", tag: c.tag || "latest" },
            resources: { gpu_type: c.gpuType, gpu_count: parseInt(c.gpuCount) || 2, memory: c.mem || "64GB" },
            params: parseJSON(c.params)
          })),
          workflow: t.workflow
        })),
        imported_apps: [...new Set(form.tasks.filter(t => t.imported_from).map(t => t.imported_from))].map(id => {
          const s = specs.find(x => x.id === id); return { app_ref: id, name: s?.name || id };
        }),
        training_config: { episodes: 1000, learning_rate: 0.001, batch_size: 64, gamma: 0.99, max_steps_per_episode: 500 },
        storage: { type: "distributed", path: "/training-data/" + specName.toLowerCase() },
        created_at: new Date().toISOString()
      };
      setGenerated(specObj);
      addSpec({
        id: "APP-" + Math.random().toString(36).substr(2, 4).toUpperCase(),
        name: specName, version: form.version || "1.0.0", status: "ready", created: now().split(" ")[0],
        tasks: builtTasks, imported_apps: [], classSpec: form.classSpec, implCode: form.implCode || ""
      });
      flash("✓ App 스펙 파일이 생성되었습니다.");
    }
  };

  /* ── LIST VIEW ── */
  if (view === "list") return (
    <div>
      <Title sub="App 목록을 확인하고, 새 App을 만들거나 기존 App을 편집합니다.">Builder — App 개발</Title>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>App 목록 ({specs.length})</div>
        <Btn v="primary" icon="builder" onClick={startNew}>새 App 만들기</Btn>
      </div>

      {specs.length === 0 ? (
        <Card><p style={{ textAlign: "center", color: "#94A3B8", fontSize: 14, padding: 36 }}>등록된 App이 없습니다. "새 App 만들기"를 클릭하여 시작하세요.</p></Card>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {specs.map(s => (
            <Card key={s.id} style={{ cursor: "pointer", transition: "box-shadow .15s", border: "1px solid #E2E8F0" }} onClick={() => openSpec(s)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>{s.name}</span>
                    <span style={{ fontSize: 12, color: "#94A3B8" }}>v{s.version}</span>
                    <Badge v={s.status}>{LABEL[s.status] || s.status}</Badge>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", display: "flex", gap: 16 }}>
                    <span>Task {getTaskCount(s)}개</span>
                    <span>Component {getComponentCount(s)}개</span>
                    <span>{getTotalGpuSummary(s)}, {getTotalMem(s)}</span>
                    <span>생성: {s.created}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn sz="sm" onClick={(e) => { e.stopPropagation(); openSpec(s); }}>편집</Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  /* ── EDITOR VIEW ── */
  return (
    <div>
      {/* Back button + title */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => setView("list")} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#64748B", fontFamily: "inherit" }}>
          ← App 목록
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: -0.3, color: "#0F172A" }}>
            {editingSpecId ? `${form.name || "App"} 편집` : "새 App 만들기"}
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748B" }}>
            {editingSpecId ? "기존 App의 Task와 Component를 수정합니다." : "App을 생성하고, Task를 구성하며, Component를 배치합니다."}
          </p>
        </div>
      </div>

      {generated ? (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <I n="check" s={18} c="#166534" />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#166534" }}>App 스펙 파일 생성 완료</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Btn sz="sm" onClick={() => setView("list")}>App 목록으로</Btn>
              <Btn sz="sm" onClick={() => setGenerated(null)}>계속 편집</Btn>
            </div>
          </div>
          <pre style={{ background: "#0F172A", borderRadius: 10, padding: 18, fontSize: 12, fontFamily: "'JetBrains Mono',monospace", overflow: "auto", lineHeight: 1.7, color: "#E2E8F0", margin: 0 }}>{JSON.stringify(generated, null, 2)}</pre>
          <p style={{ margin: "14px 0 0", fontSize: 12, color: "#64748B" }}>→ Trainer 또는 테스트 실행 페이지에서 이 App을 선택할 수 있습니다.</p>
        </Card>
      ) : (
        <>
          {/* Tab bar */}
          <div role="tablist" style={{ display: "flex", background: "#F1F5F9", borderRadius: 10, padding: 3, gap: 2, marginBottom: 20, width: "fit-content" }}>
            {[["app", "App 관리"], ["design", "컴포넌트 설계"], ["impl", "코드 구현"]].map(([key, label]) => (
              <button role="tab" key={key} onClick={() => setActiveTab(key)} aria-selected={activeTab === key} style={{
                padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: activeTab === key ? 600 : 400,
                background: activeTab === key ? "#0F172A" : "transparent",
                color: activeTab === key ? "#fff" : "#64748B",
                transition: "all .15s", fontFamily: "inherit"
              }}>
                {label}
              </button>
            ))}
          </div>

          {/* TAB 1: App 관리 */}
          {activeTab === "app" && (
            <>
              <Card style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>기본 정보</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <InputField label="App 이름" value={form.name} onChange={e => set("name", e.target.value)} placeholder="MyApp-v1" />
                  <InputField label="버전" value={form.version} onChange={e => set("version", e.target.value)} placeholder="1.0.0" />
                </div>
              </Card>

              <Card style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>환경 변수 (App 레벨)</div>
                  <Btn sz="sm" onClick={() => set("envVars", [...form.envVars, { key: "", value: "" }])}>+ 추가</Btn>
                </div>
                {form.envVars.map((env, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <input value={env.key} onChange={e => set("envVars", form.envVars.map((x, j) => j === i ? { ...x, key: e.target.value } : x))} placeholder="KEY" style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, fontFamily: "'JetBrains Mono',monospace", outline: "none" }} />
                    <input value={env.value} onChange={e => set("envVars", form.envVars.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} placeholder="VALUE" style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, fontFamily: "'JetBrains Mono',monospace", outline: "none" }} />
                    <button onClick={() => set("envVars", form.envVars.filter((_, j) => j !== i))} style={{ padding: 6, background: "none", border: "none", cursor: "pointer" }}><I n="close" s={14} c="#94A3B8" /></button>
                  </div>
                ))}
              </Card>

              <Card style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Task 목록 ({form.tasks.length})</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn sz="sm" onClick={addTask}>+ Task 추가</Btn>
                    <Btn sz="sm" v="accent" onClick={() => setShowImport(!showImport)}>App Import</Btn>
                  </div>
                </div>
                {showImport && (
                  <div style={{ marginBottom: 14, padding: 14, background: "#EFF6FF", borderRadius: 10, border: "1px solid #BFDBFE" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1E40AF", marginBottom: 8 }}>다른 App에서 Task 가져오기</div>
                    {specs.filter(s => s.status === "ready" && s.id !== editingSpecId).map(s => (
                      <div key={s.id} onClick={() => importApp(s)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #E2E8F0", cursor: "pointer", marginBottom: 4, background: "#fff", fontSize: 13, display: "flex", justifyContent: "space-between" }}>
                        <span><b>{s.name}</b> — Task {getTaskCount(s)}개, Component {getComponentCount(s)}개</span>
                        <span style={{ color: "#1E40AF", fontWeight: 600 }}>Import</span>
                      </div>
                    ))}
                  </div>
                )}
                {form.tasks.map((t, i) => (
                  <div key={t.id} style={{ padding: 14, border: "1px solid #E2E8F0", borderRadius: 10, marginBottom: 8, background: "#FAFBFC", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input value={t.name} onChange={e => setTask(i, "name", e.target.value)} placeholder="Task 이름" style={{ fontSize: 14, fontWeight: 600, border: "none", background: "transparent", outline: "none", width: 200 }} />
                        {t.imported_from && <span style={{ fontSize: 10, background: "#EFF6FF", color: "#1E40AF", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>imported</span>}
                        <span style={{ fontSize: 12, color: "#94A3B8" }}>Component {t.components.length}개</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Btn sz="sm" onClick={() => { setSelTaskIdx(i); setActiveTab("design"); }}>편집</Btn>
                      {form.tasks.length > 1 && <button onClick={() => deleteTask(i)} style={{ padding: 4, background: "none", border: "none", cursor: "pointer" }}><I n="close" s={14} c="#94A3B8" /></button>}
                    </div>
                  </div>
                ))}
              </Card>

              <Btn v="primary" sz="lg" onClick={saveSpec}>{editingSpecId ? "App 저장" : "App 스펙 파일 생성"}</Btn>
            </>
          )}

          {/* TAB 2: 컴포넌트 설계 (Unified view) */}
          {activeTab === "design" && (() => {
            const allComps = form.tasks.flatMap((t, ti) => t.components.map((c, ci) => ({ ...c, _taskIdx: ti, _compIdx: ci })));
            const cs = form.classSpec || { relationships: { composition: [], method_calls: [] } };

            /* Derive workflow from composition relationships */
            const deriveWorkflow = (classSpec) => {
              const comp = classSpec?.relationships?.composition || [];
              return comp.map(r => ({ from: r.target, to: r.owner }));
            };
            const derivedWorkflow = deriveWorkflow(cs);
            /* For backward compatibility: use derived if classSpec exists, else manual */
            const effectiveWorkflow = (cs.relationships?.composition?.length > 0) ? derivedWorkflow : curTask.workflow;

            const setCompField = (taskIdx, compIdx, key, val) => setComp(taskIdx, compIdx, key, val);
            const addAttribute = (taskIdx, compIdx) => {
              const c = form.tasks[taskIdx].components[compIdx];
              setCompField(taskIdx, compIdx, "attributes", [...(c.attributes || []), { name: "", type: "Any" }]);
            };
            const removeAttribute = (taskIdx, compIdx, attrIdx) => {
              const c = form.tasks[taskIdx].components[compIdx];
              setCompField(taskIdx, compIdx, "attributes", (c.attributes || []).filter((_, i) => i !== attrIdx));
            };
            const setAttr = (taskIdx, compIdx, attrIdx, key, val) => {
              const c = form.tasks[taskIdx].components[compIdx];
              setCompField(taskIdx, compIdx, "attributes", (c.attributes || []).map((a, i) => i === attrIdx ? { ...a, [key]: val } : a));
            };
            const addMethod = (taskIdx, compIdx) => {
              const c = form.tasks[taskIdx].components[compIdx];
              setCompField(taskIdx, compIdx, "methods", [...(c.methods || []), { name: "", params: "", returnType: "None", isAbstract: true }]);
            };
            const removeMethod = (taskIdx, compIdx, mIdx) => {
              const c = form.tasks[taskIdx].components[compIdx];
              setCompField(taskIdx, compIdx, "methods", (c.methods || []).filter((_, i) => i !== mIdx));
            };
            const setMethod = (taskIdx, compIdx, mIdx, key, val) => {
              const c = form.tasks[taskIdx].components[compIdx];
              setCompField(taskIdx, compIdx, "methods", (c.methods || []).map((m, i) => i === mIdx ? { ...m, [key]: val } : m));
            };

            const handleClassNodeClick = (comp) => {
              if (!classConnectSource) return;
              if (classConnectSource === comp.id) { setClassConnectSource(null); return; }
              const tgt = allComps.find(c => c.id === comp.id);
              const defaultAttrName = (tgt?.className || tgt?.name || "target").replace(/Base$/, "").replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "") + "_component";
              setClassConnectPopup({ sourceId: classConnectSource, targetId: comp.id });
              setClassConnectAttrName(defaultAttrName);
              setClassConnectMethodEntries([]);
            };

            const confirmClassConnection = () => {
              const src = allComps.find(c => c.id === classConnectPopup.sourceId);
              const tgt = allComps.find(c => c.id === classConnectPopup.targetId);
              if (!src || !tgt) return;
              const attrName = classConnectAttrName || (tgt.className || tgt.name).replace(/Base$/, "").replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "") + "_component";
              const newCs = { ...cs, relationships: { composition: [...(cs.relationships?.composition || [])], method_calls: [...(cs.relationships?.method_calls || [])] } };
              // Always add composition
              newCs.relationships.composition.push({ owner: src.id, attribute: attrName, target: tgt.id });
              // Auto-add attribute to source component
              const srcAttrs = [...(src.attributes || [])];
              if (!srcAttrs.some(a => a.name === attrName)) {
                srcAttrs.push({ name: attrName, type: tgt.className || tgt.name });
                setCompField(src._taskIdx, src._compIdx, "attributes", srcAttrs);
              }
              // Add method calls if any
              classConnectMethodEntries.forEach(entry => {
                if (entry.callerMethod && entry.calleeMethod) {
                  newCs.relationships.method_calls.push({ caller: src.id, callerMethod: entry.callerMethod, callee: tgt.id, calleeMethod: entry.calleeMethod });
                }
              });
              set("classSpec", newCs);
              setClassConnectPopup(null);
              setClassConnectSource(null);
              flash("✓ 컴포넌트 연결이 추가되었습니다.");
            };

            /* Cascade delete: remove composition + associated method_calls */
            const removeComposition = (idx) => {
              const comp = cs.relationships.composition[idx];
              const newCompositions = cs.relationships.composition.filter((_, i) => i !== idx);
              // Cascade: remove all method_calls where caller===owner AND callee===target
              const newMethodCalls = cs.relationships.method_calls.filter(mc =>
                !(mc.caller === comp.owner && mc.callee === comp.target)
              );
              set("classSpec", { ...cs, relationships: { composition: newCompositions, method_calls: newMethodCalls } });
              flash("✓ 연결 및 관련 메서드 호출이 삭제되었습니다.");
            };
            const removeMethodCall = (idx) => {
              const newCs = { ...cs, relationships: { composition: [...cs.relationships.composition], method_calls: cs.relationships.method_calls.filter((_, i) => i !== idx) } };
              set("classSpec", newCs);
            };

            /* ── generateBasePyCode (returns string) ── */
            const generateBasePyCode = () => {
              const classComps = allComps.filter(c => c.className);
              if (classComps.length === 0) return null;

              const depGraph = {};
              classComps.forEach(c => { depGraph[c.id] = new Set(); });
              (cs.relationships?.composition || []).forEach(r => {
                if (depGraph[r.owner] && depGraph[r.target]) depGraph[r.owner].add(r.target);
              });
              (cs.relationships?.method_calls || []).forEach(r => {
                if (depGraph[r.caller] && depGraph[r.callee]) depGraph[r.caller].add(r.callee);
              });

              const sorted = [];
              const visited = new Set();
              const visiting = new Set();
              const visit = (id) => {
                if (visited.has(id)) return;
                if (visiting.has(id)) return;
                visiting.add(id);
                (depGraph[id] || new Set()).forEach(dep => visit(dep));
                visiting.delete(id);
                visited.add(id);
                sorted.push(id);
              };
              classComps.forEach(c => visit(c.id));

              const sortedComps = sorted.map(id => classComps.find(c => c.id === id)).filter(Boolean);

              const methodCallsByOwner = {};
              (cs.relationships?.method_calls || []).forEach(r => {
                if (!methodCallsByOwner[r.caller]) methodCallsByOwner[r.caller] = [];
                methodCallsByOwner[r.caller].push(r);
              });

              let code = "from abc import ABC, abstractmethod\nfrom typing import Any, Optional\n\n\nclass ComponentBase(ABC):\n    \"\"\"Common base type for all workflow components.\"\"\"\n    pass\n";

              const compositionByOwner = {};
              (cs.relationships?.composition || []).forEach(r => {
                if (!compositionByOwner[r.owner]) compositionByOwner[r.owner] = [];
                const tgtComp = allComps.find(c => c.id === r.target);
                compositionByOwner[r.owner].push({ attribute: r.attribute, targetClassName: tgtComp?.className || r.target });
              });

              sortedComps.forEach(comp => {
                const cls = comp.className;
                const valueAttrs = comp.attributes || [];
                const connAttrs = (compositionByOwner[comp.id] || []).map(r => ({ name: r.attribute, type: `Optional[${r.targetClassName}]` }));
                const allAttrs = [...valueAttrs, ...connAttrs];
                const methods = comp.methods || [];
                const desc = comp.name || cls;

                code += `\n\nclass ${cls}(ComponentBase):\n    \"\"\"${desc}\"\"\"\n\n`;

                const initParts = [];
                valueAttrs.forEach(a => { initParts.push(`${a.name}: ${a.type}`); });
                connAttrs.forEach(a => { initParts.push(`${a.name}: ${a.type} = None`); });
                code += `    def __init__(self${initParts.length ? ", " + initParts.join(", ") : ""}) -> None:\n`;
                if (allAttrs.length === 0) {
                  code += `        pass\n`;
                } else {
                  allAttrs.forEach(a => { code += `        self.${a.name} = ${a.name}\n`; });
                }

                methods.forEach(m => {
                  if (m.isAbstract) {
                    code += `\n    @abstractmethod\n`;
                    code += `    def ${m.name}(self${m.params ? ", " + m.params : ""}) -> ${m.returnType || "None"}:\n`;
                    code += `        pass\n`;
                  } else {
                    code += `\n    def ${m.name}(self${m.params ? ", " + m.params : ""}) -> ${m.returnType || "None"}:\n`;
                    code += `        pass\n`;
                  }
                });

                const ownerCalls = methodCallsByOwner[comp.id] || [];
                ownerCalls.forEach(mc => {
                  const calleeComp = allComps.find(c => c.id === mc.callee);
                  const calleeClassName = calleeComp?.className || mc.callee;
                  const compRelation = (cs.relationships?.composition || []).find(r => r.owner === comp.id && r.target === mc.callee);
                  const attrName = compRelation?.attribute || mc.callee;
                  code += `\n    def ${mc.callerMethod}(self, *args, **kwargs):\n`;
                  code += `        \"\"\"Arrow: ${cls} -> ${calleeClassName}\"\"\"\n`;
                  code += `        if self.${attrName} is None:\n`;
                  code += `            raise ValueError('${attrName} is not set.')\n`;
                  code += `        self.${attrName}.${mc.calleeMethod}(*args, **kwargs)\n`;
                });
              });

              return code;
            };

            const generateBasePy = () => {
              const code = generateBasePyCode();
              if (!code) { flash("클래스가 정의된 컴포넌트가 없습니다."); return; }
              setBasePyModal({ code });
            };

            const downloadBasePy = () => {
              if (!basePyModal?.code) return;
              const blob = new Blob([basePyModal.code], { type: "text/x-python" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = "base.py"; a.click();
              URL.revokeObjectURL(url);
              flash("✓ base.py 다운로드 완료");
            };

            const copyBasePy = () => {
              if (!basePyModal?.code) return;
              navigator.clipboard.writeText(basePyModal.code).then(() => flash("✓ 클립보드에 복사되었습니다.")).catch(() => flash("복사에 실패했습니다."));
            };

            const badgeStyle = { display: "inline-block", padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: "#F1F5F9", color: "#475569" };
            const connBadgeStyle = { display: "inline-block", padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: "#F0FDF4", color: "#166534" };

            return (
              <>
                {/* ── Task selection (full width above split) ── */}
                <Card style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Task 선택</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {form.tasks.map((t, i) => (
                      <button key={t.id} onClick={() => setSelTaskIdx(i)} style={{ padding: "6px 14px", borderRadius: 8, border: selTaskIdx === i ? "2px solid #0F172A" : "1px solid #E2E8F0", background: selTaskIdx === i ? "#F1F5F9" : "#fff", cursor: "pointer", fontSize: 13, fontWeight: selTaskIdx === i ? 600 : 400, fontFamily: "inherit" }}>
                        {t.name || `Task ${i + 1}`}
                      </button>
                    ))}
                  </div>
                </Card>

                {/* ── Split view container ── */}
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>

                  {/* ── LEFT PANEL (45%) - scrollable ── */}
                  <div style={{ flex: "0 0 45%", maxWidth: "45%" }}>

                    {/* ── Library buttons + Add ── */}
                    <Card style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>컴포넌트 ({curTask.components.length})</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <Btn sz="sm" onClick={addComponentManual}>직접 추가</Btn>
                        </div>
                      </div>
                      {library && library.length > 0 && (
                        <div style={{ marginBottom: 14, display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {library.map(lc => (
                            <button key={lc.id} onClick={() => addFromLibrary(lc)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #BFDBFE", background: "#EFF6FF", cursor: "pointer", fontSize: 11, fontWeight: 500, color: "#1E40AF", fontFamily: "inherit" }}>
                              + {lc.name}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Connect mode banner */}
                      {classConnectSource && (
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#6366F1", marginBottom: 10, padding: "8px 12px", background: "#EEF2FF", borderRadius: 8, border: "1px solid #C7D2FE", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span>◆ 소스: <strong>{allComps.find(c => c.id === classConnectSource)?.className || allComps.find(c => c.id === classConnectSource)?.name || "?"}</strong> — 타겟 카드를 클릭하세요</span>
                          <button onClick={() => setClassConnectSource(null)} style={{ padding: "2px 10px", borderRadius: 4, border: "1px solid #C7D2FE", background: "#E0E7FF", cursor: "pointer", fontSize: 11, color: "#6366F1", fontFamily: "inherit", fontWeight: 600 }}>취소</button>
                        </div>
                      )}

                      {curTask.components.length === 0 ? (
                        <p style={{ textAlign: "center", color: "#94A3B8", fontSize: 13, padding: 16 }}>컴포넌트를 추가하세요. 라이브러리에서 선택하거나 직접 추가할 수 있습니다.</p>
                      ) : (
                        <>
                          {/* ── Component cards - single column list ── */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
                            {curTask.components.map((c, i) => {
                              const isSource = classConnectSource === c.id;
                              const isTarget = classConnectSource && classConnectSource !== c.id;
                              const isExpanded = expandedComp === c.id;
                              const compCount = (cs.relationships?.composition || []).filter(r => r.owner === c.id || r.target === c.id).length;
                              return (
                                <div key={c.id} onClick={() => { if (isTarget) handleClassNodeClick(c); }} style={{
                                  padding: 14, borderRadius: 12, cursor: isTarget ? "pointer" : "default",
                                  border: `2px solid ${isSource ? "#6366F1" : isTarget ? "#A5B4FC" : isExpanded ? "#0F172A" : "#E2E8F0"}`,
                                  background: isSource ? "#EEF2FF" : isTarget ? "#F5F3FF" : "#FAFBFC",
                                  transition: "all .15s",
                                  boxShadow: isSource ? "0 0 0 3px rgba(99,102,241,.15)" : isTarget ? "0 0 0 2px rgba(165,180,252,.2)" : "none"
                                }}>
                                  {/* Header */}
                                  <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name || "unnamed"}</div>
                                  {c.className && <div style={{ fontSize: 11, color: "#6366F1", fontFamily: "'JetBrains Mono',monospace" }}>{c.className}</div>}
                                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{c.gpuType} x{c.gpuCount} · {c.mem}</div>

                                  {/* Summary badges */}
                                  <div style={{ display: "flex", gap: 4, marginTop: 6, marginBottom: 8, flexWrap: "wrap" }}>
                                    {(c.attributes || []).length > 0 && <span style={badgeStyle}>attrs: {c.attributes.length}</span>}
                                    {(c.methods || []).length > 0 && <span style={badgeStyle}>methods: {c.methods.length}</span>}
                                    {compCount > 0 && <span style={connBadgeStyle}>연결: {compCount}</span>}
                                  </div>

                                  {/* Buttons */}
                                  <div style={{ display: "flex", gap: 4, borderTop: "1px solid #E2E8F0", paddingTop: 8 }}>
                                    <button title="연결" onClick={(e) => { e.stopPropagation(); setClassConnectSource(isSource ? null : c.id); }} style={{
                                      flex: 1, padding: "5px 0", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "inherit", fontWeight: 600,
                                      border: `1px solid ${isSource ? "#6366F1" : "#E2E8F0"}`,
                                      background: isSource ? "#6366F1" : "#fff",
                                      color: isSource ? "#fff" : "#6366F1"
                                    }}>연결</button>
                                    <button title="편집" onClick={(e) => { e.stopPropagation(); setExpandedComp(isExpanded ? null : c.id); }} style={{
                                      flex: 1, padding: "5px 0", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "inherit", fontWeight: 600,
                                      border: `1px solid ${isExpanded ? "#0F172A" : "#E2E8F0"}`,
                                      background: isExpanded ? "#0F172A" : "#fff",
                                      color: isExpanded ? "#fff" : "#64748B"
                                    }}>편집</button>
                                    <button title="삭제" onClick={(e) => { e.stopPropagation(); deleteComponent(i); if (expandedComp === c.id) setExpandedComp(null); }} style={{
                                      padding: "5px 8px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "inherit",
                                      border: "1px solid #FEE2E2", background: "#FFF5F5", color: "#EF4444"
                                    }}>×</button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* ── Expanded edit panel ── */}
                          {expandedComp && (() => {
                            const compIdx = curTask.components.findIndex(c => c.id === expandedComp);
                            if (compIdx < 0) return null;
                            const c = curTask.components[compIdx];
                            const attrs = c.attributes || [];
                            const methods = c.methods || [];
                            return (
                              <div style={{ padding: 16, border: "2px solid #0F172A", borderRadius: 12, marginBottom: 14, background: "#FAFBFC" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                  <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name || "unnamed"} — 상세 편집</div>
                                  <button onClick={() => setExpandedComp(null)} style={{ padding: 4, background: "none", border: "none", cursor: "pointer" }}><I n="close" s={15} c="#94A3B8" /></button>
                                </div>

                                {/* 기본 정보 */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                                  <InputField label="이름" value={c.name} onChange={e => setComp(selTaskIdx, compIdx, "name", e.target.value)} placeholder="component-name" />
                                  <InputField label="클래스명" value={c.className || ""} onChange={e => setComp(selTaskIdx, compIdx, "className", e.target.value)} placeholder="ClassName" mono />
                                </div>

                                {/* 인프라 */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                                  <InputField label="Docker 이미지" value={c.image} onChange={e => setComp(selTaskIdx, compIdx, "image", e.target.value)} placeholder="registry.avatar.io/my-image" mono />
                                  <InputField label="태그" value={c.tag} onChange={e => setComp(selTaskIdx, compIdx, "tag", e.target.value)} placeholder="latest" mono />
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                                  <InputField label="GPU 유형" value={c.gpuType} onChange={e => setComp(selTaskIdx, compIdx, "gpuType", e.target.value)} placeholder="A100" />
                                  <InputField label="GPU 수" value={c.gpuCount} onChange={e => setComp(selTaskIdx, compIdx, "gpuCount", e.target.value)} placeholder="2" />
                                  <InputField label="메모리" value={c.mem} onChange={e => setComp(selTaskIdx, compIdx, "mem", e.target.value)} placeholder="64GB" />
                                </div>

                                {/* Attributes */}
                                <div style={{ marginBottom: 10 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>Attributes ({attrs.length})</span>
                                    <button onClick={() => addAttribute(selTaskIdx, compIdx)} style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 600, color: "#6366F1", fontFamily: "inherit" }}>+ 추가</button>
                                  </div>
                                  {attrs.map((a, ai) => (
                                    <div key={ai} style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 3 }}>
                                      <input value={a.name} onChange={e => setAttr(selTaskIdx, compIdx, ai, "name", e.target.value)} placeholder="name" style={{ flex: 1, padding: "4px 8px", borderRadius: 4, border: "1px solid #E2E8F0", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", outline: "none", boxSizing: "border-box" }} />
                                      <input value={a.type} onChange={e => setAttr(selTaskIdx, compIdx, ai, "type", e.target.value)} placeholder="type" style={{ width: 90, padding: "4px 8px", borderRadius: 4, border: "1px solid #E2E8F0", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", outline: "none", color: "#6366F1", boxSizing: "border-box" }} />
                                      <button onClick={() => removeAttribute(selTaskIdx, compIdx, ai)} style={{ padding: "2px 4px", background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 12 }}>×</button>
                                    </div>
                                  ))}
                                </div>

                                {/* Methods */}
                                <div>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>Methods ({methods.length})</span>
                                    <button onClick={() => addMethod(selTaskIdx, compIdx)} style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 600, color: "#6366F1", fontFamily: "inherit" }}>+ 추가</button>
                                  </div>
                                  {methods.map((m, mi) => (
                                    <div key={mi} style={{ padding: 6, background: "#fff", borderRadius: 6, border: "1px solid #E2E8F0", marginBottom: 4 }}>
                                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                        <input value={m.name} onChange={e => setMethod(selTaskIdx, compIdx, mi, "name", e.target.value)} placeholder="method_name" style={{ flex: 1, padding: "4px 8px", borderRadius: 4, border: "1px solid #E2E8F0", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", outline: "none", boxSizing: "border-box" }} />
                                        <button onClick={() => removeMethod(selTaskIdx, compIdx, mi)} style={{ padding: "2px 4px", background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 12 }}>×</button>
                                      </div>
                                      <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 3 }}>
                                        <input value={m.params} onChange={e => setMethod(selTaskIdx, compIdx, mi, "params", e.target.value)} placeholder="params" style={{ flex: 1, padding: "3px 8px", borderRadius: 4, border: "1px solid #E2E8F0", fontSize: 10, fontFamily: "'JetBrains Mono',monospace", outline: "none", boxSizing: "border-box" }} />
                                        <span style={{ fontSize: 10, color: "#94A3B8" }}>→</span>
                                        <input value={m.returnType} onChange={e => setMethod(selTaskIdx, compIdx, mi, "returnType", e.target.value)} placeholder="return" style={{ width: 60, padding: "3px 8px", borderRadius: 4, border: "1px solid #E2E8F0", fontSize: 10, fontFamily: "'JetBrains Mono',monospace", outline: "none", boxSizing: "border-box" }} />
                                        <label style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: m.isAbstract ? "#92400E" : "#94A3B8", cursor: "pointer", whiteSpace: "nowrap" }}>
                                          <input type="checkbox" checked={!!m.isAbstract} onChange={e => setMethod(selTaskIdx, compIdx, mi, "isAbstract", e.target.checked)} style={{ width: 12, height: 12 }} />
                                          abstract
                                        </label>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </Card>

                    {/* ── Connection list ── */}
                    {(cs.relationships?.composition?.length > 0 || cs.relationships?.method_calls?.length > 0) && (
                      <Card style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>컴포넌트 관계</div>
                        {cs.relationships?.composition?.length > 0 && (
                          <>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Composition (소유)</div>
                            {cs.relationships.composition.map((r, i) => {
                              const ownerComp = allComps.find(c => c.id === r.owner);
                              const targetComp = allComps.find(c => c.id === r.target);
                              return (
                                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, padding: "5px 10px", background: "#F0FDF4", borderRadius: 6, border: "1px solid #BBF7D0", marginBottom: 4, fontFamily: "'JetBrains Mono',monospace" }}>
                                  <span>{ownerComp?.className || r.owner} ──◆ {r.attribute}: {targetComp?.className || r.target}</span>
                                  <button onClick={() => removeComposition(i)} style={{ padding: "2px 6px", background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 14 }}>×</button>
                                </div>
                              );
                            })}
                          </>
                        )}
                        {cs.relationships?.method_calls?.length > 0 && (
                          <>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginTop: 10, marginBottom: 6 }}>Method Calls (위임 호출)</div>
                            {cs.relationships.method_calls.map((r, i) => {
                              const callerComp = allComps.find(c => c.id === r.caller);
                              const calleeComp = allComps.find(c => c.id === r.callee);
                              return (
                                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, padding: "5px 10px", background: "#EFF6FF", borderRadius: 6, border: "1px solid #BFDBFE", marginBottom: 4, fontFamily: "'JetBrains Mono',monospace" }}>
                                  <span>{callerComp?.className || r.caller}.{r.callerMethod}() → {calleeComp?.className || r.callee}.{r.calleeMethod}()</span>
                                  <button onClick={() => removeMethodCall(i)} style={{ padding: "2px 6px", background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 14 }}>×</button>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </Card>
                    )}

                    {/* ── Bottom buttons ── */}
                    <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                      <Btn v="primary" sz="lg" onClick={generateBasePy}>Base Class 생성</Btn>
                      <Btn v="default" sz="lg" onClick={saveSpec}>{editingSpecId ? "App 저장" : "App 스펙 파일 생성"}</Btn>
                    </div>

                  </div>

                  {/* ── RIGHT PANEL (55%) - sticky diagram ── */}
                  <div style={{ flex: "0 0 55%", maxWidth: "55%", position: "sticky", top: 76, alignSelf: "flex-start" }}>
                    <Card>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>워크플로우 (자동 생성)</div>
                      <WorkflowDiagram components={curTask.components} workflow={effectiveWorkflow} />
                    </Card>
                  </div>

                </div>

                {/* ── Connection popup (fixed overlay) ── */}
                {classConnectPopup && (() => {
                  const srcComp = allComps.find(c => c.id === classConnectPopup.sourceId);
                  const tgtComp = allComps.find(c => c.id === classConnectPopup.targetId);
                  const targetMethods = tgtComp?.methods || [];
                  return (
                    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.3)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90 }} onClick={() => { setClassConnectPopup(null); setClassConnectSource(null); }}>
                      <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: 440, boxShadow: "0 24px 60px rgba(0,0,0,.12)" }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>컴포넌트 연결</h3>
                        <div style={{ fontSize: 12, color: "#64748B", marginBottom: 14 }}>
                          {srcComp?.className || srcComp?.name || "?"} → {tgtComp?.className || tgtComp?.name || "?"}
                        </div>

                        {/* Composition attribute name */}
                        <div style={{ marginBottom: 16 }}>
                          <label style={{ fontSize: 11, fontWeight: 500, color: "#64748B" }}>속성명 (자동 생성)</label>
                          <input value={classConnectAttrName} onChange={e => setClassConnectAttrName(e.target.value)} placeholder="target_component" style={{ display: "block", width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #E2E8F0", fontSize: 12, fontFamily: "'JetBrains Mono',monospace", outline: "none", marginTop: 4, boxSizing: "border-box" }} />
                        </div>

                        {/* Method calls (optional, can add multiple) */}
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>메서드 연결 (선택)</span>
                            <button onClick={() => setClassConnectMethodEntries([...classConnectMethodEntries, { callerMethod: "", calleeMethod: "" }])} style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 600, color: "#6366F1", fontFamily: "inherit" }}>+ 추가</button>
                          </div>
                          {classConnectMethodEntries.map((entry, i) => (
                            <div key={i} style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 4 }}>
                              <input value={entry.callerMethod} onChange={e => setClassConnectMethodEntries(classConnectMethodEntries.map((en, j) => j === i ? { ...en, callerMethod: e.target.value } : en))} placeholder="위임 메서드명" style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #E2E8F0", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", outline: "none", boxSizing: "border-box" }} />
                              {targetMethods.length > 0 ? (
                                <select value={entry.calleeMethod} onChange={e => setClassConnectMethodEntries(classConnectMethodEntries.map((en, j) => j === i ? { ...en, calleeMethod: e.target.value } : en))} style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #E2E8F0", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", outline: "none", boxSizing: "border-box", background: "#fff" }}>
                                  <option value="">대상 메서드 선택...</option>
                                  {targetMethods.map((m, mi) => <option key={mi} value={m.name}>{m.name}</option>)}
                                </select>
                              ) : (
                                <input value={entry.calleeMethod} onChange={e => setClassConnectMethodEntries(classConnectMethodEntries.map((en, j) => j === i ? { ...en, calleeMethod: e.target.value } : en))} placeholder="대상 메서드명" style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #E2E8F0", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", outline: "none", boxSizing: "border-box" }} />
                              )}
                              <button onClick={() => setClassConnectMethodEntries(classConnectMethodEntries.filter((_, j) => j !== i))} style={{ padding: "2px 4px", background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 12 }}>×</button>
                            </div>
                          ))}
                        </div>

                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <Btn onClick={() => { setClassConnectPopup(null); setClassConnectSource(null); }}>취소</Btn>
                          <Btn v="primary" onClick={confirmClassConnection}>연결</Btn>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* base.py Modal (fixed overlay) */}
                {basePyModal && (
                  <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.3)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90 }} onClick={() => setBasePyModal(null)}>
                    <div style={{ background: "#fff", borderRadius: 14, padding: 24, maxWidth: 720, width: "90%", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,.12)" }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>base.py — Base Class 코드</h3>
                        <button onClick={() => setBasePyModal(null)} style={{ background: "#F1F5F9", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, display: "flex" }}><I n="close" s={16} c="#64748B" /></button>
                      </div>
                      <pre style={{ flex: 1, background: "#0F172A", borderRadius: 10, padding: 18, fontSize: 12, fontFamily: "'JetBrains Mono',monospace", overflow: "auto", lineHeight: 1.7, color: "#E2E8F0", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{basePyModal.code}</pre>
                      <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
                        <Btn v="default" icon="dl" onClick={downloadBasePy}>다운로드</Btn>
                        <Btn v="primary" onClick={copyBasePy}>클립보드 복사</Btn>
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* TAB 3: 코드 구현 */}
          {activeTab === "impl" && (() => {
            const allComps = form.tasks.flatMap((t, ti) => t.components.map((c, ci) => ({ ...c, _taskIdx: ti, _compIdx: ci })));
            const cs = form.classSpec || { relationships: { composition: [], method_calls: [] } };

            /* ── generateBasePyCode (same logic, returns string) ── */
            const generateBasePyCode = () => {
              const classComps = allComps.filter(c => c.className);
              if (classComps.length === 0) return null;

              const depGraph = {};
              classComps.forEach(c => { depGraph[c.id] = new Set(); });
              (cs.relationships?.composition || []).forEach(r => {
                if (depGraph[r.owner] && depGraph[r.target]) depGraph[r.owner].add(r.target);
              });
              (cs.relationships?.method_calls || []).forEach(r => {
                if (depGraph[r.caller] && depGraph[r.callee]) depGraph[r.caller].add(r.callee);
              });

              const sorted = [];
              const visited = new Set();
              const visiting = new Set();
              const visit = (id) => {
                if (visited.has(id)) return;
                if (visiting.has(id)) return;
                visiting.add(id);
                (depGraph[id] || new Set()).forEach(dep => visit(dep));
                visiting.delete(id);
                visited.add(id);
                sorted.push(id);
              };
              classComps.forEach(c => visit(c.id));

              const sortedComps = sorted.map(id => classComps.find(c => c.id === id)).filter(Boolean);

              const methodCallsByOwner = {};
              (cs.relationships?.method_calls || []).forEach(r => {
                if (!methodCallsByOwner[r.caller]) methodCallsByOwner[r.caller] = [];
                methodCallsByOwner[r.caller].push(r);
              });

              let code = "from abc import ABC, abstractmethod\nfrom typing import Any, Optional\n\n\nclass ComponentBase(ABC):\n    \"\"\"Common base type for all workflow components.\"\"\"\n    pass\n";

              // Build composition lookup: owner -> [{ attribute, targetClassName }]
              const compositionByOwner = {};
              (cs.relationships?.composition || []).forEach(r => {
                if (!compositionByOwner[r.owner]) compositionByOwner[r.owner] = [];
                const tgtComp = allComps.find(c => c.id === r.target);
                compositionByOwner[r.owner].push({ attribute: r.attribute, targetClassName: tgtComp?.className || r.target });
              });

              sortedComps.forEach(comp => {
                const cls = comp.className;
                const valueAttrs = comp.attributes || [];
                const connAttrs = (compositionByOwner[comp.id] || []).map(r => ({ name: r.attribute, type: `Optional[${r.targetClassName}]` }));
                const allAttrs = [...valueAttrs, ...connAttrs];
                const methods = comp.methods || [];
                const desc = comp.name || cls;

                code += `\n\nclass ${cls}(ComponentBase):\n    \"\"\"${desc}\"\"\"\n\n`;

                const initParts = [];
                valueAttrs.forEach(a => { initParts.push(`${a.name}: ${a.type}`); });
                connAttrs.forEach(a => { initParts.push(`${a.name}: ${a.type} = None`); });
                code += `    def __init__(self${initParts.length ? ", " + initParts.join(", ") : ""}) -> None:\n`;
                if (allAttrs.length === 0) {
                  code += `        pass\n`;
                } else {
                  allAttrs.forEach(a => { code += `        self.${a.name} = ${a.name}\n`; });
                }

                methods.forEach(m => {
                  if (m.isAbstract) {
                    code += `\n    @abstractmethod\n`;
                    code += `    def ${m.name}(self${m.params ? ", " + m.params : ""}) -> ${m.returnType || "None"}:\n`;
                    code += `        pass\n`;
                  } else {
                    code += `\n    def ${m.name}(self${m.params ? ", " + m.params : ""}) -> ${m.returnType || "None"}:\n`;
                    code += `        pass\n`;
                  }
                });

                const ownerCalls = methodCallsByOwner[comp.id] || [];
                ownerCalls.forEach(mc => {
                  const calleeComp = allComps.find(c => c.id === mc.callee);
                  const calleeClassName = calleeComp?.className || mc.callee;
                  const compRelation = (cs.relationships?.composition || []).find(r => r.owner === comp.id && r.target === mc.callee);
                  const attrName = compRelation?.attribute || mc.callee;
                  code += `\n    def ${mc.callerMethod}(self, *args, **kwargs):\n`;
                  code += `        \"\"\"Arrow: ${cls} -> ${calleeClassName}\"\"\"\n`;
                  code += `        if self.${attrName} is None:\n`;
                  code += `            raise ValueError('${attrName} is not set.')\n`;
                  code += `        self.${attrName}.${mc.calleeMethod}(*args, **kwargs)\n`;
                });
              });

              return code;
            };

            const generatedBasePyCode = generateBasePyCode();

            const generateImplTemplate = () => {
              const classComps = allComps.filter(c => c.className && c.methods?.some(m => m.isAbstract));
              if (classComps.length === 0) { flash("abstract 메서드가 있는 클래스가 없습니다."); return; }

              const imports = classComps.map(c => c.className).join(", ");
              let tmpl = `# ${"=".repeat(43)}\n# 구현체 코드 (아래에 작성)\n# ${"=".repeat(43)}\n\nfrom base import ${imports}\n`;

              classComps.forEach(c => {
                const cls = c.className;
                const implCls = cls.replace(/Base$/, "") || cls + "Impl";
                tmpl += `\n\nclass ${implCls}(${cls}):\n    \"\"\"${c.name} 구현체\"\"\"\n`;
                (c.methods || []).filter(m => m.isAbstract).forEach(m => {
                  tmpl += `\n    def ${m.name}(self${m.params ? ", " + m.params : ""}) -> ${m.returnType || "None"}:\n        # TODO: 구현 필요\n        raise NotImplementedError\n`;
                });
              });

              set("implCode", tmpl);
              flash("✓ 구현체 템플릿이 생성되었습니다.");
            };

            const downloadPackage = () => {
              const baseCode = generatedBasePyCode;
              if (!baseCode) { flash("클래스가 정의된 컴포넌트가 없습니다."); return; }
              const combined = baseCode + "\n\n" + (form.implCode || "# 구현체 코드 없음\n");
              const blob = new Blob([combined], { type: "text/x-python" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = (form.name || "app") + "_package.py"; a.click();
              URL.revokeObjectURL(url);
              flash("✓ App 패키지 다운로드 완료 (base.py + 구현체)");
            };

            return (
              <>
                <Card style={{ marginBottom: 14 }}>
                  {!generatedBasePyCode ? (
                    <p style={{ textAlign: "center", color: "#94A3B8", fontSize: 13, padding: 24 }}>
                      클래스가 정의된 컴포넌트가 없습니다. "컴포넌트 설계" 탭에서 className을 설정하세요.
                    </p>
                  ) : (
                    <>
                      {/* Zone 1: Read-only base.py */}
                      <div style={{ marginBottom: 2 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>base.py (자동 생성)</span>
                          <span style={{ fontSize: 11, color: "#94A3B8" }}>읽기 전용</span>
                        </div>
                        <pre style={{ background: "#1E293B", borderRadius: "10px 10px 0 0", padding: 16, fontSize: 12, fontFamily: "'JetBrains Mono',monospace", color: "#94A3B8", margin: 0, overflow: "auto", maxHeight: 400, lineHeight: 1.6, whiteSpace: "pre" }}>
                          {generatedBasePyCode}
                        </pre>
                      </div>

                      {/* Zone 2: Editable implementation */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, marginTop: 16 }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>구현체 코드</span>
                          <button onClick={generateImplTemplate} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#6366F1", fontFamily: "inherit" }}>
                            구현체 템플릿 생성
                          </button>
                        </div>
                        <textarea
                          value={form.implCode || ""}
                          onChange={e => set("implCode", e.target.value)}
                          placeholder={"# " + "=".repeat(43) + "\n# 구현체 코드 (아래에 작성)\n# " + "=".repeat(43) + "\n\n# 위 base.py의 abstract 메서드를 구현하세요.\n# '구현체 템플릿 생성' 버튼을 클릭하면 스켈레톤 코드가 자동 생성됩니다."}
                          style={{
                            width: "100%", minHeight: 400, padding: "16px 14px",
                            background: "#0F172A", color: "#E2E8F0",
                            borderRadius: "0 0 10px 10px",
                            border: "none", fontSize: 12,
                            fontFamily: "'JetBrains Mono',monospace",
                            outline: "none", resize: "vertical", boxSizing: "border-box",
                            lineHeight: 1.6, tabSize: 4
                          }}
                        />
                      </div>
                    </>
                  )}
                </Card>

                {/* Bottom buttons */}
                <div style={{ display: "flex", gap: 10 }}>
                  <Btn v="primary" sz="lg" icon="dl" onClick={downloadPackage}>App 패키지 다운로드</Btn>
                  <Btn v="default" sz="lg" onClick={saveSpec}>{editingSpecId ? "App 저장" : "App 스펙 파일 생성"}</Btn>
                </div>
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════ TEST RUN PAGE ═══════════════════════ */
function TestRunPage({ specs, testRuns, runTest, setPage }) {
  const [selSpec, setSelSpec] = useState(null);
  
  return (
    <div>
      <Title sub="App 스펙 파일을 선택하여 테스트 실행합니다. 테스트 실행은 일반 App 실행과 동일하게 동작합니다.">테스트 실행</Title>
      
      {/* Spec selection for new test */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>스펙 파일 선택</div>
        <div style={{ display: "grid", gap: 8 }}>
          {specs.filter(s => s.status === "ready").map(s => (
            <div key={s.id} onClick={() => setSelSpec(s.id)} style={{ padding: "14px 16px", borderRadius: 10, border: `2px solid ${selSpec === s.id ? "#0F172A" : "#E2E8F0"}`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", background: selSpec === s.id ? "#F8FAFC" : "#fff", transition: "all .15s" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name} <span style={{ fontWeight: 400, color: "#94A3B8", fontSize: 12 }}>v{s.version}</span></div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>{getSpecImage(s)} · 컴포넌트 {getComponentCount(s)}개 · {getTotalGpuSummary(s)}, {getTotalMem(s)}</div>
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
            <thead><tr><TH>Run ID</TH><TH>App</TH><TH a="center">상태</TH><TH>자원</TH><TH>실행 시간</TH><TH>실행일시</TH></tr></thead>
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

/* ═══════════════════════ COMPONENT LIBRARY PAGE ═══════════════════════ */
function ComponentLibraryPage({ library, setLibrary, flash }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", image: "", description: "", version: "1.0", className: "", attributes: [], methods: [] });

  const addComponent = () => {
    if (!form.name || !form.image) { flash("이름과 이미지를 입력하세요."); return; }
    const newComp = { id: "CL-" + String(library.length + 1).padStart(2, "0"), ...form, created: now().split(" ")[0] };
    setLibrary(prev => [...prev, newComp]);
    setForm({ name: "", image: "", description: "", version: "1.0", className: "", attributes: [], methods: [] });
    setShowForm(false);
    flash("✓ 컴포넌트가 라이브러리에 등록되었습니다.");
  };

  return (
    <div>
      <Title sub="시스템 전역 재사용 가능한 컴포넌트 카탈로그입니다.">컴포넌트 글로벌 라이브러리</Title>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>등록된 컴포넌트 ({library.length}개)</div>
          <Btn v="primary" icon="builder" onClick={() => setShowForm(!showForm)}>{showForm ? "취소" : "새 컴포넌트 등록"}</Btn>
        </div>

        {showForm && (
          <div style={{ marginBottom: 16, padding: 16, background: "#F8FAFC", borderRadius: 10, border: "1px solid #E2E8F0" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <InputField label="컴포넌트 이름" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="컴포넌트 이름" />
              <InputField label="이미지 경로" value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} placeholder="registry.avatar.io/name:tag" />
              <InputField label="설명" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="컴포넌트 설명" />
              <InputField label="버전" value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} />
            </div>
            {/* className */}
            <div style={{ marginBottom: 12 }}>
              <InputField label="클래스명 (className)" value={form.className} onChange={e => setForm(f => ({ ...f, className: e.target.value }))} placeholder="MyComponentBase" mono />
            </div>

            {/* Attributes */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>값 속성 (Attributes)</label>
                <button onClick={() => setForm(f => ({ ...f, attributes: [...f.attributes, { name: "", type: "Any" }] }))} style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 600, color: "#6366F1", fontFamily: "inherit" }}>+ 추가</button>
              </div>
              {form.attributes.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                  <input value={a.name} onChange={e => setForm(f => ({ ...f, attributes: f.attributes.map((at, j) => j === i ? { ...at, name: e.target.value } : at) }))} placeholder="name" style={{ flex: 1, padding: "5px 8px", borderRadius: 4, border: "1px solid #E2E8F0", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", outline: "none", boxSizing: "border-box" }} />
                  <input value={a.type} onChange={e => setForm(f => ({ ...f, attributes: f.attributes.map((at, j) => j === i ? { ...at, type: e.target.value } : at) }))} placeholder="type" style={{ width: 80, padding: "5px 8px", borderRadius: 4, border: "1px solid #E2E8F0", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", outline: "none", color: "#6366F1", boxSizing: "border-box" }} />
                  <button onClick={() => setForm(f => ({ ...f, attributes: f.attributes.filter((_, j) => j !== i) }))} style={{ padding: "2px 4px", background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 13 }}>×</button>
                </div>
              ))}
            </div>

            {/* Methods */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>메서드 (Methods)</label>
                <button onClick={() => setForm(f => ({ ...f, methods: [...f.methods, { name: "", params: "", returnType: "None", isAbstract: true }] }))} style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 600, color: "#6366F1", fontFamily: "inherit" }}>+ 추가</button>
              </div>
              {form.methods.map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 4, padding: "4px 6px", background: "#fff", borderRadius: 6, border: "1px solid #E2E8F0" }}>
                  <input value={m.name} onChange={e => setForm(f => ({ ...f, methods: f.methods.map((mt, j) => j === i ? { ...mt, name: e.target.value } : mt) }))} placeholder="method_name" style={{ flex: 1, padding: "4px 8px", borderRadius: 4, border: "1px solid #E2E8F0", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", outline: "none", boxSizing: "border-box" }} />
                  <input value={m.params} onChange={e => setForm(f => ({ ...f, methods: f.methods.map((mt, j) => j === i ? { ...mt, params: e.target.value } : mt) }))} placeholder="params" style={{ width: 80, padding: "4px 8px", borderRadius: 4, border: "1px solid #E2E8F0", fontSize: 10, fontFamily: "'JetBrains Mono',monospace", outline: "none", boxSizing: "border-box" }} />
                  <span style={{ fontSize: 10, color: "#94A3B8" }}>→</span>
                  <input value={m.returnType} onChange={e => setForm(f => ({ ...f, methods: f.methods.map((mt, j) => j === i ? { ...mt, returnType: e.target.value } : mt) }))} placeholder="return" style={{ width: 50, padding: "4px 8px", borderRadius: 4, border: "1px solid #E2E8F0", fontSize: 10, fontFamily: "'JetBrains Mono',monospace", outline: "none", boxSizing: "border-box" }} />
                  <label style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 10, color: m.isAbstract ? "#92400E" : "#94A3B8", cursor: "pointer", whiteSpace: "nowrap" }}>
                    <input type="checkbox" checked={!!m.isAbstract} onChange={e => setForm(f => ({ ...f, methods: f.methods.map((mt, j) => j === i ? { ...mt, isAbstract: e.target.checked } : mt) }))} style={{ width: 12, height: 12 }} />
                    abs
                  </label>
                  <button onClick={() => setForm(f => ({ ...f, methods: f.methods.filter((_, j) => j !== i) }))} style={{ padding: "2px 4px", background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 13 }}>×</button>
                </div>
              ))}
            </div>

            <Btn v="success" icon="check" onClick={addComponent}>등록</Btn>
          </div>
        )}

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><TH>ID</TH><TH>이름</TH><TH>클래스명</TH><TH>이미지</TH><TH a="center">속성</TH><TH a="center">메서드</TH><TH>설명</TH><TH a="center">버전</TH></tr></thead>
          <tbody>
            {library.map(c => (
              <tr key={c.id}>
                <TD><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#7E22CE" }}>{c.id}</span></TD>
                <TD b>{c.name}</TD>
                <TD><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#6366F1" }}>{c.className || "—"}</span></TD>
                <TD><span style={{ fontSize: 12, color: "#64748B", fontFamily: "'JetBrains Mono',monospace" }}>{c.image}</span></TD>
                <TD a="center">{c.attributes?.length || 0}</TD>
                <TD a="center">{c.methods?.length || 0}</TD>
                <TD>{c.description}</TD>
                <TD a="center">{c.version}</TD>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ═══════════════════════ TRAINER PAGE ═══════════════════════ */
function TrainerPage({ specs, addWorkload, flash }) {
  const [selSpec, setSelSpec] = useState(null);
  const [done, setDone] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [params, setParams] = useState({ episodes: "1000", learningRate: "0.001", batchSize: "64", discountFactor: "0.99", maxSteps: "500" });
  const [form, setForm] = useState({ gpuType: "A100", gpuCount: "4", mem: "128GB" });
  const [preTest, setPreTest] = useState({ status: null, results: null }); // null | "running" | "passed" | "failed"

  const spec = specs.find(s => s.id === selSpec);
  const gpuStr = form.gpuType + " x " + form.gpuCount;
  const needsApproval = exceedsThreshold(gpuStr, form.mem);

  const runPreTest = () => {
    setPreTest({ status: "running", results: null });
    flash("사전 테스트를 실행합니다...");
    setTimeout(() => {
      const isRL = true;
      const results = isRL
        ? { convergence: true, avgReward: (80 + Math.random() * 15).toFixed(1), finalReward: (88 + Math.random() * 10).toFixed(1), log: "Episode 1: reward=72.1\nEpisode 3: reward=79.4\nEpisode 5: reward=85.3\nEpisode 8: reward=89.7\nEpisode 10: reward=" + (88 + Math.random() * 10).toFixed(1) + "\nConvergence: YES" }
        : { successRate: "100%", avgDuration: "0.34s", log: "Run 1: SUCCESS (0.32s)\nRun 3: SUCCESS (0.35s)\nRun 5: SUCCESS (0.34s)" };
      setPreTest({ status: "passed", results, episodes: isRL ? 10 : 5 });
      flash("✓ 사전 테스트 통과 — 결과를 첨부하여 제출할 수 있습니다.");
    }, 2500);
  };

  const resetAll = () => { setDone(false); setSelSpec(null); setLastResult(null); setPreTest({ status: null, results: null }); };

  if (done) return (
    <div>
      <Title sub="강화학습/학습 요청을 제출합니다.">Trainer</Title>
      <Card>
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ width: 52, height: 52, borderRadius: 99, background: lastResult?.immediate ? "#EFF6FF" : "#F0FDF4", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <I n={lastResult?.immediate ? "play" : "check"} s={26} c={lastResult?.immediate ? "#1D4ED8" : "#166534"} />
          </div>
          <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700 }}>학습 요청 완료</h3>
          {lastResult?.immediate ? (
            <>
              <p style={{ margin: "0 0 4px", fontSize: 13, color: "#1E40AF", fontWeight: 500 }}>자원 임계치 미만 — 실행 대기열에 진입했습니다.</p>
              <p style={{ margin: 0, fontSize: 12, color: "#94A3B8" }}>워크로드 목록에서 실행 상태를 확인하세요.</p>
            </>
          ) : lastResult?.attached ? (
            <>
              <p style={{ margin: "0 0 4px", fontSize: 13, color: "#7E22CE", fontWeight: 500 }}>테스트 결과가 첨부되었습니다 — 관리자 확인 후 승인됩니다.</p>
              <p style={{ margin: 0, fontSize: 12, color: "#94A3B8" }}>→ 우측 상단에서 관리자 모드로 전환하여 확인/승인하세요.</p>
            </>
          ) : (
            <>
              <p style={{ margin: "0 0 4px", fontSize: 13, color: "#64748B" }}>자원 임계치 초과 — 관리자 승인을 대기합니다.</p>
              <p style={{ margin: 0, fontSize: 12, color: "#94A3B8" }}>→ 우측 상단에서 관리자 모드로 전환하여 승인하세요.</p>
            </>
          )}
          <div style={{ marginTop: 20 }}>
            <Btn onClick={resetAll}>새 학습 요청</Btn>
          </div>
        </div>
      </Card>
    </div>
  );

  const submitWorkload = (withAttachment) => {
    const attachedLoopTest = withAttachment && preTest.status === "passed" ? {
      status: "passed", episodes: preTest.episodes || 10,
      results: preTest.results, executedBy: "developer", executedAt: now()
    } : null;
    addWorkload({
      name: spec.name + "-training", specId: spec.id, requester: "나",
      priority: "high", gpu: gpuStr, mem: form.mem,
      testRunRef: null, isTrainingRequest: true,
      trainingConfig: { ...params },
      ...(attachedLoopTest ? { attachedLoopTest } : {})
    });
    setLastResult({ immediate: !needsApproval, attached: !!attachedLoopTest });
    setDone(true);
  };

  return (
    <div>
      <Title sub="App을 선택하고 학습 파라미터를 설정한 후, 사전 테스트를 실행하여 결과를 첨부할 수 있습니다.">Trainer — 학습 요청</Title>

      {/* Step 1: App 선택 */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>App 선택</div>
        <div style={{ display: "grid", gap: 8 }}>
          {specs.filter(s => s.status === "ready").map(s => (
            <div key={s.id} onClick={() => { setSelSpec(s.id); setPreTest({ status: null, results: null }); }} style={{ padding: "14px 16px", borderRadius: 10, border: `2px solid ${selSpec === s.id ? "#0F172A" : "#E2E8F0"}`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", background: selSpec === s.id ? "#F8FAFC" : "#fff", transition: "all .15s" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name} <span style={{ fontWeight: 400, color: "#94A3B8", fontSize: 12 }}>v{s.version}</span></div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>Task {getTaskCount(s)}개 · 컴포넌트 {getComponentCount(s)}개 · {getTotalGpuSummary(s)}, {getTotalMem(s)}</div>
              </div>
              <Badge v="ready">준비됨</Badge>
            </div>
          ))}
        </div>
      </Card>

      {selSpec && spec && <>
        {/* Step 2: 학습 파라미터 */}
        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>학습 파라미터</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <InputField label="에피소드" value={params.episodes} onChange={e => setParams(p => ({ ...p, episodes: e.target.value }))} />
            <InputField label="학습률" value={params.learningRate} onChange={e => setParams(p => ({ ...p, learningRate: e.target.value }))} />
            <InputField label="배치 크기" value={params.batchSize} onChange={e => setParams(p => ({ ...p, batchSize: e.target.value }))} />
            <InputField label="감가율" value={params.discountFactor} onChange={e => setParams(p => ({ ...p, discountFactor: e.target.value }))} />
            <InputField label="최대 스텝" value={params.maxSteps} onChange={e => setParams(p => ({ ...p, maxSteps: e.target.value }))} />
          </div>
        </Card>

        {/* Step 3: 자원 설정 */}
        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>자원 요청</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 6, background: needsApproval ? "#FEF3C7" : "#DCFCE7" }}>
              <I n="threshold" s={14} c={needsApproval ? "#92400E" : "#166534"} />
              <span style={{ fontSize: 11, fontWeight: 600, color: needsApproval ? "#92400E" : "#166534" }}>
                {needsApproval ? "임계치 초과 — 관리자 승인 필요" : "임계치 미만 — 승인 없이 실행 가능"}
              </span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <InputField label="GPU 유형" value={form.gpuType} onChange={e => setForm(f => ({ ...f, gpuType: e.target.value }))} />
            <InputField label="GPU 수" value={form.gpuCount} onChange={e => setForm(f => ({ ...f, gpuCount: e.target.value }))} />
            <InputField label="메모리" value={form.mem} onChange={e => setForm(f => ({ ...f, mem: e.target.value }))} />
          </div>
        </Card>

        {/* Step 4: 사전 테스트 (v1.6 신규) */}
        {needsApproval && (
          <Card style={{ marginBottom: 14, background: preTest.status === "passed" ? "#F0FDF4" : preTest.status === "running" ? "#EFF6FF" : "#FFFBEB", border: `1px solid ${preTest.status === "passed" ? "#BBF7D0" : preTest.status === "running" ? "#BFDBFE" : "#FDE68A"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: preTest.status === "passed" ? "#166534" : "#92400E" }}>사전 테스트 (선택)</div>
              {preTest.status === "passed" && <Badge v="passed">통과</Badge>}
              {preTest.status === "running" && <Badge v="running">실행 중</Badge>}
            </div>
            <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 12px", lineHeight: 1.6 }}>
              제출 전 사전 테스트를 실행하면 결과를 첨부하여 제출할 수 있습니다.
              관리자가 별도 테스트 없이 결과를 확인하고 바로 승인할 수 있어 승인이 빨라집니다.
            </p>

            {preTest.status === "running" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#1E40AF", padding: "10px 0" }}>
                <span style={{ width: 14, height: 14, borderRadius: 99, border: "2px solid #1D4ED8", borderTopColor: "transparent", animation: "spin .8s linear infinite", display: "inline-block" }} />
                사전 테스트 진행 중...
              </div>
            )}

            {preTest.status === "passed" && preTest.results && (
              <div style={{ padding: 12, background: "#fff", borderRadius: 8, border: "1px solid #BBF7D0", marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#166534", marginBottom: 6 }}>테스트 결과</div>
                <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.6 }}>
                  {preTest.results.convergence !== undefined && <>수렴: {preTest.results.convergence ? "YES" : "NO"} · 평균 보상: {preTest.results.avgReward} · 최종 보상: {preTest.results.finalReward}</>}
                  {preTest.results.successRate && <>성공률: {preTest.results.successRate} · 평균 시간: {preTest.results.avgDuration}</>}
                </div>
                {preTest.results.log && (
                  <pre style={{ background: "#0F172A", borderRadius: 6, padding: 10, fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "#A5F3FC", margin: "8px 0 0", lineHeight: 1.6, maxHeight: 120, overflow: "auto" }}>{preTest.results.log}</pre>
                )}
              </div>
            )}

            {!preTest.status && (
              <Btn v="accent" icon="test" onClick={runPreTest}>사전 테스트 실행</Btn>
            )}
            {preTest.status === "passed" && (
              <Btn v="ghost" icon="test" sz="sm" onClick={runPreTest}>재실행</Btn>
            )}
          </Card>
        )}

        {/* Submit buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          {needsApproval && preTest.status === "passed" ? (
            <>
              <Btn v="primary" sz="lg" onClick={() => submitWorkload(true)}>테스트 결과 첨부하여 제출</Btn>
              <Btn sz="lg" onClick={() => submitWorkload(false)}>미첨부 제출</Btn>
            </>
          ) : (
            <Btn v="primary" sz="lg" onClick={() => submitWorkload(false)}>
              {needsApproval ? "학습 요청 제출 (승인 필요)" : "학습 요청 제출"}
            </Btn>
          )}
        </div>
      </>}
    </div>
  );
}

/* ═══════════════════════ APPROVAL PAGE ═══════════════════════ */
function ApprovalPage({ pending, approveWorkload, rejectWorkload, runLoopTest, reviewLoopTest, testRuns, setModal }) {
  return (
    <div>
      <Title sub="자원 임계치를 초과한 워크로드를 검토하고 승인합니다. 개발자 첨부 결과 확인 또는 관리자 테스트 후 승인할 수 있습니다.">승인 관리</Title>

      {pending.length === 0 ? (
        <Card>
          <p style={{ textAlign: "center", color: "#94A3B8", fontSize: 14, padding: 32 }}>승인 대기 중인 요청이 없습니다.</p>
          <p style={{ textAlign: "center", fontSize: 12, color: "#CBD5E1" }}>자원 임계치(GPU ≥ {THRESHOLD.gpu}기, 메모리 ≥ {THRESHOLD.mem}GB)를 초과한 요청만 승인이 필요합니다.</p>
        </Card>
      ) : pending.map(w => {
        const refRun = w.testRunRef ? testRuns.find(t => t.id === w.testRunRef) : null;
        const lt = w.loopTest;
        const loopPassed = lt && lt.status === "passed";
        const loopRunning = lt && lt.status === "running";
        const isAttached = lt && lt.attachedToRequest;
        const isReviewed = lt && lt.reviewedBy;
        // Approval allowed: (attached + reviewed) or (admin-tested + passed)
        const canApprove = loopPassed && (isAttached ? !!isReviewed : true);
        return (
          <Card key={w.id} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{w.name}</span>
                  {isAttached && <span style={{ fontSize: 11, fontWeight: 600, color: "#7E22CE", background: "#F3E8FF", padding: "2px 8px", borderRadius: 4 }}>테스트 결과 첨부</span>}
                </div>
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

            {/* Test section — different UI for attached vs non-attached */}
            {isAttached && loopPassed ? (
              /* Flow A: Developer attached test results */
              <div style={{ marginTop: 12, padding: 14, background: isReviewed ? "#F0FDF4" : "#F5F3FF", borderRadius: 10, border: `1px solid ${isReviewed ? "#BBF7D0" : "#DDD6FE"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isReviewed ? "#166534" : "#6B21A8" }}>
                    개발자 사전 테스트 결과 {isReviewed ? "(확인 완료)" : "(확인 필요)"}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Badge v="passed">통과</Badge>
                    {isReviewed && <Badge v="completed">확인완료</Badge>}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#334155" }}>
                  <div>에피소드: {lt.episodes}회 · 실행자: {lt.executedBy} · {lt.executedAt}</div>
                  {lt.results && (
                    <div style={{ marginTop: 6 }}>
                      {lt.results.successRate && <span>성공률: {lt.results.successRate} · 평균 시간: {lt.results.avgDuration}</span>}
                      {lt.results.convergence !== undefined && <span>수렴: {lt.results.convergence ? "YES" : "NO"} · 평균 보상: {lt.results.avgReward} · 최종 보상: {lt.results.finalReward}</span>}
                    </div>
                  )}
                  {isReviewed && <div style={{ marginTop: 6, fontSize: 11, color: "#64748B" }}>확인자: {lt.reviewedBy} · {lt.reviewedAt}</div>}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  {lt.results?.log && (
                    <Btn sz="sm" v="ghost" onClick={() => setModal({ title: "개발자 사전 테스트 로그", content: <pre style={{ background: "#0F172A", borderRadius: 8, padding: 14, fontSize: 12, fontFamily: "'JetBrains Mono',monospace", color: "#A5F3FC", margin: 0, lineHeight: 1.7 }}>{lt.results.log}</pre> })}>로그 보기</Btn>
                  )}
                  {!isReviewed && (
                    <Btn sz="sm" v="primary" icon="check" onClick={() => reviewLoopTest(w.id)}>확인 완료</Btn>
                  )}
                </div>
              </div>
            ) : (
              /* Flow B: No attachment — admin must test */
              <div style={{ marginTop: 12, padding: 14, background: loopPassed ? "#F0FDF4" : "#FFF7ED", borderRadius: 10, border: `1px solid ${loopPassed ? "#BBF7D0" : "#FED7AA"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: loopPassed ? "#166534" : "#92400E" }}>최소 실행 테스트 (관리자)</div>
                  {lt && <Badge v={lt.status === "passed" ? "passed" : lt.status === "running" ? "running" : "waiting"}>{lt.status === "passed" ? "통과" : lt.status === "running" ? "실행 중" : "대기"}</Badge>}
                </div>
                {loopPassed ? (
                  <div style={{ fontSize: 12, color: "#166534" }}>
                    <div>에피소드: {lt.episodes}회 · 실행자: {lt.executedBy} · {lt.executedAt}</div>
                    {lt.results && (
                      <div style={{ marginTop: 6 }}>
                        {lt.results.successRate && <span>성공률: {lt.results.successRate} · 평균 시간: {lt.results.avgDuration}</span>}
                        {lt.results.convergence !== undefined && <span>수렴: {lt.results.convergence ? "YES" : "NO"} · 평균 보상: {lt.results.avgReward} · 최종 보상: {lt.results.finalReward}</span>}
                      </div>
                    )}
                    {lt.results?.log && (
                      <Btn sz="sm" v="ghost" style={{ marginTop: 6 }} onClick={() => setModal({ title: "관리자 테스트 로그", content: <pre style={{ background: "#0F172A", borderRadius: 8, padding: 14, fontSize: 12, fontFamily: "'JetBrains Mono',monospace", color: "#A5F3FC", margin: 0, lineHeight: 1.7 }}>{lt.results.log}</pre> })}>로그 보기</Btn>
                    )}
                  </div>
                ) : loopRunning ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#1E40AF" }}>
                    <span style={{ width: 12, height: 12, borderRadius: 99, border: "2px solid #1D4ED8", borderTopColor: "transparent", animation: "spin .8s linear infinite", display: "inline-block" }} />
                    최소 실행 테스트 진행 중...
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: 12, color: "#92400E", margin: "0 0 8px" }}>개발자가 테스트 결과를 첨부하지 않았습니다. 관리자가 직접 테스트를 실행해야 합니다.</p>
                    <Btn v="primary" icon="test" onClick={() => runLoopTest(w.id)}>최소 실행 테스트 실행</Btn>
                  </div>
                )}
              </div>
            )}

            {/* Test run reference */}
            {refRun && (
              <div style={{ marginTop: 12, padding: 14, background: "#F8FAFC", borderRadius: 10, border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", marginBottom: 8 }}>테스트 run 참조</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Badge v="passed">통과</Badge>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#7E22CE" }}>{refRun.id}</span>
                  <span style={{ fontSize: 12, color: "#64748B" }}>{refRun.specName} · {refRun.duration}</span>
                  <Btn sz="sm" v="ghost" onClick={() => setModal({ title: `테스트 결과: ${refRun.id}`, content: <pre style={{ background: "#0F172A", borderRadius: 8, padding: 14, fontSize: 12, fontFamily: "'JetBrains Mono',monospace", color: "#A5F3FC", margin: 0, lineHeight: 1.7 }}>{refRun.log}</pre> })}>로그 보기</Btn>
                </div>
              </div>
            )}

            <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
              <Btn v="success" icon="check" onClick={() => approveWorkload(w.id)} disabled={!canApprove}>
                {!canApprove
                  ? (isAttached && loopPassed && !isReviewed ? "승인 (확인 필요)" : "승인 (테스트 필요)")
                  : "승인"}
              </Btn>
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
                    <p><b>사전 테스트:</b> {lt?.attachedToRequest ? "개발자 첨부" : "미첨부"} · {lt?.status === "passed" ? "통과" : "미완료"}</p>
                    <p><b>관리자 확인:</b> {lt?.reviewedBy ? `${lt.reviewedBy} (${lt.reviewedAt})` : "미확인"}</p>
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

