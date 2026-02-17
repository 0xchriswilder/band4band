import { ethers } from "ethers";
import { supabase } from "./supabase";
import PayrollFactoryABI from "./abis/PayrollFactory.json";
import ConfidentialPayrollABI from "./abis/ConfidentialPayroll.json";
import dotenv from "dotenv";
dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL!);
const FACTORY_ADDRESS = process.env.PAYROLL_FACTORY_ADDRESS!;
const POLL_INTERVAL_MS = Number(process.env.INDEXER_POLL_MS || 15000);
const CONFIRMATIONS = Number(process.env.INDEXER_CONFIRMATIONS || 2);
const MAX_PARALLEL = 5;

/* ------------------------------------------------------------
   Utilities
------------------------------------------------------------ */

async function getMeta(key: string, defaultValue = "0"): Promise<string> {
  const { data } = await supabase
    .from("indexer_meta")
    .select("value")
    .eq("key", key)
    .single();
  return data?.value ?? defaultValue;
}

async function setMeta(key: string, value: string): Promise<void> {
  await supabase
    .from("indexer_meta")
    .upsert({ key, value }, { onConflict: "key" });
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
  const lastBlockStr = await getMeta(`${FACTORY_ADDRESS}_lastIndexedBlock`, "0");
  const from = parseInt(lastBlockStr);
  const latest = await provider.getBlockNumber();
  const BLOCK_WINDOW = 50000;

  console.log(`Scanning factory events from ${from} -> ${latest}...`);
  let allEvents: ethers.EventLog[] = [];

  for (let start = from; start <= latest; start += BLOCK_WINDOW) {
    const end = Math.min(latest, start + BLOCK_WINDOW - 1);
    try {
      const chunk = await factory.queryFilter("PayrollCreated", start, end);
      allEvents = allEvents.concat(chunk as ethers.EventLog[]);
    } catch (err: any) {
      console.warn(`Failed fetching logs ${start}-${end}: ${err.message}`);
      await new Promise((res) => setTimeout(res, 2000));
    }
  }

  console.log(`Found ${allEvents.length} PayrollCreated events`);

  for (const ev of allEvents) {
    if (!(ev instanceof ethers.EventLog)) continue;
    const creator = ev.args?.[0] as string;
    const payroll = ev.args?.[1] as string;
    if (!creator || !payroll) continue;

    const deployedAtBlock = ev.blockNumber;
    await supabase.from("payrolls").upsert(
      {
        address: payroll.toLowerCase(),
        creator: creator.toLowerCase(),
        deployed_at_block: deployedAtBlock,
        last_indexed_block: deployedAtBlock,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "address" }
    );

    console.log(`Registered payroll: ${payroll} (creator ${creator}, block ${deployedAtBlock})`);
  }

  await setMeta(`${FACTORY_ADDRESS}_lastIndexedBlock`, latest.toString());
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
  const BLOCK_WINDOW = 50000;

  let from = parseInt(await getMeta(`${payrollAddress}_lastIndexedBlock`, "0"), 10);
  const latest = await provider.getBlockNumber();
  const safeToBlock = Math.max(0, latest - CONFIRMATIONS);

  if (from === 0) {
    const { data: row } = await supabase
      .from("payrolls")
      .select("deployed_at_block")
      .eq("address", payrollAddress.toLowerCase())
      .single();
    const deployedBlock = row?.deployed_at_block != null ? Number(row.deployed_at_block) : 0;
    from = deployedBlock > 0 ? deployedBlock : safeToBlock;
    console.log(`First time indexing ${payrollAddress}, starting at block ${from} (recent only, no past backfill)`);
  }

  if (safeToBlock <= from) {
    console.log(`${payrollAddress} already up-to-date`);
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

  console.log(`Indexing ${payrollAddress} from ${from} -> ${safeToBlock}...`);
  let allEvents: ethers.EventLog[] = [];

  for (let start = from; start <= safeToBlock; start += BLOCK_WINDOW) {
    const end = Math.min(safeToBlock, start + BLOCK_WINDOW - 1);
    for (const eventName of EVENT_NAMES) {
      try {
        const chunk = await contract.queryFilter(eventName, start, end);
        allEvents = allEvents.concat(chunk as ethers.EventLog[]);
      } catch (err: any) {
        console.warn(`Error fetching ${eventName} ${start}-${end}: ${err.message}`);
        await new Promise((res) => setTimeout(res, 2000));
      }
    }
  }

  console.log(`${payrollAddress}: found ${allEvents.length} events`);
  allEvents.sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index);

  for (const ev of allEvents) {
    await processEvent(ev);
  }

  await setMeta(`${payrollAddress}_lastIndexedBlock`, safeToBlock.toString());
}

/* ------------------------------------------------------------
   Master loop
------------------------------------------------------------ */

async function runIndexer() {
  console.log("Starting indexer cycle...");
  await discoverNewPayrolls();

  const { data: payrolls } = await supabase.from("payrolls").select("address");
  const list = payrolls ?? [];
  console.log(`Found ${list.length} payrolls`);

  const chunks = [];
  for (let i = 0; i < list.length; i += MAX_PARALLEL) {
    chunks.push(list.slice(i, i + MAX_PARALLEL));
  }

  for (const group of chunks) {
    await Promise.allSettled(group.map((p) => indexPayroll(p.address)));
  }

  console.log("Cycle complete. Waiting for next run...");
}

/* ------------------------------------------------------------
   Polling Loop (exported for server.ts)
------------------------------------------------------------ */

export async function startIndexerLoop() {
  while (true) {
    try {
      await runIndexer();
    } catch (err) {
      console.error("Indexer cycle error:", err);
    }
    await new Promise((res) => setTimeout(res, POLL_INTERVAL_MS));
  }
}
