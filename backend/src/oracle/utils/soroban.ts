/**
 * utils/soroban.ts
 * Soroban contract interaction utilities for E2E tests
 */

import {
  Keypair,
  Network,
  SorobanServer,
  TransactionBuilder,
  scval,
  Address,
  Horizon,
} from "@stellar/stellar-sdk";

export interface ContractInvokeParams {
  contractId: string;
  method: string;
  args: any[];
  signerKeypair: Keypair;
  networkPassphrase: string;
  rpcUrl: string;
  horizonUrl?: string;
}

/**
 * Invoke a Soroban contract method and wait for confirmation
 */
export async function invokeContractMethod(
  params: ContractInvokeParams,
): Promise<any> {
  const {
    contractId,
    method,
    args,
    signerKeypair,
    networkPassphrase,
    rpcUrl,
    horizonUrl,
  } = params;

  const sorobanServer = new SorobanServer(rpcUrl);

  try {
    // Get source account
    const sourceAccount = await sorobanServer.getAccount(
      signerKeypair.publicKey(),
    );

    // Build contract invocation transaction
    const tx = new TransactionBuilder(sourceAccount, {
      fee: "100",
      networkPassphrase,
    })
      .addOperation(
        require("@stellar/stellar-sdk").Contract.invokeHostFunction({
          contract: new Address(contractId),
          method,
          args: convertArgsToScval(args),
          auth: [], // Add auth envelopes if needed
        }),
      )
      .setTimeout(30)
      .build();

    // Simulate transaction
    const simResult = await sorobanServer.simulateTransaction(tx);

    if ("error" in simResult) {
      throw new Error(`Simulation failed: ${simResult.error}`);
    }

    if (simResult.error) {
      throw new Error(`Simulation error: ${simResult.error}`);
    }

    // Prepare and sign transaction
    const preparedTx = SorobanServer.prepareTransaction(
      tx,
      networkPassphrase,
      simResult,
    );
    preparedTx.sign(signerKeypair);

    // Submit transaction
    const submitResult = await sorobanServer.sendTransaction(preparedTx);

    if (submitResult.status === "PENDING") {
      // Wait for confirmation
      return await waitForTransactionConfirmation(
        sorobanServer,
        submitResult.id,
        horizonUrl,
      );
    }

    return submitResult;
  } catch (error: any) {
    console.error(`Contract invocation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Convert JS values to Soroban contract values (scval)
 */
function convertArgsToScval(args: any[]): any[] {
  return args.map((arg) => {
    if (typeof arg === "string") {
      return scval.nativeToScval(arg);
    } else if (typeof arg === "number") {
      return scval.nativeToScval(arg);
    } else if (typeof arg === "boolean") {
      return scval.nativeToScval(arg);
    } else if (arg instanceof Address) {
      return arg.toScVal();
    }
    return arg;
  });
}

/**
 * Wait for transaction confirmation on Stellar Testnet
 */
export async function waitForTransactionConfirmation(
  sorobanServer: SorobanServer,
  txId: string,
  horizonUrl?: string,
  maxAttempts = 60,
): Promise<any> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await sorobanServer.getTransaction(txId);

      if (response.status === "SUCCESS") {
        console.log(`✓ Transaction confirmed: ${txId}`);
        return response;
      } else if (response.status === "FAILED") {
        throw new Error(`Transaction failed: ${response.resultXdr}`);
      }

      // Still pending, wait and retry
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    } catch (error: any) {
      if (error.message.includes("not found")) {
        // Transaction not yet recorded, wait and retry
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;
      } else {
        throw error;
      }
    }
  }

  throw new Error(
    `Transaction confirmation timeout after ${maxAttempts} attempts`,
  );
}

/**
 * Query contract state (read-only)
 */
export async function queryContractState(
  params: ContractInvokeParams,
): Promise<any> {
  const { contractId, method, args, signerKeypair, networkPassphrase, rpcUrl } =
    params;

  const sorobanServer = new SorobanServer(rpcUrl);

  try {
    const sourceAccount = await sorobanServer.getAccount(
      signerKeypair.publicKey(),
    );

    const tx = new TransactionBuilder(sourceAccount, {
      fee: "100",
      networkPassphrase,
    })
      .addOperation(
        require("@stellar/stellar-sdk").Contract.invokeHostFunction({
          contract: new Address(contractId),
          method,
          args: convertArgsToScval(args),
          auth: [],
        }),
      )
      .setTimeout(30)
      .build();

    const simResult = await sorobanServer.simulateTransaction(tx);

    if ("error" in simResult) {
      throw new Error(`Query failed: ${simResult.error}`);
    }

    // Return the result from simulation (no need to send)
    return simResult.results?.[0]?.result?.retval;
  } catch (error: any) {
    console.error(`Contract query failed: ${error.message}`);
    throw error;
  }
}

/**
 * Helper: Parse scval boolean result
 */
export function parseScvalBool(scval: any): boolean {
  try {
    return scval.result.retval.b(); // Access the boolean value
  } catch {
    return false;
  }
}

/**
 * Helper: Parse scval i128 result
 */
export function parseScvalI128(scval: any): bigint {
  try {
    return BigInt(scval.result.retval.i128().toString());
  } catch {
    return BigInt(0);
  }
}

/**
 * Helper: Parse scval string result
 */
export function parseScvalString(scval: any): string {
  try {
    return scval.result.retval.str().toString();
  } catch {
    return "";
  }
}

/**
 * Generate a random satellite CID for testing
 */
export function generateTestCid(): string {
  const characters =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let cid = "Qm";
  for (let i = 0; i < 44; i++) {
    cid += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return cid;
}
