# Local Performance Validation Suite

This directory contains a k6-based performance testing suite designed to validate the DailyDiary application's performance exclusively on a local Windows development environment.

## Prerequisites
- Install k6 on Windows. The easiest way is using winget:
  ```powershell
  winget install k6 --source winget
  ```
- Ensure both the frontend and backend are running locally (`npm run dev` at the root).

## Execution

### 1. Smoke Test
A single-user test that verifies the critical path (Dashboard -> Timeline -> Public Feed -> Create -> Edit -> Delete).
```powershell
cd performance
k6 run smoke.js
```

### 2. Load Test
A staged load test ramping up from 1 to 250 concurrent virtual users to identify local bottlenecks.
Make sure the results directory exists before running:
```powershell
cd performance
mkdir -p results
k6 run --out json=results/summary.json load.js
```

## Interpreting Results
- Check your backend terminal logs (`npm run dev:backend`) during execution.
- You will see logging for **Prisma Query Duration**, **Cache HIT/MISS**, and **Memory RSS/Heap**.
- **IMPORTANT**: These results represent performance on the local development environment only. They are not indicative of production capacity or maximum concurrent users in a cloud setting.
