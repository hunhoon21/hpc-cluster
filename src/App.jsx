import { useState, useEffect, useCallback, useRef } from "react";

/* ═══════════════════════════════════════════════════════
   AVATAR OnE  v1.10  —  ML/RL Training Platform Demo

   v1.10 Changes:
   · 3-layer code structure: base.py (framework) + {app}_app.py (generated) + implementation
   · Component types: component, solver, environment, train
   · Solver pipeline for Environment internal workflow

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
// THRESHOLD 제거 (v1.9): 자원 임계치 기능 삭제

const INIT_SPECS = [
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
          { caller: "C-RCP-02", callerMethod: "setup", callee: "C-RCP-11", calleeMethod: "impeller_agent_setup" },
          { caller: "C-RCP-02", callerMethod: "setup", callee: "C-RCP-12", calleeMethod: "diffuser_agent_setup" },
        ]
      },
      solver_pipeline: {
        environmentId: "C-RCP-03",
        solvers: ["make_blade_diffuser", "make_blade_impeller", "mesh_diffuser", "mesh_impeller", "run_cfx"],
        connections: [
          { from: "make_blade_diffuser", to: "mesh_diffuser" },
          { from: "make_blade_impeller", to: "mesh_impeller" },
          { from: "mesh_diffuser", to: "run_cfx" },
          { from: "mesh_impeller", to: "run_cfx" }
        ],
        entrySolvers: ["make_blade_diffuser", "make_blade_impeller"]
      }
    }
  },
];

const FRAMEWORK_BASE_PY = `# base.py — AVATAR OnE Platform Framework
# This file is provided by the platform and should not be modified.

from abc import ABC, abstractmethod
import multiprocessing
from typing import Any, Dict, Optional, Sequence

class ComponentBase(ABC):
    """Common framework base type for all workflow components."""
    pass

class SolverBase(ComponentBase):
    """Framework base for file-driven solver components.

    Attributes: solver_id, keep_process_alive, poll_interval, input_artifacts, output_artifacts
    Abstract methods: prepare_inputs(), solve()
    Framework methods: execute(), start_runtime(), stop_runtime(), ensure_runtime()
    """
    ...

class WorkflowEnvironmentBase(ComponentBase):
    """Framework base for solver-graph environments.

    Methods: register_solver(), connect(), set_entry_solvers(), run_environment()
    Abstract methods: compute_reward()
    """
    ...

class WorkflowTrainBase(ComponentBase):
    """Framework base for training/workflow coordinators.

    Abstract methods: run_workflow()
    """
    ...
`;

const INIT_LIBRARY = [
  // RCP 블레이드 최적화 컴포넌트
  { id: "CL-10", name: "rcp-setup", image: "registry.avatar.io/rcp-setup:1.0", description: "RCP 블레이드 상태 초기화", version: "1.0", created: "2025-03-01", type: "component",
    className: "RCPSetupBase",
    attributes: [{ name: "n_layer", type: "int" }, { name: "impeller_a_variation_ratio", type: "float" }, { name: "diffuser_a_variation_ratio", type: "float" }, { name: "blade_layers", type: "Any" }],
    methods: [{ name: "initialize_state_for_index", params: "s, sr, i", returnType: "None", isAbstract: true }, { name: "provide_state_to_train", params: "s, sr, i", returnType: "None", isAbstract: false }]
  },
  { id: "CL-11", name: "impeller-agent", image: "registry.avatar.io/impeller-agent:1.0", description: "임펠러 에이전트 (상태 정규화)", version: "1.0", created: "2025-03-01", type: "component",
    className: "ImpellerAgentBase",
    attributes: [{ name: "n_layer", type: "int" }, { name: "impeller_blade_number", type: "float" }, { name: "impeller_blade_number_min", type: "int" }, { name: "impeller_blade_number_max", type: "int" }, { name: "impeller_a_variation_ratio", type: "float" }],
    methods: [{ name: "impeller_agent_setup", params: "s, i", returnType: "None", isAbstract: true }]
  },
  { id: "CL-12", name: "diffuser-agent", image: "registry.avatar.io/diffuser-agent:1.0", description: "디퓨저 에이전트 (상태 정규화)", version: "1.0", created: "2025-03-01", type: "component",
    className: "DiffuserAgentBase",
    attributes: [{ name: "n_layer", type: "int" }, { name: "diffuser_blade_number", type: "float" }, { name: "diffuser_blade_number_min", type: "int" }, { name: "diffuser_blade_number_max", type: "int" }, { name: "diffuser_a_variation_ratio", type: "float" }],
    methods: [{ name: "diffuser_agent_setup", params: "s, i", returnType: "None", isAbstract: true }]
  },
  { id: "CL-13", name: "multi-agent", image: "registry.avatar.io/multi-agent:1.0", description: "다중 에이전트 조합", version: "1.0", created: "2025-03-01", type: "component",
    className: "MultiAgentBase",
    attributes: [],  // 컴포넌트 참조 속성은 연결 시 자동 생성
    methods: [{ name: "setup_agents_from_train", params: "s, i", returnType: "None", isAbstract: false }]  // setup()은 method_call 연결에서 자동 생성 (template method)
  },
  { id: "CL-16", name: "make-blade", image: "registry.avatar.io/make-blade:1.0", description: "블레이드 형상 생성기", version: "1.0", created: "2025-03-01", type: "solver", solverId: "make_blade",
    className: "MakeBladeBase",
    attributes: [{ name: "component_name", type: "str" }],
    methods: [{ name: "prepare_inputs", params: "action, upstream_results, context", returnType: "dict", isAbstract: true }, { name: "make_blade", params: "prepared_input, context", returnType: "None", isAbstract: true }, { name: "solve", params: "prepared_input, context", returnType: "None", isAbstract: false }]
  },
  { id: "CL-17", name: "mesh-generator", image: "registry.avatar.io/mesh-generator:1.0", description: "CFD 메시 생성기", version: "1.0", created: "2025-03-01", type: "solver", solverId: "mesh_generator",
    className: "MeshGeneratorBase",
    attributes: [{ name: "component_name", type: "str" }],
    methods: [{ name: "prepare_inputs", params: "action, upstream_results, context", returnType: "dict", isAbstract: true }, { name: "generate_mesh", params: "prepared_input, context", returnType: "bool", isAbstract: true }, { name: "solve", params: "prepared_input, context", returnType: "None", isAbstract: false }]
  },
  { id: "CL-18", name: "run-cfx", image: "registry.avatar.io/run-cfx:1.0", description: "CFX 시뮬레이터 실행", version: "1.0", created: "2025-03-01", type: "solver", solverId: "run_cfx",
    className: "RunCFXBase",
    attributes: [{ name: "run_index", type: "Optional[str]" }, { name: "node_idx", type: "Optional[int]" }, { name: "slot_idx", type: "Optional[int]" }, { name: "cores_per_task", type: "Optional[Any]" }],
    methods: [{ name: "prepare_inputs", params: "action, upstream_results, context", returnType: "dict", isAbstract: true }, { name: "run_solver", params: "prepared_input, context", returnType: "None", isAbstract: true }, { name: "solve", params: "prepared_input, context", returnType: "None", isAbstract: false }]
  },
  { id: "CL-14", name: "environment", image: "registry.avatar.io/environment:1.0", description: "시뮬레이션 환경 (MakeBlade + Mesh + RunCFX)", version: "1.0", created: "2025-03-01", type: "environment",
    className: "EnvironmentBase",
    attributes: [],  // 컴포넌트 참조 속성은 연결 시 자동 생성
    methods: []  // 위임 메서드(execute_make_blade 등)는 연결 시 자동 생성
  },
  { id: "CL-15", name: "train", image: "registry.avatar.io/train:1.0", description: "학습 오케스트레이터", version: "1.0", created: "2025-03-01", type: "train",
    className: "TrainBase",
    attributes: [{ name: "args", type: "Any" }],  // 값 속성만. 컴포넌트 참조는 연결 시 자동 생성
    methods: [{ name: "run_workflow", params: "", returnType: "None", isAbstract: true }]  // 위임 메서드는 연결 시 자동 생성
  },
];

const INIT_TEST_RUNS = [];

const INIT_WORKLOADS = [
  { id: "WL-RCP1", name: "RCP-BladeOpt-training", specId: "APP-003", requester: "나", status: "completed", priority: "high", gpu: "A100 x 4", mem: "128GB", submitted: "2026-03-26 10:01", approved: "2026-03-26 10:30", completedAt: "2026-03-26 18:00", needsApproval: true, loopTest: { status: "passed", episodes: 10, results: { convergence: true, avgReward: 0.82, finalReward: 0.91, log: "Episode 1: reward=0.31\nEpisode 5: reward=0.72\nEpisode 10: reward=0.91\nConvergence: YES" }, executedBy: "developer", executedAt: "2026-03-26 09:30", attachedToRequest: true, reviewedBy: "admin", reviewedAt: "2026-03-26 10:30" } },
  { id: "WL-RCP2", name: "RCP-BladeOpt-v2", specId: "APP-003", requester: "김연구원", status: "completed", priority: "medium", gpu: "A100 x 2", mem: "64GB", submitted: "2025-02-15 14:00", approved: "2025-02-15 15:00", completedAt: "2025-02-16 10:30", needsApproval: false },
];

const INIT_MODELS = [
  { id: "MD-RCP1", name: "rcp-blade-opt-v1", workloadId: "WL-RCP1", workload: "RCP-BladeOpt-training", specId: "APP-003", created: "2026-03-26 18:00", size: "380 MB",
    metrics: { best_efficiency: "92.8%", head_coefficient: "0.93", flow_coefficient: "0.42", axial_thrust: "12.4", tplc: "115.7", total_steps: "1200" }, operatorReady: false },
  { id: "MD-RCP2", name: "rcp-blade-opt-v2", workloadId: "WL-RCP2", workload: "RCP-BladeOpt-v2", specId: "APP-003", created: "2025-02-16 10:30", size: "380 MB",
    metrics: { best_efficiency: "88.1%", head_coefficient: "0.87", flow_coefficient: "0.39", axial_thrust: "14.2", tplc: "128.3", total_steps: "800" }, operatorReady: false },
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
const exceedsThreshold = () => false; // v1.9: 자원 임계치 삭제 — 모든 요청은 관리자가 Trainer에서 관리

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

const exceedsThresholdSpec = () => false; // v1.9: 자원 임계치 삭제

/* ═══════════════════════════ MAIN APP ═══════════════════════════ */
export default function App() {
  const [mode, setMode] = useState("user");
  const [page, setPage] = useState("builder");
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [specs, setSpecs] = useState(INIT_SPECS);
  const [testRuns, setTestRuns] = useState(INIT_TEST_RUNS);
  const [workloads, setWorkloads] = useState(INIT_WORKLOADS);
  const [models, setModels] = useState(INIT_MODELS);
  const [library, setLibrary] = useState(INIT_LIBRARY);

  const flash = useCallback((m) => { setToast(m); setTimeout(() => setToast(null), 3500); }, []);
  useEffect(() => { setPage(mode === "user" ? "builder" : "trainer"); }, [mode]);

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
              metrics: { accuracy: (85 + Math.random() * 10).toFixed(1) + "%", loss: (0.02 + Math.random() * 0.1).toFixed(3) },
              operatorReady: false
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
    { id: "builder", l: "Builder", ic: "builder" },
    { id: "operator", l: "Operator", ic: "model" },
  ];
  const adminNav = [
    { id: "trainer", l: "Trainer", ic: "play" },
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
          <span style={{ fontSize: 11, fontWeight: 500, color: "#94A3B8", marginLeft: 2 }}>v1.10</span>
        </div>
        <div style={{ flex: 1 }} />
        
        {/* Live indicators */}
        {pending.length > 0 && mode === "admin" && (
          <div style={{ marginRight: 16, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "4px 10px", borderRadius: 6, background: "#FEF2F2" }} onClick={() => setPage("trainer")}>
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
            const badge = n.id === "trainer" && mode === "admin" ? pending.length : 0;
            const active = page === n.id;
            return (
              <button key={n.id} onClick={() => setPage(n.id)} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 400, background: active ? "#F1F5F9" : "transparent", color: active ? "#0F172A" : "#64748B", marginBottom: 2, transition: "all .1s" }}>
                <I n={n.ic} s={16} c={active ? "#0F172A" : "#94A3B8"} />{n.l}
                {badge > 0 && <span style={{ marginLeft: "auto", background: "#DC2626", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99, minWidth: 18, textAlign: "center" }}>{badge}</span>}
              </button>
            );
          })}
          
          {/* 자원 임계치 사이드바 제거 (v1.9) */}
        </nav>

        {/* ─── Main Content ─── */}
        <main style={{ flex: 1, padding: 32, maxWidth: 1120, overflowY: "auto" }}>
          {page === "builder" && <BuilderPage {...{ flash, addSpec, updateSpec, specs, library, setLibrary, addWorkload, testRuns, runTest }} />}
          {page === "operator" && <OperatorPage models={models} flash={flash} />}
          {page === "trainer" && <TrainerAdminPage {...{ workloads, setWorkloads, models, setModels, specs, library, setLibrary, pending, running, queued, approveWorkload, rejectWorkload, runLoopTest, reviewLoopTest, testRuns, setModal, flash }} />}
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
function WorkflowDiagram({ components, workflow, onNodeClick, selectedId, connectSourceId, onEdgeDelete }) {
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
  const nodeW = 130;
  const nodeH = 52;
  const colSpacing = nodeW + 24;
  const rowSpacing = nodeH + 40;
  Object.keys(rankGroups).forEach(r => {
    const group = rankGroups[r];
    const groupWidth = group.length * colSpacing - 24;
    const totalWidth = Math.max(maxNodesInRank * colSpacing - 24, 300);
    const startX = (totalWidth - groupWidth) / 2;
    group.forEach((c, idx) => {
      positions[c.id] = { x: startX + idx * colSpacing + 20, y: parseInt(r) * rowSpacing + 20 };
    });
  });

  const svgW = Math.max(maxNodesInRank * colSpacing + 40, 400);
  const svgH = Math.max((maxRank + 1) * rowSpacing + 20, 150);

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={svgW} height={svgH} style={{ display: "block", margin: "0 auto" }}>
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto" fill="#94A3B8">
            <polygon points="0 0, 8 3, 0 6" />
          </marker>
        </defs>
        {/* Edges — bezier curves with hover highlight + click to delete */}
        {workflow.map((e, i) => {
          const from = positions[e.from];
          const to = positions[e.to];
          if (!from || !to) return null;
          const x1 = from.x + nodeW / 2, y1 = from.y + nodeH;
          const x2 = to.x + nodeW / 2, y2 = to.y;
          const dy = (y2 - y1);
          const cy1 = y1 + dy * 0.4;
          const cy2 = y2 - dy * 0.4;
          const d = `M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`;
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
          return (
            <g key={i} className="edge-group" style={{ cursor: onEdgeDelete ? "pointer" : "default" }}>
              {/* Thick invisible hit area */}
              <path d={d} fill="none" stroke="transparent" strokeWidth={14}
                onClick={() => onEdgeDelete && onEdgeDelete(e)}
                onMouseEnter={ev => { const g = ev.currentTarget.parentNode; g.querySelector(".edge-line").setAttribute("stroke", "#EF4444"); g.querySelector(".edge-del")?.setAttribute("opacity", "1"); }}
                onMouseLeave={ev => { const g = ev.currentTarget.parentNode; g.querySelector(".edge-line").setAttribute("stroke", "#94A3B8"); g.querySelector(".edge-del")?.setAttribute("opacity", "0"); }}
              />
              {/* Visible line */}
              <path className="edge-line" d={d} fill="none" stroke="#94A3B8" strokeWidth={1.5} markerEnd="url(#arrowhead)" style={{ pointerEvents: "none", transition: "stroke .15s" }} />
              {/* Delete icon (hidden until hover) */}
              {onEdgeDelete && (
                <g className="edge-del" opacity="0" style={{ pointerEvents: "none", transition: "opacity .15s" }}>
                  <circle cx={mx} cy={my} r={10} fill="#FEE2E2" stroke="#EF4444" strokeWidth={1} />
                  <text x={mx} y={my + 4} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#EF4444">×</text>
                </g>
              )}
            </g>
          );
        })}
        {/* Nodes */}
        {components.map(c => {
          const pos = positions[c.id];
          if (!pos) return null;
          const res = `${c.gpu_type || c.gpuType || ""} x ${c.gpu_count || c.gpuCount || ""}, ${c.mem}`;
          const isSelected = c.id === selectedId;
          const isConnectSource = c.id === connectSourceId;
          return (
            <g key={c.id} style={{ cursor: onNodeClick ? "pointer" : "default" }}>
              <rect x={pos.x} y={pos.y} width={nodeW} height={nodeH} fill="transparent" style={{ cursor: "pointer" }} onClick={() => onNodeClick && onNodeClick(c.id)} />
              <rect x={pos.x} y={pos.y} width={nodeW} height={nodeH} rx={10}
                fill={isConnectSource ? "#EEF2FF" : isSelected ? "#FEF3C7" : "#DBEAFE"}
                stroke={isConnectSource ? "#6366F1" : isSelected ? "#F59E0B" : "#1E40AF"}
                strokeWidth={isSelected || isConnectSource ? 2.5 : 1.5}
                style={{ pointerEvents: "none" }} />
              <text x={pos.x + nodeW / 2} y={pos.y + 22} textAnchor="middle"
                fontSize={12} fontWeight="bold" fill="#0F172A" style={{ pointerEvents: "none" }}>
                {(c.name || "unnamed").slice(0, 16)}
              </text>
              <text x={pos.x + nodeW / 2} y={pos.y + 42} textAnchor="middle"
                fontSize={9} fill="#64748B" style={{ pointerEvents: "none" }}>
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
function BuilderPage({ flash, addSpec, updateSpec, specs, library, setLibrary, addWorkload, testRuns, runTest }) {
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
  const [showLibDropdown, setShowLibDropdown] = useState(false);
  const [selectedCompId, setSelectedCompId] = useState(null);
  const [showConnList, setShowConnList] = useState(true);
  const [classConnectSource, setClassConnectSource] = useState(null);
  const [classConnectPopup, setClassConnectPopup] = useState(null); // { sourceId, targetId }
  // classConnectAttrName removed — auto-generated from target name
  const [classConnectMethodEntries, setClassConnectMethodEntries] = useState([]); // [{ callerMethod, calleeMethod }]
  const [basePyModal, setBasePyModal] = useState(null); // null or { code: string }
  const [showFrameworkCode, setShowFrameworkCode] = useState(false);

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
      type: libComp.type || "component",
      solverId: libComp.solverId || "",
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

      {/* 글로벌 컴포넌트 라이브러리 (solver 포함 전체) */}
      <div style={{ marginTop: 24 }}>
        <ComponentLibraryInline library={library} setLibrary={setLibrary} flash={flash} />
      </div>
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
            {[["app", "App 관리"], ["design", "컴포넌트 설계"], ["impl", "코드 구현"], ["train", "학습 요청"]].map(([key, label]) => (
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

              {/* Component Library (collapsible) */}
              <ComponentLibraryInline library={library} setLibrary={setLibrary} flash={flash} />
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
              if (classConnectSource === "__WAITING__") { setClassConnectSource(comp.id); return; }
              if (classConnectSource === comp.id) { setClassConnectSource(null); return; }
              setClassConnectPopup({ sourceId: classConnectSource, targetId: comp.id });
              setClassConnectMethodEntries([{ callerMethod: "", calleeMethod: "" }]);
            };

            const confirmClassConnection = () => {
              const src = allComps.find(c => c.id === classConnectPopup.sourceId);
              const tgt = allComps.find(c => c.id === classConnectPopup.targetId);
              if (!src || !tgt) return;
              const attrName = (tgt.name || "target").replace(/-/g, "_");
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

            /* ── generateBasePyCode (returns {app}_app.py string) ── */
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

              let code = "from abc import abstractmethod\nfrom typing import Any, Dict, Optional, Sequence\nimport base as framework_base\n";

              const compositionByOwner = {};
              (cs.relationships?.composition || []).forEach(r => {
                if (!compositionByOwner[r.owner]) compositionByOwner[r.owner] = [];
                const tgtComp = allComps.find(c => c.id === r.target);
                compositionByOwner[r.owner].push({ attribute: r.attribute, targetClassName: tgtComp?.className || r.target });
              });

              const solverPipeline = cs.solver_pipeline || null;

              sortedComps.forEach(comp => {
                const cls = comp.className;
                const compType = comp.type || (library.find(l => l.id === comp.libraryRef)?.type) || "component";
                let parentClass;
                switch(compType) {
                  case "solver": parentClass = "framework_base.SolverBase"; break;
                  case "environment": parentClass = "framework_base.WorkflowEnvironmentBase"; break;
                  case "train": parentClass = "framework_base.WorkflowTrainBase"; break;
                  default: parentClass = "framework_base.ComponentBase"; break;
                }

                const valueAttrs = comp.attributes || [];
                const connAttrs = (compositionByOwner[comp.id] || []).map(r => ({ name: r.attribute, type: `Optional[${r.targetClassName}]` }));
                const allAttrs = [...valueAttrs, ...connAttrs];
                const methods = comp.methods || [];
                const desc = comp.name || cls;

                code += `\n\nclass ${cls}(${parentClass}):\n    \"\"\"${desc}\"\"\"\n\n`;

                // Solver type: special __init__ with solver_id
                if (compType === "solver") {
                  const sid = comp.solverId || (library.find(l => l.id === comp.libraryRef)?.solverId) || "";
                  const initParts = [];
                  valueAttrs.forEach(a => { initParts.push(`${a.name}: ${a.type}`); });
                  connAttrs.forEach(a => { initParts.push(`${a.name}: ${a.type} = None`); });
                  code += `    def __init__(self${initParts.length ? ", " + initParts.join(", ") : ""}) -> None:\n`;
                  code += `        super().__init__(solver_id="${sid}", keep_process_alive=True)\n`;
                  allAttrs.forEach(a => { code += `        self.${a.name} = ${a.name}\n`; });
                } else if (compType === "train") {
                  const initParts = [];
                  valueAttrs.forEach(a => { initParts.push(`${a.name}: ${a.type}`); });
                  connAttrs.forEach(a => { initParts.push(`${a.name}: ${a.type} = None`); });
                  code += `    def __init__(self${initParts.length ? ", " + initParts.join(", ") : ""}) -> None:\n`;
                  if (allAttrs.length === 0) {
                    code += `        pass\n`;
                  } else {
                    allAttrs.forEach(a => { code += `        self.${a.name} = ${a.name}\n`; });
                  }
                } else {
                  const initParts = [];
                  valueAttrs.forEach(a => { initParts.push(`${a.name}: ${a.type}`); });
                  connAttrs.forEach(a => { initParts.push(`${a.name}: ${a.type} = None`); });
                  code += `    def __init__(self${initParts.length ? ", " + initParts.join(", ") : ""}) -> None:\n`;
                  if (allAttrs.length === 0) {
                    code += `        pass\n`;
                  } else {
                    allAttrs.forEach(a => { code += `        self.${a.name} = ${a.name}\n`; });
                  }
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

                // Environment type: generate configure_solver_pipeline() if solver_pipeline present
                if (compType === "environment" && solverPipeline && solverPipeline.environmentId === comp.id) {
                  code += `\n    def configure_solver_pipeline(self):\n`;
                  code += `        \"\"\"Auto-generated from solver_pipeline spec.\"\"\"\n`;
                  (solverPipeline.solvers || []).forEach(s => {
                    code += `        self.register_solver("${s}")\n`;
                  });
                  (solverPipeline.connections || []).forEach(c => {
                    code += `        self.connect("${c.from}", "${c.to}")\n`;
                  });
                  if (solverPipeline.entrySolvers) {
                    code += `        self.set_entry_solvers(${JSON.stringify(solverPipeline.entrySolvers)})\n`;
                  }
                }

                // Group method_calls by callerMethod (template method pattern: 1 method -> N calls)
                const ownerCalls = methodCallsByOwner[comp.id] || [];
                const grouped = {};
                ownerCalls.forEach(mc => {
                  if (!grouped[mc.callerMethod]) grouped[mc.callerMethod] = [];
                  grouped[mc.callerMethod].push(mc);
                });
                Object.entries(grouped).forEach(([callerMethod, calls]) => {
                  const targets = calls.map(mc => {
                    const calleeComp = allComps.find(c => c.id === mc.callee);
                    const compRelation = (cs.relationships?.composition || []).find(r => r.owner === comp.id && r.target === mc.callee);
                    return { attrName: compRelation?.attribute || mc.callee, calleeMethod: mc.calleeMethod, calleeClass: calleeComp?.className || mc.callee };
                  });
                  const targetNames = targets.map(t => t.calleeClass).join(", ");
                  code += `\n    def ${callerMethod}(self, *args, **kwargs):\n`;
                  code += `        \"\"\"Arrow: ${cls} -> ${targetNames}\"\"\"\n`;
                  targets.forEach(t => {
                    code += `        if self.${t.attrName} is None:\n`;
                    code += `            raise ValueError('${t.attrName} is not set.')\n`;
                    code += `        self.${t.attrName}.${t.calleeMethod}(*args, **kwargs)\n`;
                  });
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
                {/* ── Task selection ── */}
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

                {/* ── Toolbar (single line) ── */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                  {/* Add component dropdown */}
                  <div style={{ position: "relative" }}>
                    <Btn sz="sm" v="accent" onClick={() => setShowLibDropdown(!showLibDropdown)}>+ 추가 ▾</Btn>
                    {showLibDropdown && <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setShowLibDropdown(false)} />}
                    {showLibDropdown && (
                      <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.1)", padding: 8, zIndex: 50, minWidth: 220, maxHeight: 300, overflowY: "auto" }}>
                        {library.map(lc => (
                          <button key={lc.id} onClick={() => { addFromLibrary(lc); setShowLibDropdown(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", fontSize: 12, fontFamily: "inherit", color: "#334155" }}>
                            <span style={{ fontWeight: 600 }}>{lc.name}</span>
                            {lc.className && <span style={{ color: "#6366F1", marginLeft: 6, fontSize: 11 }}>{lc.className}</span>}
                          </button>
                        ))}
                        <div style={{ borderTop: "1px solid #E2E8F0", marginTop: 4, paddingTop: 4 }}>
                          <button onClick={() => { addComponentManual(); setShowLibDropdown(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", fontSize: 12, fontFamily: "inherit", color: "#64748B" }}>직접 추가...</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Connection mode toggle */}
                  <Btn sz="sm" v={classConnectSource ? "primary" : "default"} onClick={() => setClassConnectSource(classConnectSource ? null : "__WAITING__")}>
                    {classConnectSource ? "연결 취소" : "◆ 연결"}
                  </Btn>

                  {/* Spacer */}
                  <div style={{ flex: 1 }} />

                  {/* Info badges */}
                  <span style={{ fontSize: 12, color: "#64748B" }}>컴포넌트: {curTask.components.length}</span>
                  <span style={{ fontSize: 12, color: "#64748B" }}>연결: {(cs.relationships?.composition?.length || 0)}</span>

                  {/* Action buttons */}
                  <Btn sz="sm" onClick={generateBasePy}>Base Class 생성</Btn>
                  <Btn sz="sm" v="primary" onClick={saveSpec}>{editingSpecId ? "저장" : "생성"}</Btn>
                </div>

                {/* ── Workflow Diagram (full width, interactive) ── */}
                <Card style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>워크플로우 (자동 생성)</div>
                  {classConnectSource && (
                    <div style={{ fontSize: 12, color: "#6366F1", marginBottom: 8, padding: "6px 10px", background: "#EEF2FF", borderRadius: 6 }}>
                      {classConnectSource === "__WAITING__" ? "소스 노드를 클릭하세요" : `소스: ${allComps.find(c => c.id === classConnectSource)?.name || "?"} — 타겟 노드를 클릭하세요`}
                    </div>
                  )}
                  <WorkflowDiagram
                    components={curTask.components}
                    workflow={effectiveWorkflow}
                    onNodeClick={(compId) => {
                      if (classConnectSource === "__WAITING__") {
                        setClassConnectSource(compId);
                      } else if (classConnectSource && classConnectSource !== compId) {
                        setClassConnectPopup({ sourceId: classConnectSource, targetId: compId });
                        setClassConnectMethodEntries([{ callerMethod: "", calleeMethod: "" }]);
                      } else {
                        setSelectedCompId(selectedCompId === compId ? null : compId);
                      }
                    }}
                    selectedId={selectedCompId}
                    connectSourceId={classConnectSource}
                    onEdgeDelete={(edge) => {
                      // edge.from = target (child), edge.to = owner (parent) in composition
                      const idx = (cs.relationships?.composition || []).findIndex(r => r.target === edge.from && r.owner === edge.to);
                      if (idx >= 0) removeComposition(idx);
                    }}
                  />
                </Card>

                {/* ── Selected component detail panel ── */}
                {selectedCompId && (() => {
                  let selComp = null, selTI = -1, selCI = -1;
                  form.tasks.forEach((t, ti) => {
                    t.components.forEach((c, ci) => {
                      if (c.id === selectedCompId) { selComp = c; selTI = ti; selCI = ci; }
                    });
                  });
                  if (!selComp) return null;

                  return (
                    <Card style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{selComp.name} — 상세 편집</span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => { const idx = curTask.components.findIndex(c => c.id === selectedCompId); if (idx >= 0) deleteComponent(idx); setSelectedCompId(null); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #FEE2E2", background: "#FFF5F5", color: "#EF4444", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>삭제</button>
                          <button onClick={() => setSelectedCompId(null)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>닫기</button>
                        </div>
                      </div>

                      {/* 기본 정보 */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <InputField label="이름" value={selComp.name} onChange={e => setComp(selTI, selCI, "name", e.target.value)} />
                        <InputField label="클래스명" value={selComp.className || ""} onChange={e => setComp(selTI, selCI, "className", e.target.value)} mono />
                      </div>

                      {/* 인프라 */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <InputField label="Docker 이미지" value={selComp.image} onChange={e => setComp(selTI, selCI, "image", e.target.value)} mono />
                        <InputField label="태그" value={selComp.tag} onChange={e => setComp(selTI, selCI, "tag", e.target.value)} mono />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                        <InputField label="GPU 유형" value={selComp.gpuType} onChange={e => setComp(selTI, selCI, "gpuType", e.target.value)} />
                        <InputField label="GPU 수" value={selComp.gpuCount} onChange={e => setComp(selTI, selCI, "gpuCount", e.target.value)} />
                        <InputField label="메모리" value={selComp.mem} onChange={e => setComp(selTI, selCI, "mem", e.target.value)} />
                      </div>

                      {/* Attributes */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Attributes ({(selComp.attributes || []).length})</span>
                          <button onClick={() => setComp(selTI, selCI, "attributes", [...(selComp.attributes || []), { name: "", type: "Any" }])} style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 600, color: "#6366F1", fontFamily: "inherit" }}>+ 추가</button>
                        </div>
                        {(selComp.attributes || []).map((a, ai) => (
                          <div key={ai} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                            <input value={a.name} onChange={e => setComp(selTI, selCI, "attributes", selComp.attributes.map((at, j) => j === ai ? { ...at, name: e.target.value } : at))} placeholder="name" style={{ flex: 1, padding: "5px 8px", borderRadius: 4, border: "1px solid #E2E8F0", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", outline: "none", boxSizing: "border-box" }} />
                            <input value={a.type} onChange={e => setComp(selTI, selCI, "attributes", selComp.attributes.map((at, j) => j === ai ? { ...at, type: e.target.value } : at))} placeholder="type" style={{ width: 100, padding: "5px 8px", borderRadius: 4, border: "1px solid #E2E8F0", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", outline: "none", color: "#6366F1", boxSizing: "border-box" }} />
                            <button onClick={() => setComp(selTI, selCI, "attributes", selComp.attributes.filter((_, j) => j !== ai))} style={{ padding: "2px 6px", background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 13 }}>×</button>
                          </div>
                        ))}
                      </div>

                      {/* Methods */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Methods ({(selComp.methods || []).length})</span>
                          <button onClick={() => setComp(selTI, selCI, "methods", [...(selComp.methods || []), { name: "", params: "", returnType: "None", isAbstract: true }])} style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 600, color: "#6366F1", fontFamily: "inherit" }}>+ 추가</button>
                        </div>
                        {(selComp.methods || []).map((m, mi) => (
                          <div key={mi} style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 4, padding: "4px 6px", background: "#fff", borderRadius: 6, border: "1px solid #E2E8F0" }}>
                            <input value={m.name} onChange={e => setComp(selTI, selCI, "methods", selComp.methods.map((mt, j) => j === mi ? { ...mt, name: e.target.value } : mt))} placeholder="method" style={{ flex: 1, padding: "4px 8px", borderRadius: 4, border: "1px solid #E2E8F0", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", outline: "none", boxSizing: "border-box" }} />
                            <input value={m.params} onChange={e => setComp(selTI, selCI, "methods", selComp.methods.map((mt, j) => j === mi ? { ...mt, params: e.target.value } : mt))} placeholder="params" style={{ width: 80, padding: "4px 8px", borderRadius: 4, border: "1px solid #E2E8F0", fontSize: 10, fontFamily: "'JetBrains Mono',monospace", outline: "none", boxSizing: "border-box" }} />
                            <span style={{ fontSize: 10, color: "#94A3B8" }}>→</span>
                            <input value={m.returnType} onChange={e => setComp(selTI, selCI, "methods", selComp.methods.map((mt, j) => j === mi ? { ...mt, returnType: e.target.value } : mt))} placeholder="return" style={{ width: 55, padding: "4px 8px", borderRadius: 4, border: "1px solid #E2E8F0", fontSize: 10, fontFamily: "'JetBrains Mono',monospace", outline: "none", boxSizing: "border-box" }} />
                            <label style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 10, color: m.isAbstract ? "#92400E" : "#94A3B8", cursor: "pointer", whiteSpace: "nowrap" }}>
                              <input type="checkbox" checked={!!m.isAbstract} onChange={e => setComp(selTI, selCI, "methods", selComp.methods.map((mt, j) => j === mi ? { ...mt, isAbstract: e.target.checked } : mt))} style={{ width: 12, height: 12 }} />abs
                            </label>
                            <button onClick={() => setComp(selTI, selCI, "methods", selComp.methods.filter((_, j) => j !== mi))} style={{ padding: "2px 4px", background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 13 }}>×</button>
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                })()}

                {/* ── Connection list (collapsible) ── */}
                {(cs.relationships?.composition?.length > 0 || cs.relationships?.method_calls?.length > 0) && (
                  <Card style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showConnList ? 10 : 0, cursor: "pointer" }} onClick={() => setShowConnList(!showConnList)}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>연결 목록 ({(cs.relationships?.composition?.length || 0) + (cs.relationships?.method_calls?.length || 0)})</span>
                      <span style={{ fontSize: 12, color: "#94A3B8" }}>{showConnList ? "▲" : "▼"}</span>
                    </div>
                    {showConnList && (
                      <>
                        {cs.relationships?.composition?.length > 0 && (
                          <>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Composition (소유)</div>
                            {cs.relationships.composition.map((r, i) => {
                              const ownerComp = allComps.find(c => c.id === r.owner);
                              const targetComp = allComps.find(c => c.id === r.target);
                              return (
                                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, padding: "5px 10px", background: "#F0FDF4", borderRadius: 6, border: "1px solid #BBF7D0", marginBottom: 4, fontFamily: "'JetBrains Mono',monospace" }}>
                                  <span>{ownerComp?.className || r.owner} ──◆ {r.attribute}: {targetComp?.className || r.target}</span>
                                  <button onClick={(e) => { e.stopPropagation(); removeComposition(i); }} style={{ padding: "2px 6px", background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 14 }}>×</button>
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
                                  <button onClick={(e) => { e.stopPropagation(); removeMethodCall(i); }} style={{ padding: "2px 6px", background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 14 }}>×</button>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </>
                    )}
                  </Card>
                )}

                {/* ── Connection popup (fixed overlay) ── */}
                {classConnectPopup && (() => {
                  const srcComp = allComps.find(c => c.id === classConnectPopup.sourceId);
                  const tgtComp = allComps.find(c => c.id === classConnectPopup.targetId);
                  return (
                    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.3)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90 }} onClick={() => { setClassConnectPopup(null); setClassConnectSource(null); }}>
                      <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: 480, boxShadow: "0 24px 60px rgba(0,0,0,.12)" }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>컴포넌트 연결</h3>
                        <div style={{ fontSize: 13, color: "#334155", marginBottom: 14, fontFamily: "'JetBrains Mono',monospace" }}>
                          <span style={{ fontWeight: 700 }}>{srcComp?.className || srcComp?.name}</span>
                          <span style={{ color: "#94A3B8", margin: "0 8px" }}>→</span>
                          <span style={{ fontWeight: 700 }}>{tgtComp?.className || tgtComp?.name}</span>
                        </div>

                        {/* Auto-generated composition info */}
                        <div style={{ padding: "8px 12px", background: "#F0FDF4", borderRadius: 8, border: "1px solid #BBF7D0", marginBottom: 16, fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "#166534" }}>
                          self.{(tgtComp?.name || "target").replace(/-/g, "_")}: {tgtComp?.className || tgtComp?.name} — 자동 생성
                        </div>

                        {/* Method connections */}
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>메서드 연결</span>
                            <button onClick={() => setClassConnectMethodEntries([...classConnectMethodEntries, { callerMethod: "", calleeMethod: "" }])} style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 600, color: "#6366F1", fontFamily: "inherit" }}>+ 추가</button>
                          </div>
                          {classConnectMethodEntries.map((entry, i) => (
                            <div key={i} style={{ marginBottom: 6, padding: 8, background: "#F8FAFC", borderRadius: 8, border: "1px solid #E2E8F0" }}>
                              <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 4 }}>
                                <span style={{ fontSize: 10, color: "#64748B", width: 60, flexShrink: 0 }}>소스 메서드</span>
                                <input value={entry.callerMethod} onChange={e => setClassConnectMethodEntries(classConnectMethodEntries.map((en, j) => j === i ? { ...en, callerMethod: e.target.value } : en))} placeholder="소스 메서드명" style={{ flex: 1, padding: "5px 8px", borderRadius: 6, border: "1px solid #E2E8F0", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", outline: "none", boxSizing: "border-box" }} />
                                <button onClick={() => setClassConnectMethodEntries(classConnectMethodEntries.filter((_, j) => j !== i))} style={{ padding: "2px 4px", background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 12 }}>×</button>
                              </div>
                              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                <span style={{ fontSize: 10, color: "#64748B", width: 60, flexShrink: 0 }}>대상 메서드</span>
                                <input value={entry.calleeMethod} onChange={e => setClassConnectMethodEntries(classConnectMethodEntries.map((en, j) => j === i ? { ...en, calleeMethod: e.target.value } : en))} placeholder="대상 메서드명" style={{ flex: 1, padding: "5px 8px", borderRadius: 6, border: "1px solid #E2E8F0", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", outline: "none", boxSizing: "border-box" }} />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Code preview */}
                        {classConnectMethodEntries.some(e => e.callerMethod && e.calleeMethod) && (
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>자동 생성 미리보기</div>
                            <pre style={{ background: "#0F172A", color: "#E2E8F0", padding: 12, borderRadius: 8, fontSize: 11, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.6, margin: 0, overflow: "auto" }}>{classConnectMethodEntries.filter(e => e.callerMethod && e.calleeMethod).map(e =>
`def ${e.callerMethod}(self, *args, **kwargs):
    self.${(tgtComp?.name || "target").replace(/-/g, "_")}.${e.calleeMethod}(*args, **kwargs)`).join("\n\n")}</pre>
                          </div>
                        )}

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

            const generateBasePyCodeImpl = () => {
              const classComps = allComps.filter(c => c.className);
              if (classComps.length === 0) return null;
              // minimal check — just return non-null if classes exist
              return "generated";
            };

            const hasClasses = !!generateBasePyCodeImpl();

            const downloadPackage = () => {
              if (!hasClasses) { flash("클래스가 정의된 컴포넌트가 없습니다."); return; }
              flash("✓ App 패키지 다운로드 완료");
            };

            return (
              <Card>
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>&#x1F4BB;</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>코드 구현</div>
                  <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20, maxWidth: 400, margin: "0 auto 20px" }}>
                    컴포넌트 설계에서 생성된 base class를 상속받아 실제 구현 코드를 작성합니다.
                    VS Code 환경에서 코드를 편집하세요.
                  </p>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                    <Btn v="primary" sz="lg" onClick={() => window.open("https://github.dev/ipython/ipython", "_blank")}>VS Code에서 코드 작성</Btn>
                  </div>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 14 }}>
                    <Btn sz="sm" onClick={() => { setActiveTab("design"); setTimeout(() => { /* trigger generateBasePy from design tab */ }, 100); }}>Base Class 생성</Btn>
                    <Btn sz="sm" onClick={downloadPackage}>App 패키지 다운로드</Btn>
                  </div>
                </div>
              </Card>
            );
          })()}

          {/* TAB 4: 학습 요청 */}
          {activeTab === "train" && (() => {
            return <TrainingRequestTab spec={editingSpecId ? specs.find(s => s.id === editingSpecId) : null} specName={form.name} addWorkload={addWorkload} flash={flash} />;
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
  const [form, setForm] = useState({ name: "", image: "", description: "", version: "1.0", type: "component", className: "", attributes: [], methods: [] });

  const addComponent = () => {
    if (!form.name || !form.image) { flash("이름과 이미지를 입력하세요."); return; }
    const newComp = { id: "CL-" + String(library.length + 1).padStart(2, "0"), ...form, created: now().split(" ")[0] };
    setLibrary(prev => [...prev, newComp]);
    setForm({ name: "", image: "", description: "", version: "1.0", type: "component", className: "", attributes: [], methods: [] });
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
            {/* type */}
            <div style={{ marginBottom: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#64748B", marginBottom: 5 }}>컴포넌트 타입</label>
                <select value={form.type || "component"} onChange={e => setForm(f => ({...f, type: e.target.value}))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, outline: "none", boxSizing: "border-box", background: "#fff", color: "#0F172A" }}>
                  <option value="component">Component</option>
                  <option value="solver">Solver</option>
                  <option value="environment">Environment</option>
                  <option value="train">Train</option>
                </select>
              </div>
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
          <thead><tr><TH>ID</TH><TH>이름</TH><TH>타입</TH><TH>클래스명</TH><TH>이미지</TH><TH a="center">속성</TH><TH a="center">메서드</TH><TH>설명</TH><TH a="center">버전</TH></tr></thead>
          <tbody>
            {library.map(c => {
              const typeColors = { component: ["#F1F5F9","#475569"], solver: ["#FEF3C7","#92400E"], environment: ["#DBEAFE","#1E40AF"], train: ["#F3E8FF","#6B21A8"] };
              const [tbg, tfg] = typeColors[c.type] || typeColors.component;
              return (
                <tr key={c.id}>
                  <TD><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#7E22CE" }}>{c.id}</span></TD>
                  <TD b>{c.name}</TD>
                  <TD><span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: tbg, color: tfg }}>{c.type || "component"}</span></TD>
                  <TD><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#6366F1" }}>{c.className || "—"}</span></TD>
                  <TD><span style={{ fontSize: 12, color: "#64748B", fontFamily: "'JetBrains Mono',monospace" }}>{c.image}</span></TD>
                  <TD a="center">{c.attributes?.length || 0}</TD>
                  <TD a="center">{c.methods?.length || 0}</TD>
                  <TD>{c.description}</TD>
                  <TD a="center">{c.version}</TD>
                </tr>
              );
            })}
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
          <p style={{ textAlign: "center", fontSize: 12, color: "#CBD5E1" }}>학습 요청이 제출되면 여기에 표시됩니다.</p>
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
                    <p><b>승인 필요:</b> 관리자 승인 대기</p>
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
function WorkloadsPage({ workloads, specs }) {
  const [selectedWL, setSelectedWL] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [metricsTab, setMetricsTab] = useState("progress");

  const generateSimulatedMetrics = (workloadId, totalSteps = 500) => {
    const seed = workloadId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const rng = (i) => {
      const x = Math.sin(seed * 9301 + i * 49297) * 49297;
      return x - Math.floor(x);
    };
    const metrics = [];
    let bestEff = 0;
    for (let step = 1; step <= totalSteps; step++) {
      const progress = step / totalSteps;
      const noise = (rng(step) - 0.5) * 0.3;
      const reward = Math.tanh(progress * 3 - 1) * 0.8 + noise * (1 - progress);
      const baseEff = 63 + (92 - 63) * Math.tanh(progress * 2.5);
      const efficiency = baseEff + (rng(step + 1000) - 0.5) * 8 * (1 - progress * 0.7);
      bestEff = Math.max(bestEff, efficiency);
      const entry = {
        step,
        reward: Math.max(-1, Math.min(1, reward)),
        efficiency,
        best_efficiency: bestEff,
      };
      if (step > 200) {
        entry.critic_loss = 5 * Math.exp(-progress * 3) + rng(step + 2000) * 0.5;
        entry.predict_q_value = Math.tanh(progress * 2) * 2 + (rng(step + 3000) - 0.5) * 0.3;
      }
      metrics.push(entry);
    }
    return metrics;
  };

  const renderMetricChart = (title, data, key, yMin, yMax, color, baseline) => {
    if (!data || data.length === 0) return (
      <div style={{ padding: 30, textAlign: "center", color: "#94A3B8", fontSize: 12, border: "1px solid #E2E8F0", borderRadius: 10 }}>
        {title}: warm-up 진행 중...
      </div>
    );
    const w = 400, h = 180, pad = { t: 30, r: 10, b: 30, l: 50 };
    const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
    const xScale = (i) => pad.l + (i / (data.length - 1 || 1)) * pw;
    const yScale = (v) => pad.t + ph - ((v - yMin) / (yMax - yMin || 1)) * ph;
    const points = data.map((d, i) => `${xScale(i)},${yScale(d[key])}`);
    const maWindow = Math.min(20, Math.floor(data.length / 5));
    const maPoints = [];
    if (maWindow > 1) {
      for (let i = 0; i < data.length; i++) {
        const start = Math.max(0, i - maWindow);
        const slice = data.slice(start, i + 1);
        const avg = slice.reduce((s, d) => s + d[key], 0) / slice.length;
        maPoints.push(`${xScale(i)},${yScale(avg)}`);
      }
    }
    return (
      <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", width: "100%", height: "auto" }}>
          <text x={pad.l} y={16} fontSize={12} fontWeight={700} fill="#0F172A">{title}</text>
          <text x={pad.l - 5} y={pad.t + 4} fontSize={9} fill="#94A3B8" textAnchor="end">{yMax}</text>
          <text x={pad.l - 5} y={h - pad.b + 4} fontSize={9} fill="#94A3B8" textAnchor="end">{yMin}</text>
          <line x1={pad.l} y1={pad.t} x2={pad.l} y2={h - pad.b} stroke="#E2E8F0" strokeWidth={1} />
          <line x1={pad.l} y1={h - pad.b} x2={w - pad.r} y2={h - pad.b} stroke="#E2E8F0" strokeWidth={1} />
          {baseline !== null && baseline !== undefined && (
            <>
              <line x1={pad.l} y1={yScale(baseline)} x2={w - pad.r} y2={yScale(baseline)} stroke="#EF4444" strokeWidth={1} strokeDasharray="4,4" />
              <text x={w - pad.r - 2} y={yScale(baseline) - 4} fontSize={9} fill="#EF4444" textAnchor="end">{baseline}%</text>
            </>
          )}
          <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth={1} opacity={0.3} />
          {maPoints.length > 0 && (
            <polyline points={maPoints.join(" ")} fill="none" stroke={color} strokeWidth={2} />
          )}
          <text x={w / 2} y={h - 5} fontSize={9} fill="#94A3B8" textAnchor="middle">step</text>
          <text x={pad.l} y={h - 5} fontSize={9} fill="#94A3B8">{data[0]?.step}</text>
          <text x={w - pad.r} y={h - 5} fontSize={9} fill="#94A3B8" textAnchor="end">{data[data.length - 1]?.step}</text>
        </svg>
      </div>
    );
  };

  const renderCompareChart = (title, compareData, key, yMin, yMax, baseline) => {
    const w = 400, h = 200, pad = { t: 30, r: 80, b: 30, l: 50 };
    const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
    const maxSteps = Math.max(...compareData.map(d => d.metrics.length));
    const xScale = (i) => pad.l + (i / (maxSteps - 1 || 1)) * pw;
    const yScale = (v) => pad.t + ph - ((v - yMin) / (yMax - yMin || 1)) * ph;
    return (
      <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", width: "100%", height: "auto" }}>
          <text x={pad.l} y={16} fontSize={12} fontWeight={700} fill="#0F172A">{title}</text>
          <text x={pad.l - 5} y={pad.t + 4} fontSize={9} fill="#94A3B8" textAnchor="end">{yMax}</text>
          <text x={pad.l - 5} y={h - pad.b + 4} fontSize={9} fill="#94A3B8" textAnchor="end">{yMin}</text>
          <line x1={pad.l} y1={pad.t} x2={pad.l} y2={h - pad.b} stroke="#E2E8F0" strokeWidth={1} />
          <line x1={pad.l} y1={h - pad.b} x2={w - pad.r} y2={h - pad.b} stroke="#E2E8F0" strokeWidth={1} />
          {baseline !== null && baseline !== undefined && (
            <>
              <line x1={pad.l} y1={yScale(baseline)} x2={w - pad.r} y2={yScale(baseline)} stroke="#EF4444" strokeWidth={1} strokeDasharray="4,4" />
              <text x={w - pad.r + 4} y={yScale(baseline) + 3} fontSize={9} fill="#EF4444">{baseline}%</text>
            </>
          )}
          {compareData.map((d, idx) => {
            const maWindow = Math.min(20, Math.floor(d.metrics.length / 5));
            const maPoints = [];
            for (let i = 0; i < d.metrics.length; i++) {
              if (d.metrics[i][key] === undefined) continue;
              const start = Math.max(0, i - maWindow);
              const slice = d.metrics.slice(start, i + 1).filter(m => m[key] !== undefined);
              if (slice.length === 0) continue;
              const avg = slice.reduce((s, m) => s + m[key], 0) / slice.length;
              maPoints.push(`${xScale(i)},${yScale(avg)}`);
            }
            return (
              <g key={d.workload.id}>
                <polyline points={maPoints.join(" ")} fill="none" stroke={d.color} strokeWidth={2} />
                <line x1={w - pad.r + 6} y1={pad.t + 10 + idx * 16} x2={w - pad.r + 20} y2={pad.t + 10 + idx * 16} stroke={d.color} strokeWidth={2} />
                <text x={w - pad.r + 24} y={pad.t + 14 + idx * 16} fontSize={9} fill={d.color}>{d.workload.name.slice(0, 10)}</text>
              </g>
            );
          })}
          <text x={w / 2} y={h - 5} fontSize={9} fill="#94A3B8" textAnchor="middle">step</text>
        </svg>
      </div>
    );
  };

  const tabBtnStyle = (tab) => ({ padding: "5px 14px", borderRadius: 6, border: metricsTab === tab ? "2px solid #0F172A" : "1px solid #E2E8F0", background: metricsTab === tab ? "#F1F5F9" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 });
  const closeBtnStyle = { padding: "5px 10px", borderRadius: 6, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer" };

  return (
    <div>
      <Title sub="전체 워크로드의 실행 상태를 확인합니다.">워크로드 목록</Title>
      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><TH>워크로드</TH><TH a="center">상태</TH><TH a="center">우선순위</TH><TH>자원</TH><TH>신청자</TH><TH>신청일시</TH><TH a="center">승인 방식</TH><TH a="center">테스트 참조</TH></tr></thead>
          <tbody>
            {[...workloads].reverse().map(w => (
              <tr key={w.id} onClick={() => { setSelectedWL(w); setMetricsTab("progress"); setCompareIds([]); }} style={{ cursor: "pointer", background: selectedWL?.id === w.id ? "#F1F5F9" : "transparent", transition: "background .12s" }} onMouseEnter={e => { if (selectedWL?.id !== w.id) e.currentTarget.style.background = "#F8FAFC"; }} onMouseLeave={e => { if (selectedWL?.id !== w.id) e.currentTarget.style.background = "transparent"; }}>
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

      {/* Training Progress Panel */}
      {selectedWL && metricsTab === "progress" && (() => {
        const metrics = generateSimulatedMetrics(selectedWL.id);
        const wlSteps = selectedWL.status === "running" ? Math.floor(metrics.length * 0.6) : metrics.length;
        const visibleMetrics = metrics.slice(0, wlSteps);
        return (
          <Card style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{selectedWL.name} — 학습 진행</span>
                {selectedWL.status === "running" && <span style={{ marginLeft: 8, fontSize: 11, color: "#059669", fontWeight: 600 }}>● 실시간</span>}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setMetricsTab("progress")} style={tabBtnStyle("progress")}>학습 진행</button>
                <button onClick={() => setMetricsTab("compare")} style={tabBtnStyle("compare")}>실험 비교</button>
                <button onClick={() => setSelectedWL(null)} style={closeBtnStyle}>✕</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              {renderMetricChart("Reward", visibleMetrics, "reward", -1, 1, "#1E40AF", null)}
              {renderMetricChart("Efficiency (%)", visibleMetrics, "efficiency", 50, 100, "#059669", 83.9)}
              {renderMetricChart("Critic Loss", visibleMetrics.filter(m => m.critic_loss !== undefined), "critic_loss", 0, 6, "#DC2626", null)}
              {renderMetricChart("Predict Q-value", visibleMetrics.filter(m => m.predict_q_value !== undefined), "predict_q_value", -1, 3, "#7C3AED", null)}
            </div>
            <div style={{ display: "flex", gap: 16, padding: "12px 16px", background: "#F8FAFC", borderRadius: 10, fontSize: 13 }}>
              <div><span style={{ color: "#64748B" }}>Best Efficiency:</span> <strong>{visibleMetrics[visibleMetrics.length-1]?.best_efficiency?.toFixed(1)}%</strong></div>
              <div><span style={{ color: "#64748B" }}>Step:</span> <strong>{wlSteps}</strong></div>
              <div><span style={{ color: "#64748B" }}>Latest Reward:</span> <strong>{visibleMetrics[visibleMetrics.length-1]?.reward?.toFixed(3)}</strong></div>
            </div>
          </Card>
        );
      })()}

      {/* Experiment Comparison Tab */}
      {selectedWL && metricsTab === "compare" && (() => {
        const sameAppWLs = workloads.filter(w => w.specId === selectedWL.specId && (w.status === "completed" || w.status === "running"));
        const activeCompareIds = compareIds.length > 0 ? compareIds : [selectedWL.id];
        const colors = ["#1E40AF", "#DC2626", "#059669", "#7C3AED", "#D97706"];
        const compareData = activeCompareIds.map((id, idx) => ({
          workload: workloads.find(w => w.id === id),
          metrics: generateSimulatedMetrics(id),
          color: colors[idx % colors.length],
        })).filter(d => d.workload);
        return (
          <Card style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>실험 비교 — {specs.find(s => s.id === selectedWL.specId)?.name || selectedWL.name}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setMetricsTab("progress")} style={tabBtnStyle("progress")}>학습 진행</button>
                <button onClick={() => setMetricsTab("compare")} style={tabBtnStyle("compare")}>실험 비교</button>
                <button onClick={() => setSelectedWL(null)} style={closeBtnStyle}>✕</button>
              </div>
            </div>
            <div style={{ marginBottom: 14, padding: "10px 14px", background: "#F8FAFC", borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>실행 선택 (같은 App)</div>
              {sameAppWLs.map(w => (
                <label key={w.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, fontSize: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={activeCompareIds.includes(w.id)} onChange={e => {
                    if (e.target.checked) setCompareIds([...activeCompareIds, w.id]);
                    else setCompareIds(activeCompareIds.filter(id => id !== w.id));
                  }} />
                  <span style={{ fontWeight: 600 }}>{w.name}</span>
                  <span style={{ color: "#64748B" }}>({w.gpu}, {w.mem})</span>
                  <Badge v={w.status}>{w.status === "completed" ? "완료" : w.status === "running" ? "실행 중" : w.status}</Badge>
                </label>
              ))}
            </div>
            {compareData.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                {renderCompareChart("Efficiency (%)", compareData, "efficiency", 50, 100, 83.9)}
                {renderCompareChart("Reward", compareData, "reward", -1, 1, null)}
              </div>
            )}
            {compareData.length > 1 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>파라미터 비교</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "6px 10px", textAlign: "left", borderBottom: "2px solid #E2E8F0", color: "#64748B" }}>파라미터</th>
                      {compareData.map(d => (
                        <th key={d.workload.id} style={{ padding: "6px 10px", textAlign: "center", borderBottom: "2px solid #E2E8F0", color: d.color, fontWeight: 700 }}>{d.workload.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "actor_lr", key: "actor_lr", values: ["0.0001", "0.001"] },
                      { label: "critic_lr", key: "critic_lr", values: ["0.0001", "0.0001"] },
                      { label: "minibatch_size", key: "minibatch", values: ["100", "100"] },
                      { label: "warm_up_num", key: "warmup", values: ["200", "200"] },
                      { label: "random_seed", key: "seed", values: ["1234", "5678"] },
                      { label: "impeller_variation_ratio", key: "imp_var", values: ["0.2", "0.2"] },
                      { label: "diffuser_variation_ratio", key: "dif_var", values: ["0.2", "0.15"] },
                      { label: "impeller_blade_range", key: "imp_blade", values: ["4~8", "4~8"] },
                      { label: "diffuser_blade_range", key: "dif_blade", values: ["8~14", "8~14"] },
                      { label: "Best Efficiency", key: "best_eff", values: null },
                    ].map((param, pi) => (
                      <tr key={param.key}>
                        <td style={{ padding: "5px 10px", borderBottom: "1px solid #F1F5F9", color: "#475569", fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>{param.label}</td>
                        {compareData.map((d, di) => {
                          const val = param.values ? (param.values[di] || param.values[0]) : d.metrics[d.metrics.length - 1]?.best_efficiency?.toFixed(1) + "%";
                          const otherVals = param.values ? compareData.map((_, oi) => param.values[oi] || param.values[0]).filter((_, oi) => oi !== di) : [];
                          const isDiff = param.values && otherVals.length > 0 && otherVals.some(ov => ov !== val);
                          return <td key={d.workload.id} style={{ padding: "5px 10px", textAlign: "center", borderBottom: "1px solid #F1F5F9", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: isDiff ? 700 : 400, color: isDiff ? "#DC2626" : "#334155", background: isDiff ? "#FEF2F2" : "transparent" }}>{val}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        );
      })()}
    </div>
  );
}

/* ═══════════════════════ MODELS ═══════════════════════ */
function ModelsPage({ models, flash, setPage }) {
  const [selectedModel, setSelectedModel] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [viewTab, setViewTab] = useState("detail"); // "detail" | "compare"

  const sel = models.find(m => m.id === selectedModel);
  const sameAppModels = sel ? models.filter(m => m.specId === sel.specId) : [];
  const hasRLMetrics = (m) => m.metrics.best_efficiency !== undefined;

  return (
    <div>
      <Title sub="워크로드 실행 완료 후 자동 생성된 결과 모델입니다.">결과 모델</Title>
      {models.length === 0 ? (
        <Card><p style={{ textAlign: "center", color: "#94A3B8", fontSize: 14, padding: 36 }}>아직 생성된 모델이 없습니다.</p></Card>
      ) : (
        <Card>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><TH>모델명</TH><TH>원본 워크로드</TH><TH a="center">생성일시</TH><TH a="center">크기</TH><TH a="center">성능</TH><TH a="center">작업</TH></tr></thead>
            <tbody>
              {[...models].reverse().map(m => (
                <tr key={m.id} onClick={() => { setSelectedModel(m.id); setViewTab("detail"); setCompareIds([m.id]); }} style={{ cursor: "pointer", background: selectedModel === m.id ? "#FEF3C7" : "transparent", transition: "background .15s" }}>
                  <TD b>{m.name}</TD>
                  <TD>{m.workload}</TD>
                  <TD a="center">{m.created}</TD>
                  <TD a="center">{m.size}</TD>
                  <TD a="center"><span style={{ fontWeight: 700, color: "#166534" }}>{m.metrics.best_efficiency || m.metrics.accuracy}</span></TD>
                  <TD a="center"><Btn sz="sm" icon="dl" onClick={(e) => { e.stopPropagation(); flash(`${m.name} 다운로드 시작`); }}>다운로드</Btn></TD>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Model Detail / Compare Panel */}
      {sel && (
        <Card style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{sel.name}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setViewTab("detail")} style={{ padding: "5px 14px", borderRadius: 6, border: viewTab === "detail" ? "2px solid #0F172A" : "1px solid #E2E8F0", background: viewTab === "detail" ? "#F1F5F9" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>성능 요약</button>
              {sameAppModels.length > 1 && <button onClick={() => setViewTab("compare")} style={{ padding: "5px 14px", borderRadius: 6, border: viewTab === "compare" ? "2px solid #0F172A" : "1px solid #E2E8F0", background: viewTab === "compare" ? "#F1F5F9" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>모델 비교</button>}
              <button onClick={() => setSelectedModel(null)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>✕</button>
            </div>
          </div>

          {viewTab === "detail" && (
            <>
              {/* Performance Summary */}
              <div style={{ display: "grid", gridTemplateColumns: hasRLMetrics(sel) ? "repeat(4, 1fr)" : "repeat(2, 1fr)", gap: 12, marginBottom: 14 }}>
                {hasRLMetrics(sel) ? (
                  <>
                    <div style={{ padding: "14px 16px", background: "#F0FDF4", borderRadius: 10, border: "1px solid #BBF7D0" }}>
                      <div style={{ fontSize: 11, color: "#166534", marginBottom: 4 }}>Best Efficiency</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "#166534" }}>{sel.metrics.best_efficiency}</div>
                    </div>
                    <div style={{ padding: "14px 16px", background: "#EFF6FF", borderRadius: 10, border: "1px solid #BFDBFE" }}>
                      <div style={{ fontSize: 11, color: "#1E40AF", marginBottom: 4 }}>Head Coefficient</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "#1E40AF" }}>{sel.metrics.head_coefficient}</div>
                    </div>
                    <div style={{ padding: "14px 16px", background: "#FEF3C7", borderRadius: 10, border: "1px solid #FDE68A" }}>
                      <div style={{ fontSize: 11, color: "#92400E", marginBottom: 4 }}>TPLC</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "#92400E" }}>{sel.metrics.tplc}</div>
                    </div>
                    <div style={{ padding: "14px 16px", background: "#F8FAFC", borderRadius: 10, border: "1px solid #E2E8F0" }}>
                      <div style={{ fontSize: 11, color: "#475569", marginBottom: 4 }}>Total Steps</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>{sel.metrics.total_steps}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ padding: "14px 16px", background: "#F0FDF4", borderRadius: 10, border: "1px solid #BBF7D0" }}>
                      <div style={{ fontSize: 11, color: "#166534", marginBottom: 4 }}>Accuracy</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "#166534" }}>{sel.metrics.accuracy}</div>
                    </div>
                    <div style={{ padding: "14px 16px", background: "#EFF6FF", borderRadius: 10, border: "1px solid #BFDBFE" }}>
                      <div style={{ fontSize: 11, color: "#1E40AF", marginBottom: 4 }}>Loss</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "#1E40AF" }}>{sel.metrics.loss}</div>
                    </div>
                  </>
                )}
              </div>

              {/* Model Info */}
              {hasRLMetrics(sel) && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                  <div style={{ padding: "10px 14px", background: "#F8FAFC", borderRadius: 8, fontSize: 12 }}>
                    <span style={{ color: "#64748B" }}>Flow Coefficient: </span><strong>{sel.metrics.flow_coefficient}</strong>
                  </div>
                  <div style={{ padding: "10px 14px", background: "#F8FAFC", borderRadius: 8, fontSize: 12 }}>
                    <span style={{ color: "#64748B" }}>Axial Thrust: </span><strong>{sel.metrics.axial_thrust}</strong>
                  </div>
                  <div style={{ padding: "10px 14px", background: "#F8FAFC", borderRadius: 8, fontSize: 12 }}>
                    <span style={{ color: "#64748B" }}>Model Size: </span><strong>{sel.size}</strong>
                  </div>
                </div>
              )}

              {/* Source workload link */}
              <div style={{ padding: "10px 14px", background: "#F8FAFC", borderRadius: 8, fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  <span style={{ color: "#64748B" }}>원본 워크로드: </span>
                  <strong onClick={() => setPage("workloads")} style={{ color: "#1E40AF", cursor: "pointer", textDecoration: "underline" }}>{sel.workload}</strong>
                  <span style={{ color: "#94A3B8", marginLeft: 4 }}>({sel.workloadId})</span>
                </span>
                <span style={{ color: "#64748B" }}>생성일: {sel.created}</span>
              </div>
            </>
          )}

          {viewTab === "compare" && (
            <>
              {/* Model selector */}
              <div style={{ marginBottom: 14, padding: "10px 14px", background: "#F8FAFC", borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>모델 선택 (같은 App)</div>
                {sameAppModels.map(m => (
                  <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, fontSize: 12, cursor: "pointer" }}>
                    <input type="checkbox" checked={compareIds.includes(m.id)} onChange={e => {
                      if (e.target.checked) setCompareIds([...compareIds, m.id]);
                      else setCompareIds(compareIds.filter(id => id !== m.id));
                    }} />
                    <span style={{ fontWeight: 600 }}>{m.name}</span>
                    <span style={{ color: "#64748B" }}>({m.workload})</span>
                  </label>
                ))}
              </div>

              {/* Comparison table */}
              {compareIds.length > 1 && (() => {
                const compared = compareIds.map(id => models.find(m => m.id === id)).filter(Boolean);
                const colors = ["#1E40AF", "#DC2626", "#059669", "#7C3AED"];
                const metricsToCompare = hasRLMetrics(compared[0]) ? [
                  { label: "Best Efficiency", key: "best_efficiency", best: "max" },
                  { label: "Head Coefficient", key: "head_coefficient", best: "max" },
                  { label: "Flow Coefficient", key: "flow_coefficient" },
                  { label: "Axial Thrust", key: "axial_thrust", best: "min" },
                  { label: "TPLC", key: "tplc", best: "min" },
                  { label: "Total Steps", key: "total_steps" },
                  { label: "Model Size", key: null, getter: (m) => m.size },
                ] : [
                  { label: "Accuracy", key: "accuracy", best: "max" },
                  { label: "Loss", key: "loss", best: "min" },
                  { label: "Model Size", key: null, getter: (m) => m.size },
                ];

                return (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "2px solid #E2E8F0", color: "#64748B" }}>지표</th>
                        {compared.map((m, i) => (
                          <th key={m.id} style={{ padding: "8px 10px", textAlign: "center", borderBottom: "2px solid #E2E8F0", color: colors[i % colors.length], fontWeight: 700 }}>{m.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {metricsToCompare.map(metric => {
                        const vals = compared.map(m => metric.getter ? metric.getter(m) : m.metrics[metric.key]);
                        const numVals = vals.map(v => parseFloat(v));
                        const bestIdx = metric.best === "max" ? numVals.indexOf(Math.max(...numVals.filter(n => !isNaN(n)))) : metric.best === "min" ? numVals.indexOf(Math.min(...numVals.filter(n => !isNaN(n)))) : -1;
                        return (
                          <tr key={metric.label}>
                            <td style={{ padding: "6px 10px", borderBottom: "1px solid #F1F5F9", color: "#475569" }}>{metric.label}</td>
                            {vals.map((val, i) => (
                              <td key={i} style={{ padding: "6px 10px", textAlign: "center", borderBottom: "1px solid #F1F5F9", fontFamily: "'JetBrains Mono',monospace", fontWeight: i === bestIdx ? 700 : 400, color: i === bestIdx ? "#166534" : "#334155", background: i === bestIdx ? "#F0FDF4" : "transparent" }}>{val}</td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </>
          )}
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════ COMPONENT LIBRARY INLINE (for App관리 tab) ═══════════════════════ */
function ComponentLibraryInline({ library, setLibrary, flash }) {
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", image: "", description: "", version: "1.0", type: "component", className: "", attributes: [], methods: [] });
  const allLibrary = library; // solver 포함 전체 라이브러리 표시

  const addComponent = () => {
    if (!form.name || !form.image) { flash("이름과 이미지를 입력하세요."); return; }
    const newComp = { id: "CL-" + String(library.length + 1).padStart(2, "0"), ...form, created: now().split(" ")[0] };
    setLibrary(prev => [...prev, newComp]);
    setForm({ name: "", image: "", description: "", version: "1.0", type: "component", className: "", attributes: [], methods: [] });
    setShowForm(false);
    flash("✓ 컴포넌트가 라이브러리에 등록되었습니다.");
  };

  return (
    <Card style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>컴포넌트 글로벌 라이브러리 ({allLibrary.length}개)</div>
        <span style={{ fontSize: 12, color: "#94A3B8" }}>{expanded ? "▲ 접기" : "▼ 펼치기"}</span>
      </div>
      {expanded && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <Btn sz="sm" v="primary" onClick={() => setShowForm(!showForm)}>{showForm ? "취소" : "새 컴포넌트 등록"}</Btn>
          </div>
          {showForm && (
            <div style={{ marginBottom: 14, padding: 14, background: "#F8FAFC", borderRadius: 10, border: "1px solid #E2E8F0" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <InputField label="이름" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="컴포넌트 이름" />
                <InputField label="이미지" value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} placeholder="registry.avatar.io/name:tag" />
                <InputField label="클래스명 (className)" value={form.className} onChange={e => setForm(f => ({ ...f, className: e.target.value }))} placeholder="MyComponentBase" mono />
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>타입</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ display: "block", width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, outline: "none", boxSizing: "border-box", background: "#fff", fontFamily: "inherit" }}>
                    <option value="component">Component</option>
                    <option value="environment">Environment</option>
                    <option value="train">Train</option>
                  </select>
                  <span style={{ fontSize: 10, color: "#94A3B8", marginTop: 2, display: "block" }}>Solver는 관리자(Trainer)에서만 등록 가능</span>
                </div>
                <InputField label="설명" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                <InputField label="버전" value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} />
              </div>
              {/* Attributes */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>Attributes ({form.attributes.length})</label>
                  <button onClick={() => setForm(f => ({ ...f, attributes: [...f.attributes, { name: "", type: "Any" }] }))} style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 600, color: "#6366F1", fontFamily: "inherit" }}>+ 추가</button>
                </div>
                {form.attributes.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 3 }}>
                    <input value={a.name} onChange={e => setForm(f => ({ ...f, attributes: f.attributes.map((at, j) => j === i ? { ...at, name: e.target.value } : at) }))} placeholder="name" style={{ flex: 1, padding: "4px 8px", borderRadius: 4, border: "1px solid #E2E8F0", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", outline: "none", boxSizing: "border-box" }} />
                    <input value={a.type} onChange={e => setForm(f => ({ ...f, attributes: f.attributes.map((at, j) => j === i ? { ...at, type: e.target.value } : at) }))} placeholder="type" style={{ width: 80, padding: "4px 8px", borderRadius: 4, border: "1px solid #E2E8F0", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", outline: "none", color: "#6366F1", boxSizing: "border-box" }} />
                    <button onClick={() => setForm(f => ({ ...f, attributes: f.attributes.filter((_, j) => j !== i) }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 13 }}>×</button>
                  </div>
                ))}
              </div>
              {/* Methods */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>Methods ({form.methods.length})</label>
                  <button onClick={() => setForm(f => ({ ...f, methods: [...f.methods, { name: "", params: "", returnType: "None", isAbstract: true }] }))} style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 600, color: "#6366F1", fontFamily: "inherit" }}>+ 추가</button>
                </div>
                {form.methods.map((m, i) => (
                  <div key={i} style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 3 }}>
                    <input value={m.name} onChange={e => setForm(f => ({ ...f, methods: f.methods.map((mt, j) => j === i ? { ...mt, name: e.target.value } : mt) }))} placeholder="method_name" style={{ flex: 1, padding: "4px 8px", borderRadius: 4, border: "1px solid #E2E8F0", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", outline: "none", boxSizing: "border-box" }} />
                    <input value={m.params} onChange={e => setForm(f => ({ ...f, methods: f.methods.map((mt, j) => j === i ? { ...mt, params: e.target.value } : mt) }))} placeholder="params" style={{ width: 70, padding: "4px 8px", borderRadius: 4, border: "1px solid #E2E8F0", fontSize: 10, fontFamily: "'JetBrains Mono',monospace", outline: "none", boxSizing: "border-box" }} />
                    <label style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 10, color: m.isAbstract ? "#92400E" : "#94A3B8", cursor: "pointer", whiteSpace: "nowrap" }}>
                      <input type="checkbox" checked={!!m.isAbstract} onChange={e => setForm(f => ({ ...f, methods: f.methods.map((mt, j) => j === i ? { ...mt, isAbstract: e.target.checked } : mt) }))} style={{ width: 12, height: 12 }} />abs
                    </label>
                    <button onClick={() => setForm(f => ({ ...f, methods: f.methods.filter((_, j) => j !== i) }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 13 }}>×</button>
                  </div>
                ))}
              </div>
              <Btn v="success" sz="sm" icon="check" onClick={addComponent}>등록</Btn>
            </div>
          )}
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><TH>이름</TH><TH>타입</TH><TH>클래스명</TH><TH a="center">속성</TH><TH a="center">메서드</TH><TH>이미지</TH><TH>설명</TH></tr></thead>
            <tbody>
              {allLibrary.map(c => {
                const typeColors = { component: ["#F1F5F9","#475569"], solver: ["#FEF3C7","#92400E"], environment: ["#DBEAFE","#1E40AF"], train: ["#F3E8FF","#6B21A8"] };
                const [tbg, tfg] = typeColors[c.type] || typeColors.component;
                return (
                  <tr key={c.id}>
                    <TD b>{c.name}</TD>
                    <TD><span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: tbg, color: tfg }}>{c.type || "component"}</span></TD>
                    <TD><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#6366F1" }}>{c.className || "—"}</span></TD>
                    <TD a="center">{c.attributes?.length || 0}</TD>
                    <TD a="center">{c.methods?.length || 0}</TD>
                    <TD><span style={{ fontSize: 11, color: "#64748B", fontFamily: "'JetBrains Mono',monospace" }}>{c.image}</span></TD>
                    <TD>{c.description}</TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ═══════════════════════ TRAINING REQUEST TAB (inside Builder) ═══════════════════════ */
function TrainingRequestTab({ spec, specName, addWorkload, flash }) {
  const [done, setDone] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [params, setParams] = useState({ episodes: "1000", learningRate: "0.001", batchSize: "64", discountFactor: "0.99", maxSteps: "500" });
  const [form, setForm] = useState({ gpuType: "A100", gpuCount: "4", mem: "128GB" });
  const [preTest, setPreTest] = useState({ status: null, results: null });

  const gpuStr = form.gpuType + " x " + form.gpuCount;
  const needsApproval = exceedsThreshold(gpuStr, form.mem);

  const runPreTest = () => {
    setPreTest({ status: "running", results: null });
    flash("사전 테스트를 실행합니다...");
    setTimeout(() => {
      const results = { convergence: true, avgReward: (80 + Math.random() * 15).toFixed(1), finalReward: (88 + Math.random() * 10).toFixed(1), log: "Episode 1: reward=72.1\nEpisode 3: reward=79.4\nEpisode 5: reward=85.3\nEpisode 8: reward=89.7\nEpisode 10: reward=" + (88 + Math.random() * 10).toFixed(1) + "\nConvergence: YES" };
      setPreTest({ status: "passed", results, episodes: 10 });
      flash("✓ 사전 테스트 통과 — 결과를 첨부하여 제출할 수 있습니다.");
    }, 2500);
  };

  const resetAll = () => { setDone(false); setLastResult(null); setPreTest({ status: null, results: null }); };

  if (!spec) return (
    <Card><p style={{ textAlign: "center", color: "#94A3B8", fontSize: 13, padding: 24 }}>먼저 App을 저장한 후 학습 요청을 제출할 수 있습니다.</p></Card>
  );

  if (done) return (
    <Card>
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <div style={{ width: 52, height: 52, borderRadius: 99, background: lastResult?.immediate ? "#EFF6FF" : "#F0FDF4", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <I n={lastResult?.immediate ? "play" : "check"} s={26} c={lastResult?.immediate ? "#1D4ED8" : "#166534"} />
        </div>
        <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700 }}>학습 요청 완료</h3>
        {lastResult?.immediate ? (
          <p style={{ margin: 0, fontSize: 13, color: "#1E40AF", fontWeight: 500 }}>자원 임계치 미만 — 실행 대기열에 진입했습니다.</p>
        ) : lastResult?.attached ? (
          <p style={{ margin: 0, fontSize: 13, color: "#7E22CE", fontWeight: 500 }}>테스트 결과 첨부 — 관리자 확인 후 승인됩니다.</p>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>자원 임계치 초과 — 관리자 승인을 대기합니다.</p>
        )}
        <div style={{ marginTop: 20 }}><Btn onClick={resetAll}>새 학습 요청</Btn></div>
      </div>
    </Card>
  );

  const submitWorkload = (withAttachment) => {
    const attachedLoopTest = withAttachment && preTest.status === "passed" ? {
      status: "passed", episodes: preTest.episodes || 10,
      results: preTest.results, executedBy: "developer", executedAt: now()
    } : null;
    addWorkload({
      name: (spec.name || specName) + "-training", specId: spec.id, requester: "나",
      priority: "high", gpu: gpuStr, mem: form.mem,
      testRunRef: null, isTrainingRequest: true,
      trainingConfig: { ...params },
      ...(attachedLoopTest ? { attachedLoopTest } : {})
    });
    setLastResult({ immediate: !needsApproval, attached: !!attachedLoopTest });
    setDone(true);
  };

  return (
    <>
      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>선택된 App</div>
        <div style={{ fontSize: 13, padding: "10px 14px", background: "#F8FAFC", borderRadius: 8, border: "1px solid #E2E8F0" }}>
          <strong>{spec.name}</strong> <span style={{ color: "#94A3B8" }}>v{spec.version}</span>
          <span style={{ marginLeft: 12, color: "#64748B" }}>Task {getTaskCount(spec)}개 · 컴포넌트 {getComponentCount(spec)}개</span>
        </div>
      </Card>

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

      {needsApproval && (
        <Card style={{ marginBottom: 14, background: preTest.status === "passed" ? "#F0FDF4" : preTest.status === "running" ? "#EFF6FF" : "#FFFBEB", border: `1px solid ${preTest.status === "passed" ? "#BBF7D0" : preTest.status === "running" ? "#BFDBFE" : "#FDE68A"}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: preTest.status === "passed" ? "#166534" : "#92400E" }}>사전 테스트 (선택)</div>
            {preTest.status === "passed" && <Badge v="passed">통과</Badge>}
            {preTest.status === "running" && <Badge v="running">실행 중</Badge>}
          </div>
          <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 12px", lineHeight: 1.6 }}>
            사전 테스트를 실행하면 결과를 첨부하여 제출할 수 있습니다.
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
              <div style={{ fontSize: 12, color: "#334155" }}>
                수렴: {preTest.results.convergence ? "YES" : "NO"} · 평균 보상: {preTest.results.avgReward} · 최종 보상: {preTest.results.finalReward}
              </div>
              {preTest.results.log && (
                <pre style={{ background: "#0F172A", borderRadius: 6, padding: 10, fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "#A5F3FC", margin: "8px 0 0", lineHeight: 1.6, maxHeight: 120, overflow: "auto" }}>{preTest.results.log}</pre>
              )}
            </div>
          )}
          {!preTest.status && <Btn v="accent" icon="test" onClick={runPreTest}>사전 테스트 실행</Btn>}
          {preTest.status === "passed" && <Btn v="ghost" icon="test" sz="sm" onClick={runPreTest}>재실행</Btn>}
        </Card>
      )}

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
    </>
  );
}

/* ═══════════════════════ OPERATOR PAGE ═══════════════════════ */
function OperatorPage({ models, flash }) {
  const deployedModels = models.filter(m => m.operatorReady);

  return (
    <div>
      <Title sub="배포된 모델을 확인하고 운영합니다.">Operator</Title>
      {deployedModels.length === 0 ? (
        <Card>
          <p style={{ textAlign: "center", color: "#94A3B8", fontSize: 14, padding: 36 }}>
            배포된 모델이 없습니다. 관리자가 Trainer에서 모델을 배포하면 여기에 표시됩니다.
          </p>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {deployedModels.map(m => (
            <Card key={m.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>{m.name}</span>
                    <Badge v="completed">배포됨</Badge>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", display: "flex", gap: 16 }}>
                    <span>워크로드: {m.workload}</span>
                    <span>크기: {m.size}</span>
                    <span>생성: {m.created}</span>
                  </div>
                  {m.metrics && (
                    <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
                      {Object.entries(m.metrics).map(([k, v]) => (
                        <div key={k} style={{ padding: "6px 12px", background: "#F8FAFC", borderRadius: 6, fontSize: 12 }}>
                          <span style={{ color: "#64748B" }}>{k}: </span><strong>{v}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Btn sz="sm" icon="dl" onClick={() => flash(`${m.name} 다운로드 시작`)}>다운로드</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ TRAINER ADMIN PAGE (combined) ═══════════════════════ */
function TrainerAdminPage({ workloads, setWorkloads, models, setModels, specs, library, setLibrary, pending, running, queued, approveWorkload, rejectWorkload, runLoopTest, reviewLoopTest, testRuns, setModal, flash }) {
  const [tab, setTab] = useState("requests");

  return (
    <div>
      <Title sub="학습 요청 관리, 워크로드 모니터링, 리소스 관리">Trainer</Title>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[["requests", "요청 관리"], ["workloads", "워크로드"], ["resources", "리소스"], ["solvers", "Solver 관리"], ["models", "모델 선택"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: "8px 18px", borderRadius: 8, border: tab === k ? "2px solid #0F172A" : "1px solid #E2E8F0", background: tab === k ? "#F1F5F9" : "#fff", cursor: "pointer", fontSize: 13, fontWeight: tab === k ? 700 : 500, fontFamily: "inherit" }}>
            {l}
            {k === "requests" && pending.length > 0 && <span style={{ marginLeft: 6, background: "#DC2626", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99 }}>{pending.length}</span>}
          </button>
        ))}
      </div>

      {tab === "requests" && <ApprovalPage pending={pending} approveWorkload={approveWorkload} rejectWorkload={rejectWorkload} runLoopTest={runLoopTest} reviewLoopTest={reviewLoopTest} testRuns={testRuns} setModal={setModal} />}
      {tab === "workloads" && <WorkloadsPageWithResources workloads={workloads} specs={specs} />}
      {tab === "resources" && <ResourcesPage workloads={workloads} />}
      {tab === "solvers" && <SolverManagementTab library={library} setLibrary={setLibrary} flash={flash} />}
      {tab === "models" && <ModelSelectionTab models={models} setModels={setModels} flash={flash} />}
    </div>
  );
}

/* ═══════════════════════ WORKLOADS WITH PER-COMPONENT RESOURCES ═══════════════════════ */
function WorkloadsPageWithResources({ workloads, specs }) {
  const [selectedWL, setSelectedWL] = useState(null);
  const [metricsTab, setMetricsTab] = useState("progress");

  const generateSimulatedMetrics = (workloadId, totalSteps = 500) => {
    const seed = workloadId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const rng = (i) => { const x = Math.sin(seed * 9301 + i * 49297) * 49297; return x - Math.floor(x); };
    const metrics = [];
    let bestEff = 0;
    for (let step = 1; step <= totalSteps; step++) {
      const progress = step / totalSteps;
      const noise = (rng(step) - 0.5) * 0.3;
      const reward = Math.tanh(progress * 3 - 1) * 0.8 + noise * (1 - progress);
      const baseEff = 63 + (92 - 63) * Math.tanh(progress * 2.5);
      const efficiency = baseEff + (rng(step + 1000) - 0.5) * 8 * (1 - progress * 0.7);
      bestEff = Math.max(bestEff, efficiency);
      const entry = { step, reward: Math.max(-1, Math.min(1, reward)), efficiency, best_efficiency: bestEff };
      if (step > 200) {
        entry.critic_loss = 5 * Math.exp(-progress * 3) + rng(step + 2000) * 0.5;
        entry.predict_q_value = Math.tanh(progress * 2) * 2 + (rng(step + 3000) - 0.5) * 0.3;
      }
      metrics.push(entry);
    }
    return metrics;
  };

  return (
    <div>
      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><TH>워크로드</TH><TH a="center">상태</TH><TH a="center">우선순위</TH><TH>자원</TH><TH>신청자</TH><TH>신청일시</TH></tr></thead>
          <tbody>
            {[...workloads].reverse().map(w => (
              <tr key={w.id} onClick={() => { setSelectedWL(w); setMetricsTab("progress"); }} style={{ cursor: "pointer", background: selectedWL?.id === w.id ? "#F1F5F9" : "transparent", transition: "background .12s" }}>
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
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {selectedWL && (selectedWL.status === "completed" || selectedWL.status === "running") && (() => {
        const metrics = generateSimulatedMetrics(selectedWL.id);
        const wlSteps = selectedWL.status === "running" ? Math.floor(metrics.length * 0.6) : metrics.length;
        const visibleMetrics = metrics.slice(0, wlSteps);
        return (
          <Card style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{selectedWL.name} — 학습 진행</span>
                {selectedWL.status === "running" && <span style={{ marginLeft: 8, fontSize: 11, color: "#059669", fontWeight: 600 }}>● 실시간</span>}
              </div>
              <button onClick={() => setSelectedWL(null)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", gap: 16, padding: "12px 16px", background: "#F8FAFC", borderRadius: 10, fontSize: 13, marginBottom: 14 }}>
              <div><span style={{ color: "#64748B" }}>Best Efficiency:</span> <strong>{visibleMetrics[visibleMetrics.length-1]?.best_efficiency?.toFixed(1)}%</strong></div>
              <div><span style={{ color: "#64748B" }}>Step:</span> <strong>{wlSteps}</strong></div>
              <div><span style={{ color: "#64748B" }}>Latest Reward:</span> <strong>{visibleMetrics[visibleMetrics.length-1]?.reward?.toFixed(3)}</strong></div>
            </div>

            {/* Per-component execution status + resources */}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>컴포넌트별 실행 현황</div>
              <p style={{ fontSize: 11, color: "#94A3B8", margin: "0 0 10px" }}>각 컴포넌트가 순서대로 실행되며, 개별 자원이 할당됩니다.</p>
              {(() => {
                const isRunning = sel?.status === "running";
                const progress = isRunning ? 0.6 : 1.0;
                const components = [
                  { order: 1, name: "rcp-setup", type: "component", gpu: "V100 x 1", memAlloc: "16GB", memUsed: "12.3", usage: 77 },
                  { order: 2, name: "impeller-agent", type: "component", gpu: "V100 x 1", memAlloc: "8GB", memUsed: "5.8", usage: 73 },
                  { order: 3, name: "diffuser-agent", type: "component", gpu: "V100 x 1", memAlloc: "8GB", memUsed: "5.6", usage: 70 },
                  { order: 4, name: "multi-agent", type: "component", gpu: "V100 x 1", memAlloc: "16GB", memUsed: "10.1", usage: 63 },
                  { order: 5, name: "make-blade", type: "solver", gpu: "V100 x 1", memAlloc: "8GB", memUsed: "5.2", usage: 65 },
                  { order: 6, name: "mesh-generator", type: "solver", gpu: "V100 x 1", memAlloc: "8GB", memUsed: "6.1", usage: 76 },
                  { order: 7, name: "run-cfx", type: "solver", gpu: "A100 x 2", memAlloc: "32GB", memUsed: "24.1", usage: 75 },
                  { order: 8, name: "environment", type: "environment", gpu: "A100 x 2", memAlloc: "64GB", memUsed: "48.2", usage: 75 },
                  { order: 9, name: "train", type: "train", gpu: "A100 x 4", memAlloc: "128GB", memUsed: "98.5", usage: 77 },
                ];
                const activeIdx = isRunning ? Math.floor(components.length * progress) : components.length;
                const statusColors = { completed: ["#DCFCE7","#166534"], running: ["#DBEAFE","#1E40AF"], waiting: ["#F1F5F9","#94A3B8"] };
                const typeColors = { component: "#475569", solver: "#92400E", environment: "#1E40AF", train: "#6B21A8" };
                return (
                  <>
                    {/* Execution flow */}
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
                      {components.map((c, i) => {
                        const st = i < activeIdx ? "completed" : i === activeIdx ? "running" : "waiting";
                        const [bg, fg] = statusColors[st];
                        return (
                          <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: bg, color: fg, border: st === "running" ? "2px solid #1E40AF" : "1px solid transparent" }}>
                              {c.order}. {c.name}
                              {st === "running" && " ●"}
                            </span>
                            {i < components.length - 1 && <span style={{ color: "#CBD5E1", fontSize: 12 }}>→</span>}
                          </div>
                        );
                      })}
                    </div>
                    {/* Resource grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                      {components.map((c, i) => {
                        const st = i < activeIdx ? "completed" : i === activeIdx ? "running" : "waiting";
                        const borderColor = st === "running" ? "#1E40AF" : st === "completed" ? "#BBF7D0" : "#E2E8F0";
                        const typeBg = { component: "#F1F5F9", solver: "#FEF3C7", environment: "#DBEAFE", train: "#F3E8FF" };
                        return (
                          <div key={c.name} style={{ padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${borderColor}`, fontSize: 11, background: st === "waiting" ? "#FAFAFA" : "#fff", opacity: st === "waiting" ? 0.6 : 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                              <span style={{ fontWeight: 700, color: "#0F172A" }}>{c.order}. {c.name}</span>
                              <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: typeBg[c.type], color: typeColors[c.type], fontWeight: 600 }}>{c.type}</span>
                            </div>
                            <div style={{ color: "#64748B", marginBottom: 4 }}>{c.gpu} · {c.memUsed} / {c.memAlloc}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ flex: 1, background: "#E2E8F0", borderRadius: 4, height: 6 }}>
                                <div style={{ width: (st === "waiting" ? 0 : c.usage) + "%", background: st === "running" ? "#1E40AF" : c.usage > 80 ? "#EF4444" : "#059669", borderRadius: 4, height: 6, transition: "width .3s" }} />
                              </div>
                              <span style={{ fontSize: 10, color: "#64748B", minWidth: 28, textAlign: "right" }}>{st === "waiting" ? "—" : c.usage + "%"}</span>
                            </div>
                            <div style={{ marginTop: 4, fontSize: 10, color: st === "completed" ? "#166534" : st === "running" ? "#1E40AF" : "#94A3B8", fontWeight: 600 }}>
                              {st === "completed" ? "✓ 완료" : st === "running" ? "● 실행 중" : "대기"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          </Card>
        );
      })()}
    </div>
  );
}

/* ═══════════════════════ SOLVER MANAGEMENT TAB ═══════════════════════ */
function SolverManagementTab({ library, setLibrary, flash }) {
  const solvers = library.filter(c => c.type === "solver");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", image: "", description: "", version: "1.0", className: "", solverId: "", attributes: [], methods: [] });

  const addSolver = () => {
    if (!form.name || !form.image) { flash("이름과 이미지를 입력하세요."); return; }
    const newComp = { id: "CL-" + String(library.length + 1).padStart(2, "0"), ...form, type: "solver", created: now().split(" ")[0] };
    setLibrary(prev => [...prev, newComp]);
    setForm({ name: "", image: "", description: "", version: "1.0", className: "", solverId: "", attributes: [], methods: [] });
    setShowForm(false);
    flash("✓ Solver가 등록되었습니다.");
  };

  const deleteSolver = (id) => {
    setLibrary(prev => prev.filter(c => c.id !== id));
    flash("✓ Solver가 삭제되었습니다.");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Solver 컴포넌트 ({solvers.length}개)</div>
        <Btn v="primary" sz="sm" onClick={() => setShowForm(!showForm)}>{showForm ? "취소" : "새 Solver 등록"}</Btn>
      </div>
      {showForm && (
        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <InputField label="이름" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="solver 이름" />
            <InputField label="이미지" value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} placeholder="registry.avatar.io/solver:tag" />
            <InputField label="클래스명" value={form.className} onChange={e => setForm(f => ({ ...f, className: e.target.value }))} mono />
            <InputField label="Solver ID" value={form.solverId} onChange={e => setForm(f => ({ ...f, solverId: e.target.value }))} mono />
            <InputField label="설명" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <InputField label="버전" value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} />
          </div>
          <Btn v="success" sz="sm" icon="check" onClick={addSolver}>등록</Btn>
        </Card>
      )}
      <Card>
        {solvers.length === 0 ? (
          <p style={{ textAlign: "center", color: "#94A3B8", fontSize: 13, padding: 24 }}>등록된 Solver가 없습니다.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><TH>ID</TH><TH>이름</TH><TH>클래스명</TH><TH>Solver ID</TH><TH>이미지</TH><TH>설명</TH><TH a="center">작업</TH></tr></thead>
            <tbody>
              {solvers.map(c => (
                <tr key={c.id}>
                  <TD><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#7E22CE" }}>{c.id}</span></TD>
                  <TD b>{c.name}</TD>
                  <TD><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#6366F1" }}>{c.className || "—"}</span></TD>
                  <TD><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>{c.solverId || "—"}</span></TD>
                  <TD><span style={{ fontSize: 12, color: "#64748B", fontFamily: "'JetBrains Mono',monospace" }}>{c.image}</span></TD>
                  <TD>{c.description}</TD>
                  <TD a="center"><Btn sz="sm" v="danger" onClick={() => deleteSolver(c.id)}>삭제</Btn></TD>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

/* ═══════════════════════ MODEL SELECTION TAB ═══════════════════════ */
function ModelSelectionTab({ models, setModels, flash }) {
  const toggleOperatorReady = (id) => {
    setModels(prev => prev.map(m => m.id === id ? { ...m, operatorReady: !m.operatorReady } : m));
    const model = models.find(m => m.id === id);
    flash(model?.operatorReady ? `✓ ${model.name} Operator 배포 해제` : `✓ ${model?.name} Operator 배포 설정`);
  };

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>모델 배포 관리</div>
      <p style={{ fontSize: 12, color: "#64748B", marginBottom: 14 }}>Operator 배포를 활성화하면 사용자 모드의 Operator 페이지에 모델이 표시됩니다.</p>
      <Card>
        {models.length === 0 ? (
          <p style={{ textAlign: "center", color: "#94A3B8", fontSize: 13, padding: 24 }}>생성된 모델이 없습니다.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><TH>모델명</TH><TH>워크로드</TH><TH a="center">크기</TH><TH a="center">성능</TH><TH a="center">생성일시</TH><TH a="center">Operator 배포</TH></tr></thead>
            <tbody>
              {[...models].reverse().map(m => (
                <tr key={m.id}>
                  <TD b>{m.name}</TD>
                  <TD>{m.workload}</TD>
                  <TD a="center">{m.size}</TD>
                  <TD a="center"><span style={{ fontWeight: 700, color: "#166534" }}>{m.metrics.best_efficiency || m.metrics.accuracy}</span></TD>
                  <TD a="center">{m.created}</TD>
                  <TD a="center">
                    <button onClick={() => toggleOperatorReady(m.id)} style={{
                      width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                      background: m.operatorReady ? "#059669" : "#CBD5E1",
                      position: "relative", transition: "background .2s"
                    }}>
                      <span style={{
                        position: "absolute", top: 2, left: m.operatorReady ? 22 : 2,
                        width: 20, height: 20, borderRadius: 10, background: "#fff",
                        boxShadow: "0 1px 3px rgba(0,0,0,.2)", transition: "left .2s"
                      }} />
                    </button>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

