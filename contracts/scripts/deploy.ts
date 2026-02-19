/**
 * Deploy Confidential Payroll contracts to Sepolia
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network sepolia
 *
 * Requires PRIVATE_KEY in .env (funded Sepolia wallet)
 *
 * Uses real USDC on Sepolia. No MockUSDC is deployed.
 */
import { ethers } from "hardhat";

const USDC_SEPOLIA = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // 1. Deploy ConfidentialPayrollToken (wraps real USDC on Sepolia)
  const Wrapper = await ethers.getContractFactory("ConfidentialPayrollToken");
  const wrapper = await Wrapper.deploy(
    USDC_SEPOLIA,
    "Confidential USDC",
    "cUSDC",
    ""
  );
  await wrapper.waitForDeployment();
  const wrapperAddr = await wrapper.getAddress();
  console.log("ConfidentialPayrollToken (cUSDC) deployed to:", wrapperAddr);

  // 2. Deploy PayrollFactory (token address is immutable; must use new factory with new wrapper)
  const Factory = await ethers.getContractFactory("PayrollFactory");
  const factory = await Factory.deploy(wrapperAddr);
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  console.log("PayrollFactory deployed to:", factoryAddr);

  console.log("\n=== Deployment complete ===");
  console.log("Add these to your frontend .env:");
  console.log(`VITE_USDC_ADDRESS=${USDC_SEPOLIA}`);
  console.log(`VITE_CONF_TOKEN_ADDRESS=${wrapperAddr}`);
  console.log(`VITE_PAYROLL_FACTORY_ADDRESS=${factoryAddr}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
