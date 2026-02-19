import { ethers } from "ethers";
import { supabase } from "./supabase";
import PayrollFactoryABI from "./abis/PayrollFactory.json";
import ConfidentialPayrollABI from "./abis/ConfidentialPayroll.json";
import dotenv from "dotenv";
dotenv.config();

const RPC_URL = process.env.RPC_URL || process.env.ALCHEMY_RPC_URL || process.env.VITE_SEPOLIA_RPC_URL;
const provider = new ethers.JsonRpcProvider(RPC_URL!);
const FACTORY_ADDRESS = process.env.PAYROLL_FACTORY_ADDRESS!;
/** Delay between indexer cycles (ms). 0 = no pause, run continuously; env INDEXER_POLL_MS overrides. */
const POLL_INTERVAL_MS = Number(process.env.INDEXER_POLL_MS ?? 0);
/** Blocks to wait for finality (0 = index up to latest block for real-time). */
const CONFIRMATIONS = Number(process.env.INDEXER_CONFIRMATIONS || 0);
const MAX_PARALLEL = 5;
/** Block range per RPC request. Live-only mode: we scan new blocks only, 10 at a time. */
const BLOCK_WINDOW = Number(process.env.INDEXER_BLOCK_WINDOW || 10);

/* ------------------------------------------------------------
   Utilities (in-memory only — no Supabase for indexer state)
------------------------------------------------------------ */

const metaStore = new Map<string, string>();

function getMeta(key: string, defaultValue = "0"): string {
  return metaStore.get(key) ?? defaultValue;
}

function setMeta(key: string, value: string): void {
  metaStore.set(key, value);
}

/* ------------------------------------------------------------
   Event Handlers
------------------------------------------------------------ */

async function handleEmployeeOnboarded(event: ethers.EventLog) {
  const [employer, employee, encryptedSalary, inputProof, signature] = event.args!;
  console.log("EmployeeOnboarded:", employee, "block:", event.blockNumber);

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
  console.log("EmployeeUpdated:", employee, "block:", event.blockNumber);

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
  console.log("EmployeeRemoved:", employee, "block:", event.blockNumber);

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
    console.log(
      `Stored salary payment for ${employee} on payroll ${payrollAddress} (block ${blockNumber})`
    );
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
  console.log("EmployeeWhitelisted:", employee, "block:", event.blockNumber);
  await supabase
    .from("employees")
    .update({ whitelisted: true, removed_at: null })
    .eq("address", employee.toLowerCase());
}

async function handleSalaryClaimed(event: ethers.EventLog) {
  const [employee, encryptedAmount, timestamp, txHash] = event.args!;
  console.log("SalaryClaimed:", employee, "block:", event.blockNumber);
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

  console.log(`SalaryPaid (raw): ${employee} on ${payrollAddress} block ${blockNumber} handle: ${encryptedAmount.slice(0, 18)}...`);

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
          console.log("Unhandled event:", name, "topic0:", topic0);
      }
    } else if (topic0 === SALARY_PAID_TOPIC) {
      await handleRawSalaryPaid(event as ethers.Log);
    } else {
      console.log("Unhandled event: (unknown) topic0:", topic0);
    }
  } catch (err) {
    console.error(`Error processing ${name ?? "unknown"}:`, err);
  }
}

/* ------------------------------------------------------------
   Factory scanner
------------------------------------------------------------ */

async function discoverNewPayrolls() {
  const factory = new ethers.Contract(
    FACTORY_ADDRESS,
    PayrollFactoryABI.abi,
    provider
  );
  const lastBlockStr = getMeta(`${FACTORY_ADDRESS}_lastIndexedBlock`, "0");
  let from = parseInt(lastBlockStr, 10);
  const latest = await provider.getBlockNumber();

  if (from === 0) {
    setMeta(`${FACTORY_ADDRESS}_lastIndexedBlock`, latest.toString());
    return;
  }

  let allEvents: ethers.EventLog[] = [];
  if (from < latest) {
    for (let start = from; start <= latest; start += BLOCK_WINDOW) {
      const end = Math.min(latest, start + BLOCK_WINDOW - 1);
      try {
        const chunk = await factory.queryFilter("PayrollCreated", start, end);
        allEvents = allEvents.concat(chunk as ethers.EventLog[]);
      } catch (err: any) {
        console.warn(`Failed fetching logs ${start}-${end}: ${err.message}`);
        await new Promise((res) => setTimeout(res, 500));
      }
    }
  }

  for (const ev of allEvents) {
    if (!(ev instanceof ethers.EventLog)) continue;
    const creator = ev.args?.[0] as string;
    const payroll = ev.args?.[1] as string;
    if (!creator || !payroll) continue;

    const deployedAtBlock = ev.blockNumber;
    const payrollAddr = payroll.toLowerCase();
    setMeta(`${payrollAddr}_lastIndexedBlock`, (deployedAtBlock - 1).toString());
    supabase.from("payrolls").upsert(
      {
        address: payrollAddr,
        creator: creator.toLowerCase(),
        deployed_at_block: deployedAtBlock,
        last_indexed_block: deployedAtBlock,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "address" }
    ).then(({ error }) => { if (error) console.error("Supabase upsert payroll:", error.message); });
    console.log(`Registered payroll: ${payroll} (creator ${creator}, block ${deployedAtBlock})`);
  }

  setMeta(`${FACTORY_ADDRESS}_lastIndexedBlock`, latest.toString());
}

/* ------------------------------------------------------------
   Per-payroll indexer
------------------------------------------------------------ */

async function indexPayroll(payrollAddress: string) {
  const contract = new ethers.Contract(
    payrollAddress,
    ConfidentialPayrollABI.abi,
    provider
  );

  let from = parseInt(getMeta(`${payrollAddress}_lastIndexedBlock`, "0"), 10);
  const latest = await provider.getBlockNumber();
  const safeToBlock = Math.max(0, latest - CONFIRMATIONS);

  if (from === 0) {
    setMeta(`${payrollAddress}_lastIndexedBlock`, safeToBlock.toString());
    return;
  }

  if (safeToBlock <= from) {
    return;
  }

  const EVENT_NAMES = [
    "EmployeeOnboarded",
    "EmployeeUpdated",
    "EmployeeRemoved",
    "EmployeeWhitelisted",
    "SalaryPaid",
    "SalaryClaimed",
  ];

  let allEvents: ethers.EventLog[] = [];

  for (let start = from; start <= safeToBlock; start += BLOCK_WINDOW) {
    const end = Math.min(safeToBlock, start + BLOCK_WINDOW - 1);
    for (const eventName of EVENT_NAMES) {
      try {
        const chunk = await contract.queryFilter(eventName, start, end);
        allEvents = allEvents.concat(chunk as ethers.EventLog[]);
      } catch (err: any) {
        console.warn(`Error fetching ${eventName} ${start}-${end}: ${err.message}`);
        await new Promise((res) => setTimeout(res, 500));
      }
    }
  }

  if (allEvents.length > 0) {
    console.log(`${payrollAddress}: ${allEvents.length} event(s)`);
  }
  allEvents.sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index);

  for (const ev of allEvents) {
    await processEvent(ev);
  }

  setMeta(`${payrollAddress}_lastIndexedBlock`, safeToBlock.toString());
}

/* ------------------------------------------------------------
   Master loop
------------------------------------------------------------ */

/** Get list of payroll addresses from the factory contract (chain), not Supabase. */
async function getPayrollAddressesFromChain(): Promise<string[]> {
  const factory = new ethers.Contract(
    FACTORY_ADDRESS,
    PayrollFactoryABI.abi,
    provider
  );
  const employers = (await factory.getAllEmployers()) as string[];
  const addresses: string[] = [];
  for (const emp of employers) {
    const payroll = (await factory.getPayroll(emp)) as string;
    if (payroll && ethers.getAddress(payroll) !== ethers.ZeroAddress) {
      addresses.push(payroll.toLowerCase());
    }
  }
  return addresses;
}

function shortError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("<!DOCTYPE") || msg.length > 200) {
    return msg.slice(0, 120) + "...";
  }
  return msg;
}

async function runIndexer(): Promise<{ payrollCount: number }> {
  await discoverNewPayrolls();

  let list: string[] = [];
  try {
    list = await getPayrollAddressesFromChain();
  } catch (err: any) {
    console.error("Chain payroll list error:", shortError(err));
  }

  const chunks = [];
  for (let i = 0; i < list.length; i += MAX_PARALLEL) {
    chunks.push(list.slice(i, i + MAX_PARALLEL));
  }

  for (const group of chunks) {
    await Promise.allSettled(group.map((address) => indexPayroll(address)));
  }
  return { payrollCount: list.length };
}

/* ------------------------------------------------------------
   Polling Loop (exported for server.ts)
------------------------------------------------------------ */

export async function startIndexerLoop() {
  while (true) {
    try {
      await runIndexer();
    } catch (err) {
      console.error("Indexer error:", err);
    }
    if (POLL_INTERVAL_MS > 0) {
      await new Promise((res) => setTimeout(res, POLL_INTERVAL_MS));
    }
  }
}
