# AVATAR OnE 플랫폼 기능 명세서

Builder → Trainer → 테스트/승인 → 스케줄링 → 결과 조회
전체 워크플로우 기반 기능 명세

| 항목 | 내용 |
|------|------|
| 버전 | 1.4 |
| 작성일 | 2025-02-02 |
| 수정일 | 2026-02-11 |
| 대상 | 고객 전달용 |

---

## 1. 전체 워크플로우

본 플랫폼의 핵심 워크플로우를 다음과 같이 정의한다. 각 단계별 상세 기능은 이후 섹션에서 기술한다.

| 단계 | 이름 | 설명 |
|------|------|------|
| 1 | Builder로 App 개발 | 사용자가 App을 생성하고, App 내 Task를 구성하며, 각 Task에 글로벌 라이브러리의 Component를 배치한다. App → Task → Component 3단계 계층으로 구성되며, 다른 App을 Import하여 해당 App의 Task들을 불러올 수 있다. 구성 완료 시 App 스펙 파일(JSON)이 생성된다. |
| 2 | Trainer에서 학습 요청 (자원 할당 포함) | 사용자가 Trainer 화면에서 개발 완료된 App을 선택하고, 리소스·학습 파라미터를 설정하여 학습 요청을 제출한다. App 선택, 자원 할당, 파라미터 설정, 제출이 Trainer에서 일괄 처리된다. |
| 3 | 테스트 실행 및 승인 (최소 실행 테스트 포함) | 승인이 필요한 모든 워크로드에 대해 최소 실행 테스트를 수행한다. 개별 컴포넌트의 자원 요청량이 임계치 이상이면 관리자 승인 후 실행한다. |
| 4 | 실행 대기열 및 우선순위 관리 | 승인된 워크로드가 실행 대기열에 진입한다. 관리자가 대기 중인 작업의 우선순위를 조정할 수 있다. |
| 5 | 워크로드 실행 및 리소스 모니터링 | 스케줄러가 자원을 할당하여 워크로드를 실행한다. 관리자는 실시간 리소스 현황을 확인한다. |
| 6 | 결과 모델 저장 및 조회 | 워크로드 종료 시 결과 모델이 자동 저장되고, 목록을 통해 조회할 수 있다. |

---

## 2. Builder (App 개발)

### 핵심 개념

Builder는 **GUI 기반 시각적 앱 제작 도구**이다. 결과물은 "App 스펙 파일"이다. App은 **3단계 계층 구조**로 구성된다:
- **App** = 최상위 엔티티 (기존 파이프라인에 해당). 다른 App을 Import하여 해당 App의 Task들을 불러올 수 있다.
- **Task** = App 내 하위 작업 단위. 빈 컨테이너로 생성되며, GUI에서 Component와 연결로 채운다.
- **Component** = Task 내 개별 실행 단위. 각 Component가 하나의 Solver를 실행하며, 독립된 Docker 이미지와 자원 할당을 가진다. 글로벌 라이브러리에서 선택하여 배치한다.

Builder는 **GUI 캔버스 기반**으로 세 개의 탭으로 구성된다:
- **App 관리**: App 생성, Task 추가/관리, App Import (다른 App의 Task 불러오기)
- **Task 편집**: Task 선택 → GUI 캔버스에서 Component 배치 (글로벌 라이브러리에서 선택) 및 연결 관계 시각적 구성
- **워크플로우 시각화**: Task 단위 SVG 다이어그램 미리보기

### 2.1 기능 명세

| ID | 기능명 | 설명 | 우선순위 | 구현 단계 |
|----|--------|------|----------|-----------|
| BL-01 | 컨테이너 이미지 입력 | Component별로 Docker 이미지를 입력한다 (레지스트리 주소, 태그). 글로벌 라이브러리에서 선택 시 이미지가 자동 입력된다. 각 Component는 독립 컨테이너로 실행된다 | P0 | Phase 1 |
| BL-02 | 환경 변수 설정 | 컨테이너 실행 시 필요한 환경 변수를 Key-Value 형식으로 입력한다. 환경 변수는 App 레벨로 모든 Task/Component가 공유한다 | P0 | Phase 1 |
| BL-03 | 컴포넌트 스펙 정의 | Task 내 Component의 스펙을 정의한다 (컨테이너 이미지, GPU 유형/수, 메모리, 파라미터, 실행 순서). Task → Component 계층 반영 | P0 | Phase 1 |
| BL-04 | 스펙 파일 생성 | 입력된 구성을 기반으로 App 스펙 파일(JSON)을 자동 생성한다. 3단계 계층 + training_config + imported_apps 반영. 이 파일이 곧 워크로드 실행의 기준이 된다 | P0 | Phase 1 |
| BL-05 | 스펙 파일 조회 | 생성된 App 스펙 파일 목록을 조회하고 상세 내용을 확인한다. Task 수, Component 수, 최대 자원 요약을 표시한다 | P0 | Phase 1 |
| BL-06 | 컴포넌트별 자원 할당 | 각 Component에 GPU 유형, GPU 수, 메모리를 독립적으로 할당한다. Component별 임계치 초과 여부를 실시간 표시한다 | P0 | Phase 1 |
| BL-07 | 워크플로우 구성 | GUI 캔버스에서 Task 내 Component 간 연결 관계를 시각적으로 구성하고, 실행 순서를 조정할 수 있다. Task 단위로 분리됨 | P0 | Phase 1 |
| BL-08 | 워크플로우 시각화 | 정의된 워크플로우를 Task 단위 SVG 다이어그램으로 실시간 미리보기한다. 방향 화살표 표시 | P0 | Phase 1 |
| BL-09 | 워크플로우 유효성 검증 | 순환 참조(cycle) 감지, 자기 참조(self-loop) 방지, 중복 연결 방지. 유효성 위반 시 오류 메시지 표시. Task 내 워크플로우에 적용 | P0 | Phase 1 |
| BL-10 | Task CRUD | App 관리 탭에서 Task를 추가, 편집, 삭제할 수 있다. Task는 Component의 논리적 그룹이다 | P0 | Phase 1 |
| BL-11 | Component 배치 | Task 편집 탭에서 글로벌 라이브러리의 Component를 선택하여 Task에 배치한다. 라이브러리 참조 ID를 유지한다 | P0 | Phase 1 |
| BL-12 | App Import (앱 가져오기) | Builder에서 다른 App을 Import하면 해당 App에 포함된 Task들이 현재 App의 Task 목록에 불러와진다. Import된 Task는 원본 App에 대한 참조(imported_from)를 유지한다 | P0 | Phase 1 |

### 2.2 스펙 파일 구조 (예시)

스펙 파일은 다음과 같은 구조로 구성된다. 이 파일이 곧 워크로드 실행의 기준이 된다:

| 필드 | 설명 |
|------|------|
| app_id | App 고유 식별자 |
| version | 스펙 파일 버전 |
| env_vars | 환경 변수 목록 (Key-Value). App 레벨로 모든 Task/Component가 공유 |
| tasks[] | Task 목록: 각 Task의 ID, 이름, components[], workflow[] (아래 상세) |
| imported_apps[] | Import된 App 목록 (app_ref, name). Import 시 해당 App의 Task들이 tasks[]에 추가됨 |
| training_config | 학습 설정 (에피소드, 학습률, 보상 파라미터, 환경 설정 등) |
| storage | 저장소 설정 |
| created_at | 생성 일시 |
| test_run_ref | 테스트 실행 결과 참조 (run ID, 선택 사항) |

#### tasks[] 항목 구조

| 필드 | 설명 |
|------|------|
| task_id | Task 고유 식별자 (TASK-xxx) |
| name | Task 이름 |
| imported_from | Import 원본 App ID (직접 생성 Task는 null) |
| components[] | Task 내 Component 목록 (아래 상세) |
| workflow[] | Task 내 Component 간 실행 의존 관계 (from → to 엣지 목록) |

#### components[] 항목 구조

| 필드 | 설명 |
|------|------|
| component_id | 글로벌 라이브러리 참조 ID |
| name | 컴포넌트 이름 |
| image | 컨테이너 이미지 정보 (registry, tag) |
| resources | 필요 자원량 (gpu_type, gpu_count, memory) |
| params | 컴포넌트 파라미터 |

#### 스펙 파일 예시

```json
{
  "app_id": "APP-A1B2C3",
  "name": "RL-DesignOpt-v1",
  "version": "1.0.0",
  "env_vars": {
    "NCCL_DEBUG": "INFO",
    "CUDA_VISIBLE_DEVICES": "all"
  },
  "tasks": [
    {
      "task_id": "TASK-001",
      "name": "parameter-optimization",
      "imported_from": null,
      "components": [
        {
          "component_id": "CL-REF-001",
          "name": "env-simulator",
          "image": { "registry": "registry.avatar.io/env-sim", "tag": "1.0" },
          "resources": { "gpu_type": "A100", "gpu_count": 2, "memory": "64GB" },
          "params": {}
        },
        {
          "component_id": "CL-REF-002",
          "name": "rl-agent",
          "image": { "registry": "registry.avatar.io/rl-agent", "tag": "2.0" },
          "resources": { "gpu_type": "A100", "gpu_count": 4, "memory": "128GB" },
          "params": { "lr": 0.001, "episodes": 1000 }
        },
        {
          "component_id": "CL-REF-003",
          "name": "reward-calc",
          "image": { "registry": "registry.avatar.io/reward-calc", "tag": "1.0" },
          "resources": { "gpu_type": "V100", "gpu_count": 1, "memory": "16GB" },
          "params": {}
        },
        {
          "component_id": "CL-REF-004",
          "name": "param-optimizer",
          "image": { "registry": "registry.avatar.io/param-opt", "tag": "1.5" },
          "resources": { "gpu_type": "A100", "gpu_count": 2, "memory": "64GB" },
          "params": {}
        }
      ],
      "workflow": [
        { "from": "CL-REF-001", "to": "CL-REF-002" },
        { "from": "CL-REF-002", "to": "CL-REF-003" },
        { "from": "CL-REF-003", "to": "CL-REF-004" }
      ]
    },
    {
      "task_id": "TASK-002",
      "name": "data-preprocessing",
      "imported_from": "APP-XYZ",
      "components": [
        {
          "component_id": "CL-REF-010",
          "name": "data-loader",
          "image": { "registry": "registry.avatar.io/data-loader", "tag": "1.0" },
          "resources": { "gpu_type": "V100", "gpu_count": 1, "memory": "32GB" },
          "params": {}
        }
      ],
      "workflow": []
    }
  ],
  "imported_apps": [
    { "app_ref": "APP-XYZ", "name": "PreProcessor-App" }
  ],
  "training_config": {
    "episodes": 1000,
    "learning_rate": 0.001,
    "batch_size": 64,
    "gamma": 0.99,
    "max_steps_per_episode": 500,
    "reward_params": {
      "efficiency_weight": 0.6,
      "safety_weight": 0.4
    },
    "env_config": {
      "simulation_seed": 42,
      "max_temp": 850,
      "min_pressure": 10
    }
  },
  "storage": {
    "type": "distributed",
    "path": "/training-data/rl-design-opt-v1"
  },
  "created_at": "2026-02-09T09:00:00.000Z"
}
```

---

## 3. 컴포넌트 글로벌 라이브러리

시스템 전역에서 재사용 가능한 컴포넌트를 등록·관리하는 카탈로그이다. Builder의 Task 편집 시 글로벌 라이브러리에서 컴포넌트를 선택하여 배치한다.

### 3.1 기능 명세

| ID | 기능명 | 설명 | 우선순위 | 구현 단계 |
|----|--------|------|----------|-----------|
| CL-01 | 컴포넌트 등록 | 글로벌 라이브러리에 새 컴포넌트를 등록한다 (이름, Docker 이미지, 설명, 버전) | P0 | Phase 1 |
| CL-02 | 컴포넌트 목록 조회 | 등록된 전체 컴포넌트 목록을 조회한다 (검색, 필터링 지원) | P0 | Phase 1 |
| CL-03 | 컴포넌트 상세 조회 | 컴포넌트의 상세 정보를 확인한다 (사용 이력, 버전 정보 포함) | P0 | Phase 1 |
| CL-04 | 컴포넌트 수정 | 등록된 컴포넌트의 정보를 수정한다 | P0 | Phase 1 |
| CL-05 | 컴포넌트 버전 관리 | 동일 컴포넌트의 버전 이력을 관리한다 | P1 | Phase 2 |
| CL-06 | 컴포넌트 재사용 | 라이브러리에서 컴포넌트를 선택하여 Task에 배치한다 | P0 | Phase 1 |

### 3.2 컴포넌트 속성

| 속성 | 설명 |
|------|------|
| name | 컴포넌트 이름 |
| image | Docker 이미지 (registry + tag) |
| description | 설명 |
| version | 버전 |
| created_at | 등록 일시 |
| used_in | 사용 중인 App/Task 목록 (참조) |

---

## 4. Trainer (학습 요청)

개발 완료된 App에 대해 학습 파라미터와 리소스를 설정하여 학습 요청을 제출하는 전용 화면이다. Builder와 완전 분리된 별도 화면으로 운영된다. App 선택, 자원 할당, 학습 파라미터 설정, 요청 제출을 Trainer에서 일괄 처리한다.

### 4.1 기능 명세

| ID | 기능명 | 설명 | 우선순위 | 구현 단계 |
|----|--------|------|----------|-----------|
| TR-01 | 완료된 App 선택 | 학습 요청을 위해 개발 완료된(status=ready) App을 선택한다 | P0 | Phase 1 |
| TR-02 | 리소스 요청 | 학습에 필요한 GPU 유형, GPU 수, 메모리, 최대 실행 시간을 요청한다. App의 Component 최대값으로 자동 입력 | P0 | Phase 1 |
| TR-03 | 학습 파라미터 설정 | 에피소드 수, 학습률, 배치 크기, 감가율(gamma), 최대 스텝/에피소드 등 학습 파라미터를 설정한다 | P0 | Phase 1 |
| TR-04 | 환경 설정 | RL 환경 시뮬레이터의 구성을 설정한다 (환경 변수, 시뮬레이션 파라미터, 시뮬레이션 시드) | P0 | Phase 1 |
| TR-05 | 보상 함수 파라미터 | 보상 함수의 가중치와 파라미터를 설정한다 (목표 조건 설정 포함) | P0 | Phase 1 |
| TR-06 | 학습 요청 제출 | App + 리소스 + 학습 파라미터를 묶어 학습 요청을 제출한다. 기존 승인 프로세스에 진입 | P0 | Phase 1 |
| TR-07 | 학습 이력 조회 | 제출된 학습 요청의 이력과 상태를 조회한다 (대기, 승인대기, 실행 중, 완료) | P0 | Phase 1 |
| TR-08 | 학습 결과 비교 | 여러 학습 결과의 성능 메트릭을 비교한다 | P1 | Phase 2 |

### 4.2 RL 학습 파라미터

| 파라미터 | 설명 | 기본값 |
|----------|------|--------|
| 에피소드 수 (episodes) | 총 학습 에피소드 수 | 1000 |
| 학습률 (learning_rate) | 정책 네트워크 학습률 | 0.001 |
| 배치 크기 (batch_size) | 미니배치 크기 | 64 |
| 감가율 (gamma) | 미래 보상 할인율 | 0.99 |
| 최대 스텝/에피소드 (max_steps_per_episode) | 에피소드당 최대 스텝 수 | 500 |
| 환경 설정 (env_config) | 시뮬레이터 구성 파라미터 (JSON) | {} |
| 보상 파라미터 (reward_params) | 보상 함수 가중치/파라미터 (Key-Value) | {} |

### 4.3 워크로드 데이터 구조 확장

학습 요청 제출 시 기존 워크로드 데이터에 다음 필드가 추가된다:

| 필드 | 설명 | 비고 |
|------|------|------|
| isTrainingRequest | 학습 요청 여부 (boolean) | 추가 |
| trainingConfig | 학습 설정 객체 | 추가 |
| trainingConfig.episodes | 에피소드 수 | 추가 |
| trainingConfig.learningRate | 학습률 | 추가 |
| trainingConfig.batchSize | 배치 크기 | 추가 |
| trainingConfig.gamma | 감가율 | 추가 |
| trainingConfig.maxStepsPerEpisode | 최대 스텝/에피소드 | 추가 |
| trainingConfig.envConfig | 환경 설정 (JSON) | 추가 |
| trainingConfig.rewardParams | 보상 함수 파라미터 | 추가 |

---

## 5. 테스트 및 승인

### 테스트 및 승인 프로세스 개요

> **테스트 및 승인 프로세스 개요**
>
> Trainer에서 제출된 학습 요청은 승인 프로세스에 진입한다. 승인이 필요한(needsApproval) 모든 워크로드에 대해 최소 실행 테스트를 수행한다. App 개발자가 테스트 결과를 학습 요청에 첨부할 수 있으며, 관리자도 자체적으로 테스트를 실행할 수 있다. 개별 컴포넌트의 자원 요청량이 설정된 임계치 이상인 경우 관리자 승인 후 실행되며, 임계치 미만이면 즉시 실행된다. 자동 승인(임계치 미만) 워크로드에는 최소 실행 테스트가 적용되지 않는다.

**자원 임계치 승인 기준:** App을 구성하는 개별 컴포넌트 중, 어느 하나라도 GPU >= 4기 또는 메모리 >= 128GB이면 관리자 승인이 필요하다.

### 5.1 기능 명세

| ID | 기능명 | 설명 | 우선순위 | 구현 단계 |
|----|--------|------|----------|-----------|
| AP-01 | 학습 요청 목록 조회 | Trainer에서 제출된 App 학습 요청 목록을 조회한다 (상태: 대기/승인대기/승인/반려) | P0 | Phase 1 |
| AP-02 | 요청 상세 검토 | App 스펙 파일 내용, 요청 자원량, 신청자 정보를 상세히 확인한다 | P0 | Phase 1 |
| AP-03 | 테스트 실행 | 최소 실행 테스트: 모든 needsApproval 워크로드에 대해 최소 실행 테스트를 수행한다. RL 워크로드는 최소 에피소드 실행 + 수렴 확인, 일반 워크로드는 최소 반복 실행 + 성공/실패 검증 | P0 | Phase 1 |
| AP-04 | 테스트 결과 확인 | 최소 실행 테스트 결과 확인: RL은 에피소드별 보상 추이·수렴 그래프·최종 성능 지표, 일반은 반복 실행 로그·성공률·평균 실행 시간 표시 | P0 | Phase 1 |
| AP-05 | 승인/반려 처리 | 개별 컴포넌트의 자원 요청량이 임계치 이상이면 관리자 승인 후 실행 대기열에 진입. 최소 실행 테스트 통과가 승인 전제 조건으로 추가됨. 테스트 미실행 시 승인 불가 (경고 표시). 임계치 미만이면 즉시 실행. 반려 시 사유를 코멘트로 기록한다 | P0 | Phase 1 |

### 5.2 최소 실행 테스트 상세

#### 워크로드 유형별 테스트 로직

| 구분 | RL 학습 요청 (isTrainingRequest=true) | 일반 워크로드 |
|------|---------------------------------------|--------------|
| 테스트 내용 | 최소 에피소드 실행 | 최소 반복 실행 |
| 검증 기준 | 수렴 여부 확인 | 성공/실패 검증 |
| 결과 표시 | 에피소드별 보상 추이, 수렴 그래프, 최종 성능 지표 | 반복 실행 로그, 성공률, 평균 실행 시간 |

#### 테스트 결과 상태

| 상태 | 설명 |
|------|------|
| pending | 테스트 미실행 |
| running | 테스트 실행 중 |
| passed | 테스트 통과 |
| failed | 테스트 실패 |

#### 추가 규칙

- App 개발자가 테스트 결과를 학습 요청에 첨부 가능
- 관리자도 자체적으로 테스트 실행 가능
- 테스트 미실행 시 승인 버튼에 경고 표시 ("테스트 필요")
- 테스트 "통과(passed)" 시에만 승인 가능
- 자동 승인(임계치 미만) 워크로드에는 최소 실행 테스트가 적용되지 않음

#### loopTest 데이터 구조

needsApproval 워크로드에 자동 추가되는 필드:

```json
{
  "loopTest": {
    "status": "pending",
    "episodes": null,
    "results": null,
    "executedBy": null,
    "executedAt": null
  }
}
```

테스트 완료 후 (RL 워크로드 예시):

```json
{
  "loopTest": {
    "status": "passed",
    "episodes": 10,
    "results": {
      "convergence": true,
      "avgReward": 85.3,
      "finalReward": 92.1,
      "log": "Episode 1: reward=72.1\nEpisode 2: reward=78.5\n..."
    },
    "executedBy": "admin",
    "executedAt": "2026-02-09 14:30"
  }
}
```

테스트 완료 후 (일반 워크로드 예시):

```json
{
  "loopTest": {
    "status": "passed",
    "episodes": 5,
    "results": {
      "successRate": "100%",
      "avgDuration": "0.34s",
      "log": "Run 1: SUCCESS (0.32s)\nRun 2: SUCCESS (0.36s)\n..."
    },
    "executedBy": "admin",
    "executedAt": "2026-02-09 14:35"
  }
}
```

---

## 6. 실행 대기열 및 우선순위 관리

### 운영 범위

현재 실행 중인 App을 강제 종료할 필요는 없다. 관리자는 대기 중인 App 대기열에서 우선순위를 조정하여 실행 순서를 결정한다. 우선순위는 App 레벨로 관리한다.

| ID | 기능명 | 설명 | 우선순위 | 구현 단계 |
|----|--------|------|----------|-----------|
| QU-01 | 대기열 목록 조회 | 실행 대기 중인 워크로드 목록을 현재 우선순위 순서로 조회한다 | P0 | Phase 1 |
| QU-02 | 우선순위 표시 | 각 대기 워크로드의 현재 우선순위, 요청 자원량, 신청자, 신청일시를 표시한다 | P0 | Phase 1 |
| QU-03 | 우선순위 조정 | 관리자가 대기 중인 워크로드의 우선순위를 변경하여 실행 순서를 조정한다 | P0 | Phase 1 |
| QU-04 | 워크로드 상태 표시 | 각 워크로드의 상태를 표시한다 (대기, 실행 중, 완료, 실패, 취소) | P0 | Phase 1 |
| QU-05 | 요청 자원량 표시 | 각 대기 워크로드가 요청한 GPU 수/유형, 메모리, CPU 정보를 함께 표시한다 | P0 | Phase 1 |

### 6.1 대기열 조회 화면 구성 (예시)

| 순서 | 워크로드명 | 우선순위 | 요청 자원 | 신청자 | 상태 | 신청일시 |
|------|-----------|----------|-----------|--------|------|----------|
| 1 | RL-DesignOpt-v1 | 높음 | A100 x 4, 128GB | 김연구원 | 대기 | 2025-02-01 |
| 2 | ResNet-Exp-42 | 보통 | V100 x 2, 64GB | 박연구원 | 대기 | 2025-02-01 |
| 3 | DataPrep-Batch | 낮음 | CPU x 8, 32GB | 이연구원 | 대기 | 2025-02-02 |

---

## 7. 리소스 관리

### 7.1 리소스 현황 조회

| ID | 기능명 | 설명 | 우선순위 | 구현 단계 |
|----|--------|------|----------|-----------|
| RS-01 | 전체 리소스 현황 | 클러스터 전체 리소스의 요청량 / 사용량 / 유휴량을 조회한다 | P0 | Phase 1 |
| RS-02 | GPU 현황 | GPU별 상태를 조회한다: 총 수량, 할당된 수량(요청량), 실제 사용량, 유휴 수량 | P0 | Phase 1 |
| RS-03 | 메모리 현황 | 전체 메모리의 요청량 / 사용량 / 유휴량을 조회한다 | P0 | Phase 1 |
| RS-04 | 노드 상태 | 각 노드의 상태(Active/Drain/Down)와 자원 현황을 확인한다 | P0 | Phase 1 |
| RS-05 | 워크로드별 자원 사용량 | 현재 실행 중인 워크로드별 실제 자원 사용량을 확인한다 | P0 | Phase 1 |
| RS-06 | 사용량 추이 차트 | 시간대별 리소스 사용량 추이를 차트로 표시한다 | P1 | Phase 2 |

### 7.2 리소스 현황 화면 구성 (예시)

| 리소스 | 총 수량 | 요청량 (할당) | 실제 사용량 | 유휴량 |
|--------|---------|---------------|-------------|--------|
| GPU (A100) | 16기 | 12기 | 10기 (62.5%) | 4기 |
| GPU (V100) | 8기 | 6기 | 6기 (75.0%) | 2기 |
| 메모리 | 2,048 GB | 1,536 GB | 1,200 GB (58.6%) | 512 GB |
| CPU | 256 코어 | 180 코어 | 140 코어 (54.7%) | 76 코어 |

---

## 8. 결과 모델 관리

| ID | 기능명 | 설명 | 우선순위 | 구현 단계 |
|----|--------|------|----------|-----------|
| MD-01 | 결과 모델 자동 저장 | 워크로드 종료 시 학습된 모델 아티팩트를 자동으로 모델 저장소에 저장한다 | P0 | Phase 1 |
| MD-02 | 모델 목록 조회 | 저장된 모델 목록을 조회한다 (모델명, 워크로드 참조, 생성일시, 크기) | P0 | Phase 1 |
| MD-03 | 모델 상세 조회 | 모델의 상세 정보를 확인한다: 원본 스펙 파일, 학습 구성, 실행 로그, 생성 메타데이터 | P0 | Phase 1 |
| MD-04 | 모델 다운로드 | 저장된 모델 아티팩트를 다운로드한다 | P0 | Phase 1 |
| MD-05 | 모델 버전 관리 | 동일 App에서 생성된 모델들의 버전 이력을 관리한다 | P1 | Phase 2 |
| MD-06 | 모델 비교 | 여러 모델의 성능 메트릭을 나란히 비교한다 | P1 | Phase 2 |

### 8.1 모델 목록 화면 구성 (예시)

| 모델명 | 원본 워크로드 | 생성일시 | 크기 | 상태 | 작업 |
|--------|-------------|----------|------|------|------|
| rl-design-opt-v1-final | RL-DesignOpt-v1 | 2025-02-02 | 14.2 GB | 완료 | 조회 \| 다운로드 |
| resnet-exp42-ep50 | ResNet-Exp-42 | 2025-02-01 | 380 MB | 완료 | 조회 \| 다운로드 |

---

## 9. 워크로드 스케줄링 (HPC)

승인된 워크로드를 실제 HPC 인프라에서 실행하는 계층이다. 대기열의 우선순위와 자원 가용성에 따라 자동으로 자원을 할당하고 App을 실행한다.

| ID | 기능명 | 설명 | 우선순위 | 구현 단계 |
|----|--------|------|----------|-----------|
| SC-01 | 우선순위 기반 실행 | 대기열의 우선순위 순서대로 자원이 확보되면 자동 실행한다 | P0 | Phase 1 |
| SC-02 | GPU 할당 | 요청된 수량과 유형의 GPU를 워크로드에 할당한다 | P0 | Phase 1 |
| SC-03 | 작업 상태 추적 | 워크로드 수명주기 추적: 대기 → 실행 중 → 완료/실패 | P0 | Phase 1 |
| SC-04 | 모델 자동 저장 트리거 | 워크로드 정상 종료 시 결과 모델을 자동으로 모델 저장소에 저장한다 | P0 | Phase 1 |
| SC-05 | 로그 수집 | 실행 중 및 종료 후 워크로드 로그를 수집하여 조회 가능하게 한다 | P0 | Phase 1 |
| SC-06 | GPU 파티셔닝 | HAMi를 활용한 단일 GPU 메모리/코어 수준 분할 (개발/추론 용도) | P1 | Phase 2 |

---

## 10. 저장소

| ID | 기능명 | 설명 | 우선순위 | 구현 단계 |
|----|--------|------|----------|-----------|
| ST-01 | 스펙 파일 저장소 | Builder가 생성한 App 스펙 파일(JSON)을 저장한다 | P0 | Phase 1 |
| ST-02 | 모델 저장소 | 워크로드 결과 모델 아티팩트를 저장하고 관리한다 | P0 | Phase 1 |
| ST-03 | 테스트 실행 저장소 | 테스트 실행 결과 및 참조 데이터를 저장한다 | P0 | Phase 1 |
| ST-04 | 실행 로그 저장소 | 워크로드 실행 로그를 수집하고 저장한다 | P0 | Phase 1 |
| ST-05 | 분석 결과 저장소 | Operator 분석 결과를 저장하고 관리한다 | P1 | Phase 2 |

---

## 11. 권한 관리 및 인증

| ID | 기능명 | 설명 | 우선순위 | 구현 단계 |
|----|--------|------|----------|-----------|
| AU-01 | 역할 기반 접근 제어 | 관리자 / 연구원 / 뷰어 역할별 권한을 부여한다 | P0 | Phase 1 |
| AU-02 | 사용자 계정 관리 | 사용자 계정의 생성, 수정, 비활성화를 관리한다 | P0 | Phase 1 |
| AU-03 | API 인증 | 토큰 기반 API 인증 및 SSO 연동 (OIDC/SAML) | P1 | Phase 2 |
| AU-04 | 감사 로깅 | 모든 사용자 행위에 대한 감사 추적 기록 | P1 | Phase 2 |

---

## 12. 권장 기술 스택 및 구현 로드맵

### 12.1 권장 기술 스택

| 계층 | 기술 | 선정 근거 |
|------|------|-----------|
| 컨테이너 오케스트레이션 | Kubernetes | HPC/ML 워크로드 관리의 사실상 표준 |
| 작업 스케줄링 | Airflow + K8s | Airflow로 App 우선순위 관리, KubernetesPodOperator로 태스크 실행 |
| GPU 파티셔닝 | HAMi | 오픈소스 GPU 메모리/코어 분할 (개발/추론 용도) |
| 모니터링 | Prometheus + Grafana + DCGM | 메트릭 수집 및 GPU 모니터링 업계 표준 |
| 저장소 (모델) | S3 호환 객체 스토리지 | 확장 가능한 모델/결과물 아티팩트 저장 |
| 저장소 (학습 데이터) | Ceph | 통합 분산 스토리지 (블록/객체/파일 통합 지원) |
| 플랫폼 백엔드 | FastAPI (Python) | Python ML 생태계 통합, 비동기 API 서버 |
| 플랫폼 프론트엔드 | React + TypeScript | 인터랙티브 관리 화면 및 사용자 UI |
| 데이터베이스 | PostgreSQL | 구성/메타데이터/감사 로그 저장 |
| 인증 | Keycloak | OIDC/SAML 지원 엔터프라이즈 SSO |

### 12.2 구현 로드맵

#### Phase 1: 핵심 워크플로우 (0~2개월)

전체 워크플로우의 기본 형상을 완성한다. Builder로 App을 개발하고, Trainer에서 학습 요청, 테스트 실행, 관리자 승인, 대기열 관리, 실행, 결과 모델 조회까지 전체 흐름이 동작한다.

- Builder: App → Task → Component 3단계 계층 구조, GUI 캔버스 기반 Component 배치 + 자원 할당 + 환경 변수 + 워크플로우 구성 → App 스펙 파일(JSON) 생성 (BL-01~BL-12)
- 3단계 계층 구조: App → Task → Component 계층 (BL-10, BL-11)
- App Import: Builder에서 다른 App의 Task 가져오기 (BL-12)
- 컴포넌트 글로벌 라이브러리: 컴포넌트 등록, 목록 조회, 상세 조회, 수정, 재사용 (CL-01~CL-04, CL-06)
- Trainer 화면: App 선택, 리소스 요청, 학습 파라미터 설정, 학습 요청 제출, 이력 조회 (TR-01~TR-07)
- 최소 실행 테스트: 모든 needsApproval 워크로드 대상 실행 테스트 필수화
- 승인: 요청 검토 → 최소 실행 테스트 통과 확인 → 컴포넌트별 자원 임계치 확인 → 승인/반려/즉시실행
- 대기열: 우선순위 조회/조정, 요청 자원량 표시
- 스케줄링: 우선순위 기반 자동 실행, GPU 할당
- 리소스: 요청량/사용량/유휴량 현황 조회
- 결과: 모델 자동 저장, 목록 조회, 상세 확인, 다운로드

#### Phase 2: 고도화 (2~4개월)

Builder 고도화, 고급 스케줄링, Operator 통합 등을 추가한다. Phase 1 기반 피드백을 반영한다.

- 컴포넌트 버전 관리(CL-05) 고도화
- 학습 결과 비교(TR-08)
- Operator 통합: 워크로드 요청 시 Operator 업로드, 분석 결과 저장/조회
- 고급 스케줄링: GPU 파티셔닝 (HAMi)
- 모델 관리: 버전 관리, 모델 비교 등
- 감사: 사용자 행위 감사 로깅
