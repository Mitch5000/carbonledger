# End-to-End Test Suite: Oracle → Soroban → Registry Pipeline

## Overview

This end-to-end test suite validates the complete data flow from the Python oracle, through the NestJS backend, to the Soroban smart contracts on Stellar Testnet.

**Status**: Oracle submits monitoring data → carbon_oracle contract receives it → carbon_registry status updates

**Acceptance Criteria**:

- ✅ Tests run against Stellar Testnet (not mocked)
- ✅ Covers: submit data → verify on-chain state change
- ✅ Covers: stale data detection (`is_monitoring_current()` returns false)
- ✅ Runs in CI on schedule (nightly)
- ✅ Priority: High | Effort: Large

---

## Architecture

```
┌─────────────────┐
│  Python Oracle  │  Submits monitoring data (tonnes, methodology score, satellite CID)
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  NestJS Backend API             │  POST /api/v1/oracle/monitoring
│  (OracleService)                │  Stores in PostgreSQL + queues for Soroban
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Queue Processor                │  Submits to Soroban contracts
│  (BullMQ + Redis)               │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Soroban Contracts (Rust)       │  carbon_oracle: store data, verify freshness
│  ├─ carbon_oracle               │  carbon_registry: update project status
│  ├─ carbon_registry             │
│  └─ ...                         │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Stellar Testnet Ledger         │  Immutable on-chain state
└─────────────────────────────────┘
```

---

## Test Scenarios

### Test 1: Submit Monitoring Data → Verify On-Chain State Change

**Scenario**: Oracle submits monitoring data for a project period

**Steps**:

1. Submit `SubmitMonitoringDto` via backend API
2. Backend stores in PostgreSQL
3. Backend queues submission to Soroban
4. Test verifies data appears on-chain in carbon_oracle contract

**Expected Outcomes**:

- ✓ API returns 201 Created
- ✓ Data stored in DB with correct values
- ✓ On-chain query returns matching data
- ✓ `is_monitoring_current()` returns `true` for fresh data

---

### Test 2: Stale Data Detection (is_monitoring_current)

**Scenario**: Verify freshness validation works correctly

**Steps**:

1. Query `is_monitoring_current()` for a project with fresh data
2. Query `is_monitoring_current()` for a project with no data
3. Query `is_monitoring_current()` for data older than 365 days

**Expected Outcomes**:

- ✓ Fresh data: returns `true`
- ✓ Missing data: returns `false`
- ✓ Stale data: returns `false` (verified via separate test project)

**Freshness Window**: 365 days (31,536,000 seconds)

---

### Test 3: Multiple Submissions & Freshness Tracking

**Scenario**: Track multiple monitoring submissions across different periods

**Steps**:

1. Submit data for period T-30 days
2. Submit data for period T-15 days
3. Submit data for period T (today)
4. Verify latest submission is marked as current

**Expected Outcomes**:

- ✓ All submissions accepted
- ✓ Latest submission's freshness timestamp updated
- ✓ `is_monitoring_current()` reflects the latest timestamp

---

### Test 4: Backend DB ↔ On-Chain Consistency

**Scenario**: Verify data consistency between PostgreSQL and Soroban

**Steps**:

1. Submit monitoring data via API
2. Query backend database
3. Query on-chain contract state
4. Verify both have identical data

**Expected Outcomes**:

- ✓ DB record persisted correctly
- ✓ On-chain contract has same project_id, period, tonnes, score
- ✓ Timestamps match (within network latency tolerance)

---

### Test 5: Low Methodology Score Event Emission

**Scenario**: Verify warning events are emitted for low quality submissions

**Steps**:

1. Submit monitoring data with `methodologyScore < 70`
2. Verify `low_score` event is emitted on-chain

**Expected Outcomes**:

- ✓ Submission accepted
- ✓ On-chain event `c_ledger.low_score` emitted
- ✓ Score value included in event

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Stellar account with testnet funds (for oracle operations)
- Deployed Soroban contracts on Stellar Testnet

### 1. Clone & Install Dependencies

```bash
# Clone repository
git clone <repo-url>
cd carbonledger/backend

# Install dependencies
npm ci
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.e2e.example .env.e2e

# Fill in required values
# - ORACLE_SECRET_KEY: Your test oracle account's secret key
# - CARBON_ORACLE_CONTRACT_ID: Deployed contract address
# - CARBON_REGISTRY_CONTRACT_ID: Deployed contract address
# - BACKEND_API_URL: Backend server URL (usually http://localhost:3001)

nano .env.e2e
```

### 3. Start Backend Services (Local Testing)

```bash
# Start PostgreSQL (if using Docker)
docker run -d \
  -e POSTGRES_DB=carbonledger_test \
  -e POSTGRES_USER=carbonledger \
  -e POSTGRES_PASSWORD=testpass \
  -p 5432:5432 \
  postgres:16-alpine

# Start Redis
docker run -d \
  -p 6379:6379 \
  redis:7-alpine

# Run migrations
npx prisma migrate deploy

# Start backend in development mode
npm run start:dev
```

### 4. Run E2E Tests Locally

```bash
# Run all E2E tests
npm run test:e2e

# Run with verbose output
npm run test:e2e -- --verbose

# Run specific test file
npm run test:e2e -- oracle.e2e.spec.ts

# Watch mode (re-run on file changes)
npm run test:e2e:watch
```

---

## Running in CI/CD

### GitHub Actions Workflow

The test suite runs automatically every night at **2 AM UTC** via GitHub Actions.

**Workflow File**: [`.github/workflows/e2e-oracle-soroban.yml`](.github/workflows/e2e-oracle-soroban.yml)

**Features**:

- 🌙 Scheduled nightly execution
- 🤖 Manual trigger support (`workflow_dispatch`)
- 📊 Test result uploads
- 💬 Slack notifications on success/failure
- 🔐 Secret management for sensitive credentials

### Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

```
JWT_SECRET                 # JWT signing key for test tokens
TEST_ORACLE_SECRET_KEY     # Oracle account secret key (testnet)
CARBON_ORACLE_CONTRACT_ID  # Soroban contract address
CARBON_REGISTRY_CONTRACT_ID # Soroban contract address
SLACK_WEBHOOK_URL          # (Optional) For notifications
```

### Manual Trigger

```bash
# Trigger workflow manually via GitHub CLI
gh workflow run e2e-oracle-soroban.yml

# View workflow runs
gh workflow view e2e-oracle-soroban.yml --log
```

---

## Test Data & Fixtures

### Project Fixture

Each test run uses a unique project ID to avoid conflicts:

```
test-project-e2e-{timestamp}
```

**Characteristics**:

- Random satellite CID generated per submission
- Methodology scores vary (65-95) to test edge cases
- Tonnes verified range from 50-500

### Oracle Account

The test oracle account:

- Must have testnet funds (5-10 XLM minimum)
- Should be different from production oracle
- Must be authorized on the carbon_oracle contract

---

## Environment Variables Reference

| Variable                      | Required | Description                                   |
| ----------------------------- | -------- | --------------------------------------------- |
| `STELLAR_RPC_URL`             | Yes      | Soroban RPC endpoint                          |
| `NETWORK_PASSPHRASE`          | Yes      | Stellar network identifier                    |
| `CARBON_ORACLE_CONTRACT_ID`   | Yes      | Oracle contract address                       |
| `CARBON_REGISTRY_CONTRACT_ID` | Yes      | Registry contract address                     |
| `ORACLE_SECRET_KEY`           | Yes      | Test oracle account keypair                   |
| `BACKEND_API_URL`             | Yes      | Backend API base URL                          |
| `DATABASE_URL`                | Yes      | PostgreSQL connection string                  |
| `TEST_PROJECT_ID`             | No       | Project ID prefix (auto-generated if not set) |
| `JWT_SECRET`                  | Yes      | JWT signing key                               |
| `TEST_JWT_TOKEN`              | No       | Pre-generated JWT (auto-generated if not set) |

---

## Troubleshooting

### Backend Connection Timeout

```
Error: connect ECONNREFUSED 127.0.0.1:3001
```

**Solution**: Ensure backend is running on port 3001

```bash
npm run start:dev
# Or verify with: curl http://localhost:3001/api/v1/health
```

### Database Connection Failed

```
Error: connect ECONNREFUSED postgresql://...
```

**Solution**: Verify PostgreSQL is running and database exists

```bash
psql -U carbonledger -d carbonledger_test -c "SELECT 1"
```

### Stellar RPC Timeout

```
Error: Timeout waiting for transaction confirmation
```

**Solution**:

- Verify network connectivity to `soroban-testnet.stellar.org`
- Testnet may be under maintenance; check [Stellar status](https://status.stellar.org)
- Increase timeout in `jest.e2e.config.js` if network is slow

### Contract Not Found

```
CarbonError::ProjectNotFound (1)
```

**Solution**:

- Verify `CARBON_ORACLE_CONTRACT_ID` is correct
- Confirm contract is deployed on testnet
- Check contract initialization (admin must set oracle address)

### Invalid Oracle Authorization

```
CarbonError::UnauthorizedOracle (8)
```

**Solution**:

- Verify `ORACLE_SECRET_KEY` is authorized on contract
- Call `initialize()` on contract with correct oracle address
- Check oracle address matches Keypair public key

---

## Logs & Debugging

### Enable Verbose Logging

```bash
# Run with detailed output
npm run test:e2e -- --verbose

# Capture logs to file
npm run test:e2e 2>&1 | tee test-results.log
```

### Debug Mode (VS Code)

```bash
# Start in debug mode
node --inspect-brk ./node_modules/.bin/jest --config jest.e2e.config.js
```

Then open `chrome://inspect` in Chrome DevTools.

### Query Contract State Manually

```bash
# Use stellar-sdk to query contract storage
npx ts-node -e "
import { SorobanServer, Keypair } from '@stellar/stellar-sdk';
const server = new SorobanServer('https://soroban-testnet.stellar.org');
// Add query logic here
"
```

---

## Performance Metrics

**Expected Test Runtimes**:

- Individual test: ~5-15 seconds
- Full suite: ~60-90 seconds
- CI/CD run: ~5-10 minutes (including setup)

**Network Latency**:

- Stellar Testnet avg confirmation: ~4 seconds
- RPC call latency: ~100-500ms

---

## Maintenance & Updates

### Updating Test Suite

After smart contract changes, update corresponding test fixtures:

1. **New contract methods**: Add test case in E2E spec
2. **Storage schema changes**: Update `getMonitoringDataOnChain()` parsing
3. **Error codes**: Add to error handling in test helpers

### Dependency Updates

```bash
# Update dependencies
npm update

# Check for vulnerabilities
npm audit

# Update specific package
npm update @stellar/stellar-sdk
```

---

## CI/CD Pipeline Status

| Stage               | Status                |
| ------------------- | --------------------- |
| Build               | ✅ Passing            |
| Unit Tests          | ✅ Passing            |
| E2E Tests (Nightly) | ⏰ Scheduled 2 AM UTC |
| Contract Audit      | 🔄 In Progress        |
| Production Deploy   | 🚀 Ready              |

Check latest runs: [GitHub Actions Workflows](../../actions)

---

## Contributing

To add new tests:

1. Create test case in [`oracle.e2e.spec.ts`](./oracle.e2e.spec.ts)
2. Follow naming convention: `it("should [action] and verify [outcome]")`
3. Include logging via `console.log()`
4. Run locally first: `npm run test:e2e`
5. Submit PR with test results

---

## Support

- **Documentation**: See [README.md](../README.md)
- **Issues**: [GitHub Issues](../../issues)
- **Discussions**: [GitHub Discussions](../../discussions)
- **Email**: support@carbonledger.io
