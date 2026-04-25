/**
 * utils/test-fixtures.ts
 * Test data fixtures and builders for E2E tests
 */

import { Keypair } from "@stellar/stellar-sdk";

export interface TestProject {
  projectId: string;
  name: string;
  methodology: string;
  vintageYear: number;
  country: string;
  metadataCid: string;
}

export interface TestMonitoringData {
  projectId: string;
  period: string;
  tonnesVerified: number;
  methodologyScore: number;
  satelliteCid: string;
  submittedBy: string;
}

export interface TestOracle {
  keypair: Keypair;
  publicKey: string;
  address: string;
}

/**
 * Create a test project fixture
 */
export function createTestProject(
  overrides?: Partial<TestProject>,
): TestProject {
  const timestamp = Date.now();
  const projectId = overrides?.projectId || `test-proj-${timestamp}`;

  return {
    projectId,
    name: overrides?.name || `Test Project ${timestamp}`,
    methodology: overrides?.methodology || "VCS",
    vintageYear: overrides?.vintageYear || new Date().getFullYear(),
    country: overrides?.country || "US",
    metadataCid: overrides?.metadataCid || `QmTestMetadata${timestamp}`,
    ...overrides,
  };
}

/**
 * Create test monitoring data fixture
 */
export function createTestMonitoringData(
  projectId: string,
  submittedBy: string,
  overrides?: Partial<TestMonitoringData>,
): TestMonitoringData {
  const today = new Date();
  const period = today.toISOString().split("T")[0];

  return {
    projectId,
    period,
    tonnesVerified: overrides?.tonnesVerified || 250,
    methodologyScore: overrides?.methodologyScore || 85,
    satelliteCid:
      overrides?.satelliteCid ||
      `QmSat${Math.random().toString(36).substring(7)}`,
    submittedBy,
    ...overrides,
  };
}

/**
 * Create test oracle fixture
 */
export function createTestOracle(secretKey?: string): TestOracle {
  const keypair = secretKey ? Keypair.fromSecret(secretKey) : Keypair.random();

  return {
    keypair,
    publicKey: keypair.publicKey(),
    address: keypair.publicKey(),
  };
}

/**
 * Generate test periods (date strings in YYYY-MM-DD format)
 */
export function generateTestPeriods(count: number = 3): string[] {
  const periods: string[] = [];
  const baseDate = new Date();

  for (let i = 0; i < count; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - i * 15); // 15 days apart
    periods.push(date.toISOString().split("T")[0]);
  }

  return periods;
}

/**
 * Generate varying methodology scores for testing
 */
export function generateMethodologyScores(): number[] {
  return [
    65, // Below threshold (triggers warning)
    70, // At threshold
    80, // Above threshold
    95, // Excellent score
  ];
}

/**
 * Create monitoring data for multiple periods
 */
export function createMultiPeriodMonitoringData(
  projectId: string,
  submittedBy: string,
  periodCount: number = 3,
): TestMonitoringData[] {
  const periods = generateTestPeriods(periodCount);
  const scores = generateMethodologyScores();

  return periods.map((period, index) => ({
    projectId,
    period,
    tonnesVerified: 100 + Math.random() * 400,
    methodologyScore: scores[index % scores.length],
    satelliteCid: `QmSat${Math.random().toString(36).substring(7)}`,
    submittedBy,
  }));
}

/**
 * Data factory for batch testing
 */
export class TestDataFactory {
  private projectIdCounter = 0;
  private oracleKeypair: Keypair;

  constructor(oracleSecretKey?: string) {
    this.oracleKeypair = oracleSecretKey
      ? Keypair.fromSecret(oracleSecretKey)
      : Keypair.random();
  }

  getOraclePublicKey(): string {
    return this.oracleKeypair.publicKey();
  }

  createProject(overrides?: Partial<TestProject>): TestProject {
    const id = ++this.projectIdCounter;
    return createTestProject({
      projectId: `test-proj-${Date.now()}-${id}`,
      ...overrides,
    });
  }

  createMonitoringData(
    projectId: string,
    overrides?: Partial<TestMonitoringData>,
  ): TestMonitoringData {
    return createTestMonitoringData(
      projectId,
      this.getOraclePublicKey(),
      overrides,
    );
  }

  createMonitoringBatch(
    projectId: string,
    count: number = 3,
  ): TestMonitoringData[] {
    return createMultiPeriodMonitoringData(
      projectId,
      this.getOraclePublicKey(),
      count,
    );
  }
}

/**
 * Validation helpers for test assertions
 */
export class TestDataValidator {
  static isValidProjectId(projectId: string): boolean {
    return projectId.length > 0 && typeof projectId === "string";
  }

  static isValidPeriod(period: string): boolean {
    // Check YYYY-MM-DD format
    return /^\d{4}-\d{2}-\d{2}$/.test(period);
  }

  static isValidMethodologyScore(score: number): boolean {
    return score >= 0 && score <= 100;
  }

  static isValidTonnes(tonnes: number): boolean {
    return tonnes > 0 && tonnes < 1_000_000;
  }

  static isValidCid(cid: string): boolean {
    return cid.startsWith("Qm") && cid.length > 20;
  }

  static validateMonitoringData(data: TestMonitoringData): boolean {
    return (
      this.isValidProjectId(data.projectId) &&
      this.isValidPeriod(data.period) &&
      this.isValidTonnes(data.tonnesVerified) &&
      this.isValidMethodologyScore(data.methodologyScore) &&
      this.isValidCid(data.satelliteCid)
    );
  }
}
