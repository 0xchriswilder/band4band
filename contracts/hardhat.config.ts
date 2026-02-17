import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "@typechain/hardhat";
// import "hardhat-deploy"; // Disabled: pulls zksync-web3 which conflicts with Node 25
import "hardhat-gas-reporter";
import type { HardhatUserConfig } from "hardhat/config";
import { vars } from "hardhat/config";
import "solidity-coverage";
import "dotenv/config";

// Run 'npx hardhat vars setup' inside the contracts folder
// to see and configure required environment variables.

const MNEMONIC: string = vars.get(
  "MNEMONIC",
  "test test test test test test test test test test test junk"
);

const INFURA_API_KEY: string =
  process.env.INFURA_API_KEY ?? vars.get("INFURA_API_KEY", "");

const sepoliaDefault = INFURA_API_KEY
  ? `https://sepolia.infura.io/v3/${INFURA_API_KEY}`
  : "https://rpc.sepolia.org";
const SEPOLIA_RPC_URL: string =
  process.env.SEPOLIA_RPC_URL ?? vars.get("SEPOLIA_RPC_URL", sepoliaDefault);

// Prefer PRIVATE_KEY for Sepolia if provided (funded EOA)
// otherwise fall back to mnemonic-derived accounts.
const PRIVATE_KEY: string = process.env.PRIVATE_KEY ?? vars.get("PRIVATE_KEY", "");

const ETHERSCAN_API_KEY: string = vars.get(
  "ETHERSCAN_API_KEY",
  process.env.ETHERSCAN_API_KEY ?? ""
);

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  sourcify: {
    enabled: true,
  },
  gasReporter: {
    currency: "USD",
    enabled: process.env.REPORT_GAS ? true : false,
    excludeContracts: [],
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic: MNEMONIC,
      },
      chainId: 31337,
    },
    anvil: {
      accounts: {
        mnemonic: MNEMONIC,
        path: "m/44'/60'/0'/0/",
        count: 10,
      },
      chainId: 31337,
      url: "http://localhost:8545",
    },
    sepolia: {
      accounts: PRIVATE_KEY
        ? [PRIVATE_KEY]
        : {
            mnemonic: MNEMONIC,
            path: "m/44'/60'/0'/0/",
            count: 10,
          },
      chainId: 11155111,
      url: SEPOLIA_RPC_URL,
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    version: "0.8.27",
    settings: {
      metadata: {
        bytecodeHash: "none",
      },
      optimizer: {
        enabled: true,
        runs: 800,
      },
      viaIR: true,
      evmVersion: "cancun",
    },
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
};

export default config;

