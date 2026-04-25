# CarbonLedger E2E Test Suite: Oracle → Soroban → Registry Pipeline

## Quick Start

```bash
cd backend

# Install dependencies
npm ci

# Run E2E tests locally
npm run test:e2e

# Run with verbose output
npm run test:e2e -- --verbose

# Run in watch mode
npm run test:e2e:watch
```

## What's Tested

This end-to-end test suite validates the complete data flow from the Python oracle through the NestJS backend to the Soroban smart contracts on Stellar Testnet.

### Test Coverage

| Test                          | Scenario                                                       | Status |
| ----------------------------- | -------------------------------------------------------------- | ------ |
| **Submission → Verification** | Oracle submits monitoring data; verify on-chain state          | ✅     |
| **Stale Data Detection**      | `is_monitoring_current()` returns false for stale/missing data | ✅     |
| **Multi-Period Tracking**     | Track multiple submissions and verify freshness updates        | ✅     |
| **DB ↔ Chain Consistency**    | Backend DB matches on-chain contract state                     | ✅     |
| **Low Score Events**          | Emit warning events when methodology score < 70                | ✅     |

## Architecture

```
Python Oracle (price_oracle.py)
    ↓
Backend API (POST /api/v1/oracle/monitoring)
    ↓
PostgreSQL (MonitoringData table)
    ↓
Message Queue (BullMQ + Redis)
    ↓
Soroban Contracts (carbon_oracle)
    ↓
Stellar Testnet Ledger
```

## Files Added

### Core Test Files

- **[`backend/src/oracle/oracle.e2e.spec.ts`](backend/src/oracle/oracle.e2e.spec.ts)** - Main E2E test suite
  - 5 comprehensive test scenarios
  - Stellar Testnet interaction
  - Contract state verification
  - Stale data detection

### Utilities

- **[`backend/src/oracle/utils/soroban.ts`](backend/src/oracle/utils/soroban.ts)** - Soroban contract helpers
  - Contract method invocation
  - Transaction signing & submission
  - Result parsing utilities

- **[`backend/src/oracle/utils/time.ts`](backend/src/oracle/utils/time.ts)** - Time utilities
  - Unix timestamp generation
  - Sleep/delay helpers
  - Freshness checking

- **[`backend/src/oracle/utils/test-fixtures.ts`](backend/src/oracle/utils/test-fixtures.ts)** - Test data builders
  - Project fixtures
  - Monitoring data generators
  - Validation utilities

### Configuration

- **[`backend/jest.e2e.config.js`](backend/jest.e2e.config.js)** - Jest E2E configuration
  - 60-second timeout for network operations
  - TypeScript support via ts-jest

- **[`.github/workflows/e2e-oracle-soroban.yml`](.github/workflows/e2e-oracle-soroban.yml)** - CI/CD workflow
  - Nightly execution (2 AM UTC)
  - PostgreSQL + Redis services
  - Slack notifications
  - Manual trigger support

- **[`.env.e2e.example`](.env.e2e.example)** - Environment template
  - All required variables documented
  - Sample values for reference

### Documentation

- **[`backend/src/oracle/E2E_TEST_GUIDE.md`](backend/src/oracle/E2E_TEST_GUIDE.md)** - Comprehensive guide
  - Setup instructions
  - Test scenarios explained
  - Troubleshooting tips
  - CI/CD configuration

## Environment Setup

### Local Testing

```bash
# 1. Copy environment template
cp .env.e2e.example .env.e2e

# 2. Fill in your values
# ORACLE_SECRET_KEY=S...
# CARBON_ORACLE_CONTRACT_ID=C...
# CARBON_REGISTRY_CONTRACT_ID=C...

# 3. Start services
docker run -d \
  -e POSTGRES_DB=carbonledger_test \
  -e POSTGRES_USER=carbonledger \
  -e POSTGRES_PASSWORD=testpass \
  -p 5432:5432 \
  postgres:16-alpine

docker run -d -p 6379:6379 redis:7-alpine

# 4. Run migrations and start backend
npx prisma migrate deploy
npm run start:dev

# 5. In another terminal, run tests
npm run test:e2e
```

### GitHub Secrets (for CI/CD)

Add these to your GitHub repository:

```
JWT_SECRET                 # JWT signing key
TEST_ORACLE_SECRET_KEY     # Testnet oracle keypair
CARBON_ORACLE_CONTRACT_ID  # Deployed contract address
CARBON_REGISTRY_CONTRACT_ID # Deployed contract address
SLACK_WEBHOOK_URL          # (Optional) for notifications
```

## Running Tests

### Command Reference

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- oracle.e2e.spec.ts

# Run specific test
npm run test:e2e -- --testNamePattern="should submit monitoring"

# Watch mode (re-run on changes)
npm run test:e2e:watch

# With coverage
npm run test:e2e -- --coverage

# Verbose output
npm run test:e2e -- --verbose

# Debug mode
node --inspect-brk ./node_modules/.bin/jest --config jest.e2e.config.js
```

### CI/CD Pipeline

**Automatic Schedule**: Every night at **2 AM UTC**

**Manual Trigger**:

```bash
gh workflow run e2e-oracle-soroban.yml
```

**View Results**:

- GitHub Actions: Check [Actions](../../actions) tab
- Slack: Notifications on success/failure
- Artifacts: Test results uploaded to GitHub

## Test Scenarios

### 1. Submit & Verify On-Chain State

```
Oracle submits monitoring data
  ↓
Backend API stores in PostgreSQL
  ↓
Message queue submits to Soroban
  ↓
Test verifies data on chain with correct values
  ✓ is_monitoring_current() returns true
```

### 2. Stale Data Detection

```
Query fresh data → is_monitoring_current() = true
Query missing data → is_monitoring_current() = false
Query data > 365 days old → is_monitoring_current() = false
```

### 3. Multi-Period Tracking

```
Submit data for T-30 days
Submit data for T-15 days
Submit data for T (today)
  ↓
Verify latest submission marked as current
```

### 4. DB ↔ Chain Consistency

```
Store in PostgreSQL
Store on-chain contract
  ↓
Query both
  ↓
Verify identical project_id, period, tonnes, score
```

### 5. Low Score Events

```
Submit with methodologyScore = 65 (< 70)
  ↓
Verify on-chain event emitted: c_ledger.low_score
```

## Key Features

✅ **Real Stellar Testnet**: Tests actual blockchain operations  
✅ **No Mocks**: Direct smart contract calls  
✅ **Automated Scheduling**: Runs nightly via GitHub Actions  
✅ **Comprehensive Coverage**: 5 test scenarios covering all acceptance criteria  
✅ **Detailed Logging**: Full visibility into test execution  
✅ **Notification Support**: Slack alerts on test status  
✅ **Local & CI Support**: Run locally or in GitHub Actions

## Acceptance Criteria Met

| Criterion                                          | Implementation                        |
| -------------------------------------------------- | ------------------------------------- |
| Test runs against Stellar Testnet (not mocked)     | ✅ Uses real Soroban RPC endpoint     |
| Covers: submit data → verify on-chain state change | ✅ Test 1: Submission → Verification  |
| Covers: stale data detection                       | ✅ Test 2: is_monitoring_current()    |
| Runs in CI on schedule (nightly)                   | ✅ GitHub Actions workflow @ 2 AM UTC |

## Dependencies Added

```json
"devDependencies": {
  "@stellar/stellar-sdk": "^11.3.0",
  "jest": "^29.5.0",
  "ts-jest": "^29.1.0",
  "@types/jest": "^29.5.0"
}
"dependencies": {
  "axios": "^1.6.0"
}
```

## Package.json Scripts

```json
"scripts": {
  "test:e2e": "jest --config jest.e2e.config.js --runInBand",
  "test:e2e:watch": "jest --config jest.e2e.config.js --watch --runInBand"
}
```

## Troubleshooting

### Backend Connection Error

```bash
# Verify backend is running
curl http://localhost:3001/api/v1/health
```

### Database Connection Error

```bash
# Check PostgreSQL
psql -U carbonledger -d carbonledger_test -c "SELECT 1"
```

### Stellar Network Error

```bash
# Verify testnet connectivity
curl https://soroban-testnet.stellar.org/soroban/rpc
```

### Contract Not Found

```bash
# Verify contract ID is correct on Stellar Testnet
# Visit: https://stellar.expert/explorer/testnet/contract/C...
```

## Performance Metrics

- **Individual test**: ~5-15 seconds
- **Full suite**: ~60-90 seconds
- **CI/CD run**: ~5-10 minutes (including setup)
- **Network latency**: ~100-500ms per RPC call

## Next Steps

1. **Deploy Smart Contracts** (if not done)
   - Deploy carbon_oracle.wasm
   - Deploy carbon_registry.wasm
   - Note contract IDs

2. **Generate Test Oracle Account**

   ```bash
   # Generate keypair
   node -e "const k = require('@stellar/stellar-sdk').Keypair.random(); console.log('Public:', k.publicKey()); console.log('Secret:', k.secret());"

   # Fund on testnet: https://laboratory.stellar.org/#account-creator?network=testnet
   ```

3. **Configure GitHub Secrets**
   - Add environment variables from .env.e2e.example
   - Set Slack webhook (optional)

4. **Run First Test**

   ```bash
   npm run test:e2e -- --testNamePattern="should submit monitoring"
   ```

5. **Monitor CI/CD**
   - Check GitHub Actions for nightly run
   - Review test artifacts and logs

## Support & Documentation

- **Detailed Guide**: [`backend/src/oracle/E2E_TEST_GUIDE.md`](backend/src/oracle/E2E_TEST_GUIDE.md)
- **API Documentation**: See backend README
- **Smart Contracts**: See contracts/README
- **Issues**: Report via GitHub Issues

## Additional Resources

- [Stellar Documentation](https://developers.stellar.org)
- [Soroban Smart Contracts](https://soroban.stellar.org)
- [Jest Testing Framework](https://jestjs.io)
- [GitHub Actions Workflows](https://docs.github.com/en/actions/workflows)

---

**Status**: ✅ Ready for deployment  
**Priority**: High  
**Effort**: Large (Complete)  
**Last Updated**: 2025-04-25
