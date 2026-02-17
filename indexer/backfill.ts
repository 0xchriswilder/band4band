/**
 * One-time backfill script: scan specific blocks and insert events into Supabase.
 * Use when blocks have already passed and you need to populate historical data.
 *
 * Usage:
 *   BLOCK_FROM=10280482 BLOCK_TO=10280825 npx ts-node backfill.ts
 *   # or with defaults (blocks from your screenshot):
 *   npx ts-node backfill.ts
 */

import { ethers } from "ethers";
import { supabase } from "./supabase";
import PayrollFactoryABI from "./abis/PayrollFactory.json";
import ConfidentialPayrollABI from "./abis/ConfidentialPayroll.json";
import dotenv from "dotenv";
dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL!);
const FACTORY_ADDRESS = process.env.PAYROLL_FACTORY_ADDRESS!;

const BLOCK_FROM = parseInt(process.env.BLOCK_FROM || "10280482", 10);
const BLOCK_TO = parseInt(process.env.BLOCK_TO || "10280825", 10);

/* ------------------------------------------------------------
   Event Handlers (same logic as indexer.ts)
------------------------------------------------------------ */

async function handleEmployeeOnboarded(event: ethers.EventLog) {
  const [employer, employee, encryptedSalary, inputProof, signature] = event.args!;
  console.log("  EmployeeOnboarded:", employee, "block:", event.blockNumber);

  await supabase.from("employees").upsert(
    {
      address: employee.toLowerCase(),
      employer: employer.toLowerCase(),
      whitelisted: true,
      encrypted_salary: encryptedSalary,
      input_proof: inputProof,
      signature: signature,
      removed_at: null,
    },
    { onConflict: "address" }
  );
}

async function handleEmployeeUpdated(event: ethers.EventLog) {
  const [employer, employee, encryptedSalary, inputProof, signature, timestamp, txHash, payrollAddress] = event.args!;
  console.log("  EmployeeUpdated:", employee, "block:", event.blockNumber);

  await supabase
    .from("employees")
    .update({
      encrypted_salary: encryptedSalary,
      input_proof: inputProof,
      signature: signature,
    })
    .eq("address", employee.toLowerCase())
    .eq("employer", employer.toLowerCase());

  const blockNumber = event.blockNumber!;
  const ts = timestamp != null ? Number(timestamp) : null;
  const block = await provider.getBlock(blockNumber);
  const blockTimestamp = ts ?? (block?.timestamp ? Number(block.timestamp) : Math.floor(Date.now() / 1000));

  const payrollAddr = (payrollAddress && String(payrollAddress).toLowerCase()) || (event.address && String(event.address).toLowerCase()) || "";
  const { error: historyError } = await supabase.from("salary_updates").insert({
    employer: employer.toLowerCase(),
    employee: employee.toLowerCase(),
    encrypted_salary: encryptedSalary,
    tx_hash: event.transactionHash,
    block_number: blockNumber,
    timestamp: new Date(blockTimestamp * 1000).toISOString(),
    payroll_address: payrollAddr,
  });

  if (historyError) {
    console.error("Failed to insert salary update history:", historyError.message);
  }
}

async function handleEmployeeRemoved(event: ethers.EventLog) {
  const [employee] = event.args!;
  console.log("  EmployeeRemoved:", employee, "block:", event.blockNumber);

  await supabase
    .from("employees")
    .update({ whitelisted: false, removed_at: new Date().toISOString() })
    .eq("address", employee.toLowerCase());
}

async function handleSalaryPaid(event: ethers.EventLog) {
  const [employer, employee, idx, encryptedAmount, timestamp, txHash, payrollAddress] = event.args!;
  const blockNumber = event.blockNumber!;
  const block = await provider.getBlock(blockNumber);
  const blockTimestamp = block?.timestamp ? Number(block.timestamp) : Math.floor(Date.now() / 1000);

  const { error } = await supabase.from("salary_payments").upsert(
    {
      employer: employer.toLowerCase(),
      employee: employee.toLowerCase(),
      tx_hash: event.transactionHash,
      block_number: blockNumber,
      encrypted: encryptedAmount,
      timestamp: new Date(blockTimestamp * 1000).toISOString(),
      payroll_address: payrollAddress.toLowerCase(),
    },
    { onConflict: "tx_hash,employee" }
  );

  if (error) {
    console.error("Failed to upsert salary payment:", error.message);
  } else {
    console.log(`  Stored salary payment for ${employee} (block ${blockNumber})`);
  }

  const { data: existingRun } = await supabase
    .from("payroll_runs")
    .select("id, employee_count")
    .eq("tx_hash", event.transactionHash)
    .single();

  if (existingRun) {
    await supabase
      .from("payroll_runs")
      .update({ employee_count: existingRun.employee_count + 1 })
      .eq("tx_hash", event.transactionHash);
  } else {
    const { error: runError } = await supabase.from("payroll_runs").insert({
      employer: employer.toLowerCase(),
      tx_hash: event.transactionHash,
      block_number: blockNumber,
      employee_count: 1,
      timestamp: new Date(blockTimestamp * 1000).toISOString(),
      payroll_address: payrollAddress.toLowerCase(),
    });
    if (runError) {
      console.error("Failed to insert payroll run:", runError.message);
    }
  }
}

async function handleEmployeeWhitelisted(event: ethers.EventLog) {
  const [employee] = event.args!;
  console.log("  EmployeeWhitelisted:", employee, "block:", event.blockNumber);
  await supabase
    .from("employees")
    .update({ whitelisted: true, removed_at: null })
    .eq("address", employee.toLowerCase());
}

async function handleSalaryClaimed(event: ethers.EventLog) {
  const [employee, encryptedAmount, timestamp, txHash] = event.args!;
  console.log("  SalaryClaimed:", employee, "block:", event.blockNumber);
  const txHashStr = typeof txHash === "string" ? txHash : (txHash as any)?.hex ?? String(txHash);
  await supabase
    .from("salary_payments")
    .update({ claimed: true })
    .eq("employee", employee.toLowerCase())
    .eq("tx_hash", txHashStr);
}

// SalaryPaid topic0 hash
const SALARY_PAID_TOPIC = ethers.id("SalaryPaid(address,address,uint256,bytes32,uint256,bytes32,address)");

// ConfidentialTransfer topic0: ConfidentialTransfer(address indexed from, address indexed to, bytes32 indexed amount)
const CONF_TRANSFER_TOPIC = "0x67500e8d0ed826d2194f514dd0d8124f35648ab6e3fb5e6ed867134cffe661e9";

async function getEncryptedAmountFromReceipt(txHash: string, employeeAddr: string): Promise<string> {
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) return "";
  const empPadded = "0x" + employeeAddr.toLowerCase().replace("0x", "").padStart(64, "0");
  for (const receiptLog of receipt.logs) {
    if (
      receiptLog.topics[0] === CONF_TRANSFER_TOPIC &&
      receiptLog.topics[2]?.toLowerCase() === empPadded
    ) {
      return receiptLog.topics[3] ?? "";
    }
  }
  return "";
}

async function handleRawSalaryPaid(log: ethers.Log) {
  const employer = ethers.getAddress("0x" + log.topics[1].slice(26));
  const employee = ethers.getAddress("0x" + log.topics[2].slice(26));
  const payrollAddress = log.address.toLowerCase();

  const blockNumber = log.blockNumber;
  const block = await provider.getBlock(blockNumber);
  const blockTimestamp = block?.timestamp ? Number(block.timestamp) : Math.floor(Date.now() / 1000);

  // Get the real FHE ciphertext handle from ConfidentialTransfer event in the same tx
  const encryptedAmount = await getEncryptedAmountFromReceipt(log.transactionHash, employee);

  console.log(`  SalaryPaid (raw): ${employee} on ${payrollAddress} block ${blockNumber} handle: ${encryptedAmount.slice(0, 18)}...`);

  const { error } = await supabase.from("salary_payments").upsert(
    {
      employer: employer.toLowerCase(),
      employee: employee.toLowerCase(),
      tx_hash: log.transactionHash,
      block_number: blockNumber,
      encrypted: encryptedAmount,
      timestamp: new Date(blockTimestamp * 1000).toISOString(),
      payroll_address: payrollAddress,
    },
    { onConflict: "tx_hash,employee" }
  );

  if (error) {
    console.error("Failed to upsert salary payment:", error.message);
  }

  // payroll_runs
  const { data: existingRun } = await supabase
    .from("payroll_runs")
    .select("id, employee_count")
    .eq("tx_hash", log.transactionHash)
    .single();

  if (existingRun) {
    await supabase
      .from("payroll_runs")
      .update({ employee_count: existingRun.employee_count + 1 })
      .eq("tx_hash", log.transactionHash);
  } else {
    await supabase.from("payroll_runs").insert({
      employer: employer.toLowerCase(),
      tx_hash: log.transactionHash,
      block_number: blockNumber,
      employee_count: 1,
      timestamp: new Date(blockTimestamp * 1000).toISOString(),
      payroll_address: payrollAddress,
    });
  }
}

async function processEvent(event: ethers.EventLog | ethers.Log) {
  const name = (event as ethers.EventLog).eventName;
  const topic0 = (event as any).topics?.[0];
  try {
    if (name) {
      switch (name) {
        case "EmployeeOnboarded":
          await handleEmployeeOnboarded(event as ethers.EventLog);
          break;
        case "EmployeeUpdated":
          await handleEmployeeUpdated(event as ethers.EventLog);
          break;
        case "EmployeeRemoved":
          await handleEmployeeRemoved(event as ethers.EventLog);
          break;
        case "EmployeeWhitelisted":
          await handleEmployeeWhitelisted(event as ethers.EventLog);
          break;
        case "SalaryPaid":
          await handleSalaryPaid(event as ethers.EventLog);
          break;
        case "SalaryClaimed":
          await handleSalaryClaimed(event as ethers.EventLog);
          break;
        default:
          console.log("  Unhandled event:", name, "topic0:", topic0);
      }
    } else if (topic0 === SALARY_PAID_TOPIC) {
      await handleRawSalaryPaid(event as ethers.Log);
    } else {
      console.log("  Unhandled event: (unknown) topic0:", topic0);
    }
  } catch (err) {
    console.error(`Error processing ${name ?? "unknown"}:`, err);
  }
}

/* ------------------------------------------------------------
   Backfill logic
------------------------------------------------------------ */

async function runBackfill() {
  console.log("=== Backfill: blocks", BLOCK_FROM, "->", BLOCK_TO, "===\n");

  const factory = new ethers.Contract(
    FACTORY_ADDRESS,
    PayrollFactoryABI.abi,
    provider
  );

  // 1. Scan factory for PayrollCreated in block range
  console.log("Scanning factory for PayrollCreated...");
  const factoryEvents = await factory.queryFilter("PayrollCreated", BLOCK_FROM, BLOCK_TO) as ethers.EventLog[];
  console.log(`Found ${factoryEvents.length} PayrollCreated events\n`);

  const payrollAddresses = new Set<string>();
  for (const ev of factoryEvents) {
    if (!(ev instanceof ethers.EventLog)) continue;
    const creator = ev.args?.[0] as string;
    const payroll = ev.args?.[1] as string;
    if (!creator || !payroll) continue;

    payrollAddresses.add(payroll.toLowerCase());

    await supabase.from("payrolls").upsert(
      {
        address: payroll.toLowerCase(),
        creator: creator.toLowerCase(),
        deployed_at_block: ev.blockNumber,
        last_indexed_block: ev.blockNumber,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "address" }
    );
    console.log("Registered payroll:", payroll, "(creator:", creator, ")");
  }

  // 2. Also get existing payrolls from DB (in case factory events are outside this range)
  const { data: existingPayrolls } = await supabase.from("payrolls").select("address");
  for (const p of existingPayrolls ?? []) {
    payrollAddresses.add(p.address.toLowerCase());
  }

  if (payrollAddresses.size === 0) {
    console.log("\nNo payroll contracts found. Exiting.");
    return;
  }

  // 3. For each payroll, scan each event type individually (avoids euint64 decode issues with wildcard)
  const EVENT_NAMES = [
    "EmployeeOnboarded",
    "EmployeeUpdated",
    "EmployeeRemoved",
    "EmployeeWhitelisted",
    "SalaryPaid",
    "SalaryClaimed",
  ];

  let totalEvents = 0;
  for (const addr of payrollAddresses) {
    const contract = new ethers.Contract(addr, ConfidentialPayrollABI.abi, provider);
    console.log(`\nIndexing payroll ${addr} (blocks ${BLOCK_FROM}-${BLOCK_TO})...`);

    let allEvents: ethers.EventLog[] = [];
    for (const eventName of EVENT_NAMES) {
      try {
        const events = await contract.queryFilter(eventName, BLOCK_FROM, BLOCK_TO) as ethers.EventLog[];
        console.log(`  ${eventName}: ${events.length} events`);
        allEvents = allEvents.concat(events);
      } catch (err: any) {
        console.warn(`  ${eventName}: query failed — ${err.message}`);
      }
    }

    allEvents.sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index);
    console.log(`  Total: ${allEvents.length} events`);

    for (const ev of allEvents) {
      await processEvent(ev);
      totalEvents++;
    }
  }

  console.log("\n=== Backfill complete. Processed", totalEvents, "events ===");
}

runBackfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
