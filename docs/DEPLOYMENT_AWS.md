**Last Updated:** 2026-04-24

# LearnOS — AWS Deployment Architecture

Concrete deployment plan mapping the LearnOS stack (described in [ARCHITECTURE.md](ARCHITECTURE.md)) to AWS services, with the frontend on **AWS Amplify Hosting** and the backend on **Amazon ECS on Fargate** (images in **Amazon ECR**). Supabase remains the system of record — we're not migrating PostgreSQL/Auth/Storage to AWS.

Contents:
1. [High-level diagram](#1-high-level-diagram)
2. [Service mapping (what lives where)](#2-service-mapping-what-lives-where)
3. [Frontend — AWS Amplify Hosting](#3-frontend--aws-amplify-hosting)
4. [Backend — ECR + ECS on Fargate](#4-backend--ecr--ecs-on-fargate)
5. [Networking — VPC, ALB, Route 53, ACM](#5-networking--vpc-alb-route-53-acm)
6. [WebSocket & SSE considerations](#6-websocket--sse-considerations)
7. [Secrets & configuration](#7-secrets--configuration)
8. [Caching — ElastiCache Redis](#8-caching--elasticache-redis)
9. [Observability — CloudWatch, logs, alarms](#9-observability--cloudwatch-logs-alarms)
10. [CI/CD pipeline](#10-cicd-pipeline)
11. [IAM & security posture](#11-iam--security-posture)
12. [Scaling plan](#12-scaling-plan)
13. [Cost sketch](#13-cost-sketch)
14. [Disaster recovery & rollback](#14-disaster-recovery--rollback)
15. [Step-by-step bootstrap checklist](#15-step-by-step-bootstrap-checklist)

---

## 1. High-level diagram

```
                           Internet
                              │
               ┌──────────────┼───────────────┐
               │              │               │
               ▼              ▼               ▼
   ┌────────────────┐   ┌──────────────┐   ┌──────────────────┐
   │  AWS Amplify   │   │  Route 53    │   │  Supabase cloud  │
   │  Hosting       │   │  (DNS)       │   │  (not in AWS)    │
   │  Next.js SPA   │   │  + ACM certs │   │  PG+Auth+Storage │
   └────────┬───────┘   └──────┬───────┘   │  + Realtime      │
            │                  │           └──────────────────┘
            │                  │
            │  HTTPS /api/*    │
            │  (edge domain →  │
            │   ALB CNAME)     ▼
            │        ┌────────────────────┐
            │        │ Application Load   │
            │        │ Balancer (HTTPS +  │
            │        │ WSS sticky)        │
            │        │ idle timeout 3600s │
            │        └──────────┬─────────┘
            │                   │
            ▼                   ▼
         ┌──────── private subnets ───────────────────────┐
         │                                                │
         │   ┌──────────────────────┐    ┌─────────────┐  │
         │   │  ECS Fargate service │    │ ElastiCache │  │
         │   │  (LearnOS FastAPI)   │───►│ Redis (t4g) │  │
         │   │  Task image in ECR   │    └─────────────┘  │
         │   │  N tasks, each 2 vCPU│                      │
         │   │  /4 GB, 2 workers    │                      │
         │   └──────────┬───────────┘                      │
         │              │                                   │
         │              ▼                                   │
         │   ┌──────────────────────┐                       │
         │   │  Secrets Manager     │                       │
         │   │  (per-key secrets)   │                       │
         │   └──────────────────────┘                       │
         └──────────────────────────────────────────────────┘
                        │
                        ▼   outbound via NAT to:
        Anthropic · Gemini Live (WSS) · OpenAI · YouTube Data API
        Supabase PG (asyncpg over TLS) · Supabase Auth / Storage APIs
```

Notes visible in the diagram:
- **Frontend** (Amplify) and **backend** (ECS) are public-facing via HTTPS; ECS is reachable only through the ALB.
- **Redis** and **ECS tasks** live in private subnets; outbound traffic to AI vendors goes via a NAT gateway.
- **Supabase stays Supabase-hosted** — the DB is not migrated to RDS. Moving it would lose the Auth + Storage + Realtime stack we depend on.

---

## 2. Service mapping (what lives where)

| LearnOS component | AWS service (or external) | Notes |
|---|---|---|
| Next.js 14 SPA | **AWS Amplify Hosting** | Builds from GitHub; serves the app behind CloudFront. SSR / Route Handlers supported. |
| `/api/proxy/[...]` Next.js route | Amplify | Forwards to the backend (set via `NEXT_PUBLIC_API_URL`). |
| FastAPI backend | **ECS Fargate service** in a cluster | Container image in ECR, 2 vCPU / 4 GB tasks, `uvicorn app.main:app --workers 2`. |
| Container registry | **Amazon ECR** | Private repo `learnos/backend`. |
| Public HTTPS + WSS entry | **Application Load Balancer** (internet-facing) | TLS termination with ACM cert; HTTP→HTTPS redirect; sticky sessions disabled but idle timeout raised for WS. |
| DNS | **Route 53** | `learnos.app` (marketing), `app.learnos.app` → Amplify, `api.learnos.app` → ALB. |
| TLS certificates | **AWS Certificate Manager (ACM)** | Separate certs for ALB region and CloudFront/Amplify (us-east-1). |
| Secrets | **AWS Secrets Manager** | All `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `YOUTUBE_DATA_API_KEY`, `SUPABASE_*`. Loaded at task start via ECS `secrets` property. |
| Cache / rate-limit backing store | **ElastiCache for Redis** (single-node t4g.micro in dev, replicated in prod) | slowapi needs it; also caches YouTube lookups if we move that out of the in-process cache. |
| Logs | **CloudWatch Logs** | One log group per service; awslogs driver on the task definition. |
| Metrics + alarms | **CloudWatch Metrics + Alarms** | Per-task CPU/mem, ALB 5xx rate, latency p95. |
| CI/CD | **GitHub Actions → ECR + ECS** (backend), **Amplify autodeploy** (frontend) | Two separate pipelines. |
| Database / Auth / Storage / Realtime | **Supabase cloud** (not AWS) | Connection over TLS; connection string held in Secrets Manager. |

---

## 3. Frontend — AWS Amplify Hosting

### 3.1 Why Amplify (not S3+CloudFront manually)
Next.js App Router needs SSR / Route Handlers (we use `/api/proxy/[...]` so the browser doesn't deal with CORS on the backend). Amplify Hosting supports Next.js SSR out of the box — we don't have to run Lambda@Edge functions ourselves.

### 3.2 Amplify app settings
- **Branch mapping:**
  - `main` → `app.learnos.app` (production)
  - `staging` → `staging.app.learnos.app` (preview)
  - PRs → ephemeral preview URLs
- **Build image:** default Amazon Linux 2023 Node 20.
- **Monorepo root:** `frontend/`.
- **Build spec (`amplify.yml`):**
  ```yaml
  version: 1
  applications:
    - appRoot: frontend
      frontend:
        phases:
          preBuild:
            commands:
              - npm ci
          build:
            commands:
              - npm run build
        artifacts:
          baseDirectory: .next
          files:
            - '**/*'
        cache:
          paths:
            - node_modules/**/*
            - .next/cache/**/*
  ```

### 3.3 Environment variables (Amplify → App settings → Environment variables)

| Variable | Value | Scope |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` | All branches |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ…` (public anon key) | All branches |
| `NEXT_PUBLIC_API_URL` | `https://api.learnos.app` (prod) / `https://api.staging.learnos.app` (staging) | Per-branch |
| `NEXT_PUBLIC_BACKEND_WS_URL` | `wss://api.learnos.app` | Per-branch |

Note: `NEXT_PUBLIC_*` values are visible to the client, which is correct — they're not secrets. The anon key is RLS-gated and meant to be public.

### 3.4 Header size workaround in dev → no change needed on Amplify
The `cross-env NODE_OPTIONS=--max-http-header-size=65536` flag is only for the dev server. Amplify's production runtime already handles large Supabase SSR cookies.

### 3.5 Custom domain
Route 53 hosted zone for `learnos.app`. In Amplify, add custom domain → choose the Route 53 hosted zone → Amplify auto-creates the validation CNAME and the final `app.learnos.app → dXXX.cloudfront.net` record.

---

## 4. Backend — ECR + ECS on Fargate

### 4.1 Dockerfile (already exists at `backend/Dockerfile`)
Key properties for a production image:
- Base: `python:3.11-slim`
- Non-root user
- Multi-stage (builder installs, runtime copies `site-packages`)
- `EXPOSE 8000`
- `CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--proxy-headers", "--forwarded-allow-ips=*"]`
- `--proxy-headers` is required because we sit behind an ALB; without it, `request.client.host` would be the ALB subnet IP, not the real client.

### 4.2 ECR
- Single private repository: `learnos/backend`.
- Image tags: `sha-<shortsha>` (immutable) + `latest-main` floating tag.
- Lifecycle policy: keep 30 most-recent `sha-*` images; expire untagged after 7 days.

### 4.3 ECS cluster & task definition

**Cluster:** `learnos-prod` (Fargate).

**Task definition** (`learnos-backend` family, version bumped on every deploy):

| Property | Value |
|---|---|
| Launch type | Fargate |
| Operating system | Linux/X86_64 (or ARM64 with graviton for ~20% cost saving if all wheels support it) |
| CPU | 2048 (2 vCPU) |
| Memory | 4096 MB |
| Network mode | `awsvpc` |
| Task IAM role | `learnos-ecs-task-role` — allows `secretsmanager:GetSecretValue` for the LearnOS secrets prefix; `logs:CreateLogStream`/`PutLogEvents` |
| Execution IAM role | `ecsTaskExecutionRole` (AWS-managed, pulls from ECR + logs) |
| Container `backend` | image `learnos/backend:sha-<...>`, port 8000, essential = true |
| Log config | `awslogs` driver → `/ecs/learnos-backend` |
| Env | `REDIS_URL=redis://<elasticache-endpoint>:6379`, `API_HOST=0.0.0.0`, `API_PORT=8000`, `CORS_ORIGINS=["https://app.learnos.app"]` |
| Secrets | loaded from Secrets Manager (see §7) |
| Health check | `CMD-SHELL curl -f http://localhost:8000/api/voice/gemini/health || exit 1` every 30s, 10s timeout, 3 retries, 60s start period |

**Service:** `learnos-backend-svc`
- Desired count: 2 (prod), 1 (staging)
- Deployment: rolling with `minimumHealthyPercent=100`, `maximumPercent=200`
- Load balancer: target group on port 8000, protocol HTTP
- Platform version: latest
- Service discovery: optional — we don't need internal DNS because only the ALB talks to the tasks
- Auto-scaling: target tracking on `ECSServiceAverageCPUUtilization` = 60 %, min 2, max 10

### 4.4 Networking for tasks
- Placed in **private subnets** across at least 2 AZs.
- Security group `sg-learnos-backend`:
  - Ingress: TCP 8000 from `sg-learnos-alb`
  - Egress: `0.0.0.0/0` on 443 (so we can reach Anthropic / Gemini / OpenAI / YouTube / Supabase)
- Outbound to the internet is via the VPC's NAT gateway.

---

## 5. Networking — VPC, ALB, Route 53, ACM

### 5.1 VPC
- **Reuse a single `learnos-vpc`** per region with:
  - 2 public subnets (one per AZ) — ALB + NAT GW live here
  - 2 private subnets (one per AZ) — ECS tasks + ElastiCache live here
  - CIDR: `10.40.0.0/16` (or whatever fits your org)
- VPC endpoints (cost-saving, not strictly required): `com.amazonaws.<region>.ecr.dkr`, `com.amazonaws.<region>.ecr.api`, `com.amazonaws.<region>.logs`, `com.amazonaws.<region>.secretsmanager`, `s3` gateway endpoint.

### 5.2 Application Load Balancer
- **Internet-facing**, public subnets, sg `sg-learnos-alb` (ingress 80 + 443 from `0.0.0.0/0`).
- **Listeners:**
  - `:80` → redirect to `:443`
  - `:443` with ACM cert for `api.learnos.app` → forward to target group `tg-learnos-backend`
- **Target group `tg-learnos-backend`:**
  - Protocol HTTP, port 8000, IP target type
  - Health check path: `/api/voice/gemini/health` (200 = healthy)
  - Deregistration delay: 30 s (keep WebSocket sessions alive during deploy)
- **Idle timeout:** **3600 s** (default is 60 s — too short for voice sessions that can run 30+ minutes). Increase via ALB attributes.
- **Stickiness:** off (WS upgrades don't need sticky sessions because each client is pinned to a single task for the WS lifetime anyway).

### 5.3 Route 53
- Hosted zone for `learnos.app`.
- Records:
  - `app.learnos.app` → Amplify ALIAS (Amplify creates the CloudFront distribution)
  - `api.learnos.app` → ALB ALIAS A-record
  - `staging.app.learnos.app` → Amplify ALIAS for staging branch
  - `api.staging.learnos.app` → ALB ALIAS for staging ALB (or same ALB + host-header-based rule)

### 5.4 ACM
- Request certs **in the region where the ALB lives** (e.g. `ap-south-1` for India users or `us-east-1` for global). The CloudFront/Amplify cert must be in `us-east-1` regardless — Amplify handles that automatically.
- Validation: DNS via Route 53 (automatic).

---

## 6. WebSocket & SSE considerations

LearnOS has two long-lived channels that pass through the ALB:

| Endpoint | Protocol | Typical duration | Why it matters |
|---|---|---|---|
| `WSS /api/voice/gemini` | WebSocket | Minutes to hours | Voice tutor — if the ALB closes it, the student sees "Disconnected" mid-sentence |
| `WSS /api/video/sentiment/ws` | WebSocket | Matches lesson duration | Live sentiment stream |
| `HTTPS POST /api/lessons/{id}/chat` | HTTP SSE | Until model stops streaming | Teaching chat |

**Must-do settings on the ALB:**
1. **Idle timeout = 3600 s** (one hour). Re-visit if you observe sessions longer than that.
2. **Keep-alive at the app level**: `websockets` library already sends WS pings every 20 s (see `voice_gemini.py`); ALB inherits idle timeout reset on every frame.
3. **WebSocket upgrade path:** ALB supports HTTP/1.1 Upgrade on the same listener that handles REST traffic — no separate listener needed.
4. **Sticky sessions are NOT required** — once the WS is established, the TCP connection stays pinned to the task it landed on.

**Deployment considerations:**
- Rolling deploys kill in-flight WS sessions when old tasks drain. Set **deregistration delay to 30 s** to let graceful close propagate; users get a normal "connection closed" event and our frontend auto-reconnects.
- Avoid deploys during peak learning hours if tolerable.

**Gemini Live outbound:** the backend dials `wss://generativelanguage.googleapis.com/...` outbound. This needs the NAT gateway to permit outbound 443. No inbound firewall change needed.

---

## 7. Secrets & configuration

### 7.1 Secrets Manager layout
Create one secret per env cluster, with sub-keys:

```
learnos/prod/backend     (JSON)
{
  "ANTHROPIC_API_KEY": "...",
  "GEMINI_API_KEY": "...",
  "OPENAI_API_KEY": "...",
  "YOUTUBE_DATA_API_KEY": "...",
  "SUPABASE_URL": "https://<ref>.supabase.co",
  "SUPABASE_ANON_KEY": "...",
  "SUPABASE_SERVICE_ROLE_KEY": "...",
  "SUPABASE_JWT_SECRET": "...",
  "SUPABASE_DB_URL": "postgresql+asyncpg://..."
}
```

### 7.2 Wiring into ECS
In the task definition, set `secrets` (not `environment`) for each key:

```json
"secrets": [
  { "name": "ANTHROPIC_API_KEY",          "valueFrom": "arn:aws:secretsmanager:ap-south-1:123:secret:learnos/prod/backend:ANTHROPIC_API_KEY::" },
  { "name": "GEMINI_API_KEY",             "valueFrom": "arn:aws:secretsmanager:...:GEMINI_API_KEY::" },
  { "name": "OPENAI_API_KEY",             "valueFrom": "arn:aws:secretsmanager:...:OPENAI_API_KEY::" },
  { "name": "YOUTUBE_DATA_API_KEY",       "valueFrom": "arn:aws:secretsmanager:...:YOUTUBE_DATA_API_KEY::" },
  { "name": "SUPABASE_URL",               "valueFrom": "..." },
  { "name": "SUPABASE_ANON_KEY",          "valueFrom": "..." },
  { "name": "SUPABASE_SERVICE_ROLE_KEY",  "valueFrom": "..." },
  { "name": "SUPABASE_JWT_SECRET",        "valueFrom": "..." },
  { "name": "SUPABASE_DB_URL",            "valueFrom": "..." }
]
```

The ECS agent pulls each key at task start and injects it as an env var, so `pydantic-settings` in `app/config.py` picks it up unchanged.

### 7.3 Rotation
- Supabase keys rotate via the Supabase dashboard; push the new value to Secrets Manager, then `aws ecs update-service --force-new-deployment` to restart tasks.
- AI vendor keys rotate similarly. Gemini in particular should have a separate key per environment so staging can't burn prod's quota.

### 7.4 Non-secret env
`REDIS_URL`, `CORS_ORIGINS`, `API_HOST`, `API_PORT`, `SENTIMENT_FRAME_INTERVAL_MS` go in the task definition's `environment` section (plain text), not Secrets Manager.

---

## 8. Caching — ElastiCache Redis

- **Engine:** Redis 7.x
- **Node type:** `cache.t4g.micro` (dev/staging), `cache.t4g.small` with replication (prod)
- **Subnet group:** both private subnets
- **Security group:** `sg-learnos-redis` — ingress 6379 from `sg-learnos-backend`
- **Parameter group:** defaults; `maxmemory-policy=allkeys-lru` is fine for rate-limit counters
- **No encryption-at-rest needed** (no sensitive data in Redis — only counters and ephemeral cache)
- **In-transit encryption:** optional; fine to leave off inside the VPC

**Connection:** the ECS task receives `REDIS_URL=redis://<cluster-endpoint>.cache.amazonaws.com:6379` via env. slowapi uses this as its shared store so rate limiting works across N backend tasks.

**Future use:** if the YouTube in-process cache (see §4.2 of ARCHITECTURE.md) becomes a hotspot once we scale beyond one backend task, move it to Redis (`SET q:<sha>:<query> <json> EX 3600`).

---

## 9. Observability — CloudWatch, logs, alarms

### 9.1 Logs
- Task definition uses `awslogs` driver → `/ecs/learnos-backend` log group, 30-day retention.
- Amplify log group is auto-created under `/aws/amplify/<app-id>/<branch>`.

### 9.2 Metrics to alarm on
| Metric | Threshold | Action |
|---|---|---|
| `ALB · HTTPCode_Target_5XX_Count` | > 10 in 5 min | Page on-call |
| `ALB · TargetResponseTime p95` | > 2 s for 10 min | Warn |
| `ECS · CPUUtilization` (service) | > 80 % for 10 min | Scale out (auto via target-tracking policy) |
| `ECS · MemoryUtilization` | > 85 % for 10 min | Warn |
| `ALB · UnHealthyHostCount` | > 0 for 3 min | Page |
| `Gemini outbound failure` (custom metric from logs) | > 5 in 5 min | Warn |

### 9.3 Tracing (optional next step)
OpenTelemetry → ADOT collector sidecar → CloudWatch / Grafana. Gives you request spans across the proxy → Gemini + Claude calls. Not on day 1, but worth adding before scaling past ~1,000 active students.

---

## 10. CI/CD pipeline

### 10.1 Frontend (Amplify auto-deploy)
- Amplify watches GitHub webhook on `main` and `staging`.
- On push: Amplify runs `amplify.yml` → builds in the Amplify container → uploads artifacts → invalidates CloudFront.
- No external pipeline needed.

### 10.2 Backend (GitHub Actions → ECR → ECS)

`.github/workflows/backend-deploy.yml` (skeleton):

```yaml
name: Backend deploy
on:
  push:
    branches: [main, staging]
    paths: ['backend/**']

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment: ${{ github.ref_name == 'main' && 'prod' || 'staging' }}
    permissions:
      id-token: write   # for OIDC
      contents: read
    steps:
      - uses: actions/checkout@v4
      - name: Configure AWS via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/learnos-gh-actions-deploy
          aws-region: ap-south-1
      - uses: aws-actions/amazon-ecr-login@v2
      - name: Build & push image
        working-directory: backend
        run: |
          IMAGE=$(aws sts get-caller-identity --query Account --output text).dkr.ecr.ap-south-1.amazonaws.com/learnos/backend:sha-${GITHUB_SHA::7}
          docker build -t "$IMAGE" .
          docker push "$IMAGE"
          echo "IMAGE=$IMAGE" >> $GITHUB_ENV
      - name: Render task def with new image
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        id: taskdef
        with:
          task-definition: backend/ecs/task-definition.json
          container-name: backend
          image: ${{ env.IMAGE }}
      - name: Deploy to ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: ${{ steps.taskdef.outputs.task-definition }}
          service: learnos-backend-svc
          cluster: learnos-prod
          wait-for-service-stability: true
```

OIDC trust policy on `learnos-gh-actions-deploy` restricts to our repo + branch so no long-lived AWS creds need to live in GitHub secrets.

### 10.3 Alembic migrations
Migrations aren't part of the image push. They run against Supabase PG (not RDS) and should happen **before** the ECS deploy:

- Option A (recommended for small teams): add a pre-deploy step in the same workflow —
  ```yaml
  - run: |
      pip install -r backend/requirements.txt
      cd backend && alembic upgrade head
    env:
      SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}
  ```
  Keeps schema migrations atomic with code.
- Option B: standalone one-off ECS task `learnos-migrations` that runs `alembic upgrade head` and exits. Invoked manually or via CodeBuild.

---

## 11. IAM & security posture

### 11.1 Roles
| Role | Trust | Permissions |
|---|---|---|
| `ecsTaskExecutionRole` | ECS tasks service | `AmazonECSTaskExecutionRolePolicy` (pull from ECR, write CloudWatch logs) |
| `learnos-ecs-task-role` | ECS tasks service | `secretsmanager:GetSecretValue` on `learnos/*` only; `logs:CreateLogStream`/`PutLogEvents` |
| `learnos-gh-actions-deploy` | GitHub OIDC | ECR push, `ecs:RegisterTaskDefinition`, `ecs:UpdateService` (scoped to `learnos-prod` cluster) |
| `amplify-service-role` | AWS Amplify | Managed by Amplify Console when you create the app |

### 11.2 Security groups (summary)
- `sg-learnos-alb` — ingress 80/443 from world
- `sg-learnos-backend` — ingress 8000 from `sg-learnos-alb` only
- `sg-learnos-redis` — ingress 6379 from `sg-learnos-backend` only

### 11.3 Public surface
Only the ALB (`api.learnos.app`) and Amplify (`app.learnos.app`) are reachable from the internet. ECS tasks, Redis, and the NAT gateway's internal IP are all private.

### 11.4 Supabase-side considerations
- Supabase project allows PostgreSQL connections from `0.0.0.0/0` by default — tighten to the NAT gateway's Elastic IP(s) in Supabase → Project Settings → Network Restrictions so only our backend can reach the DB directly.
- Storage bucket policies: `marksheets` stays private; the backend signs short-lived URLs for download.

### 11.5 CORS
Backend `CORS_ORIGINS` env limits `Access-Control-Allow-Origin` to `https://app.learnos.app` (and staging URL). The Next.js `/api/proxy` route means most browser requests are same-origin (`app.learnos.app → app.learnos.app/api/proxy/*`), so CORS rarely needs to relax.

---

## 12. Scaling plan

Bottlenecks to watch and how to scale each:

| Bottleneck | Symptom | Scaling response |
|---|---|---|
| FastAPI CPU | ECS tasks at ~70% CPU during peak lessons | Auto-scale: target-tracking on CPUUtilization 60 %, max 10 tasks |
| Gemini WS connections per task | 2 workers × ~200 concurrent WS → ~400 limit per task | Watch `active_connections` gauge (add via middleware); scale out ECS tasks rather than vertical |
| Claude API rate limit | 429 spikes during curriculum generation waves | Queue curriculum generation (decouple: Celery / SQS + a separate ECS service of Claude workers) |
| Supabase connection pool | `too many connections` in logs | Use pgbouncer (Supabase provides one on port 6543); `SUPABASE_DB_URL` should use the pooler when worker count > 2 |
| ElastiCache | Unlikely; rate-limit counter traffic is light | Vertical scale to `t4g.small` |
| YouTube Data API quota | HTTP 429 on `search.list` | Move 1-hour cache to Redis (shared), tighten quota/query by subject |

---

## 13. Cost sketch

Order-of-magnitude monthly cost for a ~1,000 DAU deployment in `ap-south-1`:

| Item | Qty | Unit cost | Monthly |
|---|---|---|---|
| Fargate tasks (2 vCPU / 4 GB) | 2 tasks × 730 h | ~$0.04 vCPU-h + $0.004 GB-h | ~$70 |
| ALB | 1 | $0.0225/h + LCUs | ~$20 |
| NAT Gateway | 1 | $0.045/h + data | ~$35 |
| ECR | 5 GB storage | $0.10/GB | $0.50 |
| ElastiCache `t4g.micro` | 1 | $0.016/h | ~$12 |
| CloudWatch Logs (30-day retention) | ~20 GB ingest | $0.50/GB | $10 |
| Secrets Manager | 1 secret | $0.40/secret + API | $0.50 |
| Route 53 | 1 zone + queries | $0.50 + $0.40/M | ~$1 |
| ACM | — | free | $0 |
| Amplify Hosting | 1 app, ~100k requests | ~$0.15/GB served + $0.01/M req | ~$15 |
| **AWS subtotal** | | | **~$165/mo** |
| Supabase Pro | 1 project | fixed | $25 |
| Anthropic / Gemini / OpenAI / YouTube | usage | pay-as-you-go | **dominant at scale** |

AI usage cost dominates once you cross a few hundred DAU. Enable prompt caching on Claude (Anthropic SDK supports it automatically with `cache_control`), keep Gemini temperature low (already 0.2), and cache YouTube lookups aggressively to keep the non-AI infra bill under $200/mo.

---

## 14. Disaster recovery & rollback

### 14.1 Rollback scenarios
- **Backend regression:** previous image is still in ECR — redeploy with the old SHA via `aws ecs update-service --task-definition <old-revision>` or re-run the workflow on the prior commit. Rolling deploy completes in ~2 min.
- **Frontend regression:** Amplify keeps build history; redeploy any prior commit from the Amplify console in one click.
- **Bad migration:** Alembic supports downgrade, but prefer forward-only fixes. Keep each migration small.

### 14.2 Multi-region
Not required at current scale. If needed:
- Frontend: Amplify Hosting is already CloudFront-backed (global edge).
- Backend: replicate the ECS service in a second region (e.g. `us-east-1`), add Route 53 latency routing on `api.learnos.app`. Supabase stays in its original region — cross-region DB latency becomes a factor.

### 14.3 Backup
Supabase manages PG backups (daily + PITR on Pro). AWS-side, nothing stores authoritative state — ECS tasks and Redis are ephemeral.

---

## 15. Step-by-step bootstrap checklist

One-time setup to go from zero to running:

### Phase 0 — accounts + domain
- [ ] AWS account with billing alerts
- [ ] Route 53 hosted zone for `learnos.app`
- [ ] ACM certs for `api.learnos.app` (in backend region) and `app.learnos.app` (in `us-east-1` for Amplify, auto-created)
- [ ] GitHub repo with `backend/` and `frontend/` subfolders

### Phase 1 — backend infra
- [ ] VPC `learnos-vpc` with 2 public + 2 private subnets and NAT GW
- [ ] Security groups: ALB, backend, redis
- [ ] ElastiCache Redis subnet group + cluster
- [ ] ALB + target group + HTTPS listener + idle timeout 3600
- [ ] ECR repo `learnos/backend`
- [ ] Secrets Manager entry `learnos/prod/backend` with all keys
- [ ] IAM roles: `ecsTaskExecutionRole`, `learnos-ecs-task-role`, `learnos-gh-actions-deploy`
- [ ] ECS cluster `learnos-prod` (Fargate)
- [ ] Initial task definition + service (desired count 2)

### Phase 2 — frontend infra
- [ ] Amplify app connected to GitHub
- [ ] `main` branch → production with env vars pointing at `api.learnos.app`
- [ ] Custom domain `app.learnos.app`

### Phase 3 — first deploy
- [ ] Push a test commit to `main`; confirm GitHub Actions builds, pushes to ECR, updates ECS, and the ALB reports healthy targets
- [ ] Confirm Amplify rebuilds frontend and the production URL loads
- [ ] Manual smoke: register → onboard → open a lesson → voice connects → a diagram renders → Mark complete awards XP

### Phase 4 — ops hardening
- [ ] CloudWatch alarms wired
- [ ] Supabase IP allow-list pinned to NAT GW EIP
- [ ] Budget alarm at 80% of expected monthly cost
- [ ] Runbook page in team wiki for "how to roll back a bad backend deploy"

---

**See also:**
- [ARCHITECTURE.md](ARCHITECTURE.md) for the system's logical architecture (not AWS-specific)
- [README.md](../README.md) for feature coverage
- [QUICKSTART.md](../QUICKSTART.md) for local-development setup
