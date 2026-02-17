/**
 * Deploy Confidential Payroll contracts to Sepolia
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network sepolia
 *
 * Requires PRIVATE_KEY in .env (funded Sepolia wallet)
 */
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // 1. Deploy MockUSDC (for testing; use real USDC address for mainnet)
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddr = await usdc.getAddress();
  console.log("MockUSDC deployed to:", usdcAddr);

  // Mint initial supply to deployer
  const MINT_AMOUNT = 10_000_000_000n; // 10,000 USDC (6 decimals)
  await usdc.mint(deployer.address, MINT_AMOUNT);
  console.log("Minted", MINT_AMOUNT.toString(), "USDC to deployer");

  // 2. Deploy ConfidentialPayrollToken
  const Wrapper = await ethers.getContractFactory("ConfidentialPayrollToken");
  const wrapper = await Wrapper.deploy(
    usdcAddr,
    "Confidential USDC Payroll",
    "cUSDCP",
    ""
  );
  await wrapper.waitForDeployment();
  const wrapperAddr = await wrapper.getAddress();
  console.log("ConfidentialPayrollToken (cUSDCP) deployed to:", wrapperAddr);

  // 3. Deploy PayrollFactory
  const Factory = await ethers.getContractFactory("PayrollFactory");
  const factory = await Factory.deploy(wrapperAddr);
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  console.log("PayrollFactory deployed to:", factoryAddr);

  console.log("\n=== Deployment complete ===");
  console.log("Add these to your frontend .env:");
  console.log(`VITE_PAYROLL_FACTORY_ADDRESS=${factoryAddr}`);
  console.log(`VITE_CONF_TOKEN_ADDRESS=${wrapperAddr}`);
  console.log(`VITE_USDC_ADDRESS=${usdcAddr}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
