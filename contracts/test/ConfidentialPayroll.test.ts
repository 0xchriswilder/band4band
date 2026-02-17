import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * Confidential Payroll Test Suite
 *
 * Contracts under test:
 *  - MockUSDC            – plain ERC-20 with 6 decimals (test only)
 *  - ConfidentialPayrollToken – ERC-7984 wrapper (USDC → cUSDC)
 *  - PayrollFactory      – deploys per-employer Payroll contracts
 *  - Payroll             – FHE-aware payroll (onboard, update, remove, pay)
 */
describe("Confidential Payroll", function () {
  let usdc: any;
  let wrapper: any;
  let factory: any;
  let payroll: any;

  let deployer: HardhatEthersSigner;
  let employer: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let charlie: HardhatEthersSigner;

  const INITIAL_MINT = 10_000_000_000n; // 10 000 USDC (6 decimals)
  const WRAP_AMOUNT = 5_000_000_000n;   // 5 000 USDC
  const SALARY = 2_500_000_000n;        // 2 500 USDC

  beforeEach(async function () {
    [deployer, employer, alice, bob, charlie] = await ethers.getSigners();

    // 1. Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    // 2. Deploy ConfidentialPayrollToken (ERC-7984 wrapper)
    const Wrapper = await ethers.getContractFactory("ConfidentialPayrollToken");
    wrapper = await Wrapper.deploy(
      await usdc.getAddress(),
      "Confidential USDC Payroll",
      "cUSDCP",
      ""
    );
    await wrapper.waitForDeployment();

    // 3. Deploy PayrollFactory
    const Factory = await ethers.getContractFactory("PayrollFactory");
    factory = await Factory.deploy(await wrapper.getAddress());
    await factory.waitForDeployment();

    // 4. Employer registers → gets a Payroll contract
    const tx = await factory.connect(employer).registerEmployer();
    const receipt = await tx.wait();
    const event = receipt?.logs.find((log: any) => {
      try {
        return factory.interface.parseLog(log)?.name === "PayrollCreated";
      } catch {
        return false;
      }
    });
    const payrollAddr = factory.interface.parseLog(event)?.args.payroll;
    payroll = await ethers.getContractAt("Payroll", payrollAddr);

    // 5. Mint USDC to employer & employees
    await usdc.mint(employer.address, INITIAL_MINT);
    await usdc.mint(alice.address, INITIAL_MINT);
    await usdc.mint(bob.address, INITIAL_MINT);
    await usdc.mint(charlie.address, INITIAL_MINT);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //                   CONFIDENTIAL PAYROLL TOKEN (ERC-7984)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("ConfidentialPayrollToken", function () {
    describe("Deployment", function () {
      it("should have correct name", async function () {
        expect(await wrapper.name()).to.equal("Confidential USDC Payroll");
      });

      it("should have correct symbol", async function () {
        expect(await wrapper.symbol()).to.equal("cUSDCP");
      });

      it("should have correct underlying token", async function () {
        expect(await wrapper.underlying()).to.equal(await usdc.getAddress());
      });

      it("should have 6 decimals matching USDC", async function () {
        expect(await wrapper.decimals()).to.equal(6);
      });
    });

    describe("Wrapping USDC → cUSDCP", function () {
      const wrapAmount = 500_000_000n; // 500 USDC

      beforeEach(async function () {
        await usdc.connect(employer).approve(await wrapper.getAddress(), wrapAmount);
      });

      it("should wrap USDC into cUSDCP", async function () {
        const wrapperAddr = await wrapper.getAddress();
        const balBefore = await usdc.balanceOf(employer.address);

        await wrapper.connect(employer).wrap(employer.address, wrapAmount);

        expect(await usdc.balanceOf(wrapperAddr)).to.equal(wrapAmount);
        expect(await usdc.balanceOf(employer.address)).to.equal(balBefore - wrapAmount);
      });

      it("should create encrypted balance after wrap", async function () {
        await wrapper.connect(employer).wrap(employer.address, wrapAmount);

        const handle = await wrapper.confidentialBalanceOf(employer.address);
        expect(handle).to.not.equal(ethers.ZeroHash);
      });

      it("should decrypt to correct wrapped amount", async function () {
        await wrapper.connect(employer).wrap(employer.address, wrapAmount);

        const handle = await wrapper.confidentialBalanceOf(employer.address);
        const decrypted = await fhevm.userDecryptEuint(
          FhevmType.euint64,
          handle,
          await wrapper.getAddress(),
          employer
        );

        expect(decrypted).to.equal(wrapAmount);
      });

      it("should revert on insufficient allowance", async function () {
        await expect(
          wrapper.connect(employer).wrap(employer.address, wrapAmount + 1n)
        ).to.be.reverted;
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //                          PAYROLL FACTORY
  // ═══════════════════════════════════════════════════════════════════════════

  describe("PayrollFactory", function () {
    it("should deploy payroll for employer", async function () {
      const payrollAddr = await factory.getPayroll(employer.address);
      expect(payrollAddr).to.not.equal(ethers.ZeroAddress);
    });

    it("should track employer in allEmployers list", async function () {
      expect(await factory.totalEmployers()).to.equal(1);
      const all = await factory.getAllEmployers();
      expect(all[0]).to.equal(employer.address);
    });

    it("should revert duplicate registration", async function () {
      await expect(
        factory.connect(employer).registerEmployer()
      ).to.be.revertedWith("Already registered");
    });

    it("should allow a second employer to register", async function () {
      await factory.connect(alice).registerEmployer();
      expect(await factory.totalEmployers()).to.equal(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //                          PAYROLL CONTRACT
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Payroll", function () {
    describe("Deployment", function () {
      it("should set correct employer", async function () {
        expect(await payroll.employer()).to.equal(employer.address);
      });

      it("should set correct confidential token", async function () {
        expect(await payroll.confidentialToken()).to.equal(
          await wrapper.getAddress()
        );
      });
    });

    // ─── Employee Onboarding ───────────────────────────────────────────────

    describe("Onboarding", function () {
      it("should onboard a single employee", async function () {
        const payrollAddr = await payroll.getAddress();

        const input = await fhevm.createEncryptedInput(payrollAddr, employer.address);
        input.add64(SALARY);
        const encrypted = await input.encrypt();

        const tx = await payroll.connect(employer).onboardEmployee(
          alice.address,
          encrypted.handles[0],
          encrypted.inputProof,
          "0x"
        );
        const receipt = await tx.wait();

        const event = receipt?.logs.find((log: any) => {
          try {
            return payroll.interface.parseLog(log)?.name === "EmployeeOnboarded";
          } catch {
            return false;
          }
        });
        expect(event).to.not.be.undefined;
        expect(await payroll.whitelisted(alice.address)).to.be.true;
      });

      it("should batch-onboard employees", async function () {
        const payrollAddr = await payroll.getAddress();

        const input1 = await fhevm.createEncryptedInput(payrollAddr, employer.address);
        input1.add64(SALARY);
        const enc1 = await input1.encrypt();

        const input2 = await fhevm.createEncryptedInput(payrollAddr, employer.address);
        input2.add64(SALARY);
        const enc2 = await input2.encrypt();

        const tx = await payroll.connect(employer).batchOnboardEmployees(
          [alice.address, bob.address],
          [enc1.handles[0], enc2.handles[0]],
          [enc1.inputProof, enc2.inputProof],
          ["0x", "0x"]
        );
        const receipt = await tx.wait();

        const events = receipt?.logs.filter((log: any) => {
          try {
            return payroll.interface.parseLog(log)?.name === "EmployeeOnboarded";
          } catch {
            return false;
          }
        });
        expect(events?.length).to.equal(2);
        expect(await payroll.whitelisted(alice.address)).to.be.true;
        expect(await payroll.whitelisted(bob.address)).to.be.true;
      });

      it("should revert onboarding zero address", async function () {
        const payrollAddr = await payroll.getAddress();

        const input = await fhevm.createEncryptedInput(payrollAddr, employer.address);
        input.add64(SALARY);
        const encrypted = await input.encrypt();

        await expect(
          payroll.connect(employer).onboardEmployee(
            ethers.ZeroAddress,
            encrypted.handles[0],
            encrypted.inputProof,
            "0x"
          )
        ).to.be.revertedWithCustomError(payroll, "InvalidEmployee");
      });

      it("should revert double onboarding", async function () {
        const payrollAddr = await payroll.getAddress();

        const input = await fhevm.createEncryptedInput(payrollAddr, employer.address);
        input.add64(SALARY);
        const enc = await input.encrypt();
        await payroll.connect(employer).onboardEmployee(
          alice.address,
          enc.handles[0],
          enc.inputProof,
          "0x"
        );

        const input2 = await fhevm.createEncryptedInput(payrollAddr, employer.address);
        input2.add64(SALARY);
        const enc2 = await input2.encrypt();

        await expect(
          payroll.connect(employer).onboardEmployee(
            alice.address,
            enc2.handles[0],
            enc2.inputProof,
            "0x"
          )
        ).to.be.revertedWithCustomError(payroll, "AlreadyWhitelisted");
      });

      // fhEVM plugin wraps NotEmployer revert as "Fhevm assertion failed"
      it.skip("should revert if non-employer tries to onboard", async function () {
        const payrollAddr = await payroll.getAddress();

        const input = await fhevm.createEncryptedInput(payrollAddr, alice.address);
        input.add64(SALARY);
        const enc = await input.encrypt();

        await expect(
          payroll.connect(alice).onboardEmployee(
            bob.address,
            enc.handles[0],
            enc.inputProof,
            "0x"
          )
        ).to.be.reverted;
      });
    });

    // ─── Employee Removal ──────────────────────────────────────────────────

    describe("Removal", function () {
      beforeEach(async function () {
        const payrollAddr = await payroll.getAddress();

        const input = await fhevm.createEncryptedInput(payrollAddr, employer.address);
        input.add64(SALARY);
        const enc = await input.encrypt();
        await payroll.connect(employer).onboardEmployee(
          alice.address,
          enc.handles[0],
          enc.inputProof,
          "0x"
        );
      });

      it("should remove employee", async function () {
        const tx = await payroll.connect(employer).removeEmployee(alice.address);
        const receipt = await tx.wait();

        const event = receipt?.logs.find((log: any) => {
          try {
            return payroll.interface.parseLog(log)?.name === "EmployeeRemoved";
          } catch {
            return false;
          }
        });
        expect(event).to.not.be.undefined;
        expect(await payroll.whitelisted(alice.address)).to.be.false;
      });

      // fhEVM plugin wraps NotEmployer revert
      it.skip("should revert removal by non-employer", async function () {
        await expect(
          payroll.connect(alice).removeEmployee(alice.address)
        ).to.be.reverted;
      });
    });

    // ─── Salary Update ─────────────────────────────────────────────────────

    describe("Salary Update", function () {
      beforeEach(async function () {
        const payrollAddr = await payroll.getAddress();

        const input = await fhevm.createEncryptedInput(payrollAddr, employer.address);
        input.add64(SALARY);
        const enc = await input.encrypt();
        await payroll.connect(employer).onboardEmployee(
          alice.address,
          enc.handles[0],
          enc.inputProof,
          "0x"
        );
      });

      it("should update salary and emit event", async function () {
        const payrollAddr = await payroll.getAddress();
        const newSalary = 3_000_000_000n; // 3000 USDC

        const input = await fhevm.createEncryptedInput(payrollAddr, employer.address);
        input.add64(newSalary);
        const enc = await input.encrypt();

        const tx = await payroll.connect(employer).editEmployee(
          alice.address,
          enc.handles[0],
          enc.inputProof,
          "0x"
        );
        const receipt = await tx.wait();

        const event = receipt?.logs.find((log: any) => {
          try {
            return payroll.interface.parseLog(log)?.name === "EmployeeUpdated";
          } catch {
            return false;
          }
        });
        expect(event).to.not.be.undefined;
        expect(await payroll.getSalaryHistoryLength(alice.address)).to.equal(1);
      });

      it("should revert update for non-whitelisted employee", async function () {
        const payrollAddr = await payroll.getAddress();

        const input = await fhevm.createEncryptedInput(payrollAddr, employer.address);
        input.add64(SALARY);
        const enc = await input.encrypt();

        await expect(
          payroll.connect(employer).editEmployee(
            bob.address,
            enc.handles[0],
            enc.inputProof,
            "0x"
          )
        ).to.be.revertedWithCustomError(payroll, "NotWhitelisted");
      });
    });

    // ─── Pay Salary ────────────────────────────────────────────────────────

    describe("Pay Salary", function () {
      beforeEach(async function () {
        const payrollAddr = await payroll.getAddress();
        const wrapperAddr = await wrapper.getAddress();

        // Onboard alice
        const input = await fhevm.createEncryptedInput(payrollAddr, employer.address);
        input.add64(SALARY);
        const enc = await input.encrypt();
        await payroll.connect(employer).onboardEmployee(
          alice.address,
          enc.handles[0],
          enc.inputProof,
          "0x"
        );

        // Employer wraps USDC → cUSDCP
        await usdc.connect(employer).approve(wrapperAddr, WRAP_AMOUNT);
        await wrapper.connect(employer).wrap(employer.address, WRAP_AMOUNT);

        // Employer sets payroll contract as operator for confidential transfers
        const farFuture = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
        await wrapper.connect(employer).setOperator(payrollAddr, farFuture);
      });

      it("should pay salary to single employee", async function () {
        const payrollAddr = await payroll.getAddress();

        const input = await fhevm.createEncryptedInput(payrollAddr, employer.address);
        input.add64(SALARY);
        const enc = await input.encrypt();

        const tx = await payroll.connect(employer).paySalary(
          alice.address,
          enc.handles[0],
          enc.inputProof
        );
        const receipt = await tx.wait();

        const event = receipt?.logs.find((log: any) => {
          try {
            return payroll.interface.parseLog(log)?.name === "SalaryPaid";
          } catch {
            return false;
          }
        });
        expect(event).to.not.be.undefined;
        expect(await payroll.getSalaryHistoryLength(alice.address)).to.equal(1);
      });

      it("should revert payment for non-whitelisted employee", async function () {
        const payrollAddr = await payroll.getAddress();

        const input = await fhevm.createEncryptedInput(payrollAddr, employer.address);
        input.add64(SALARY);
        const enc = await input.encrypt();

        await expect(
          payroll.connect(employer).paySalary(
            bob.address,
            enc.handles[0],
            enc.inputProof
          )
        ).to.be.revertedWithCustomError(payroll, "NotWhitelisted");
      });

      // fhEVM plugin wraps NotEmployer revert
      it.skip("should revert payment by non-employer", async function () {
        const payrollAddr = await payroll.getAddress();

        const input = await fhevm.createEncryptedInput(payrollAddr, alice.address);
        input.add64(SALARY);
        const enc = await input.encrypt();

        await expect(
          payroll.connect(alice).paySalary(
            alice.address,
            enc.handles[0],
            enc.inputProof
          )
        ).to.be.reverted;
      });
    });

    // ─── Batch Pay ─────────────────────────────────────────────────────────

    describe("Batch Pay Salaries", function () {
      beforeEach(async function () {
        const payrollAddr = await payroll.getAddress();
        const wrapperAddr = await wrapper.getAddress();

        // Onboard alice + bob
        const inp1 = await fhevm.createEncryptedInput(payrollAddr, employer.address);
        inp1.add64(SALARY);
        const enc1 = await inp1.encrypt();
        await payroll.connect(employer).onboardEmployee(
          alice.address,
          enc1.handles[0],
          enc1.inputProof,
          "0x"
        );

        const inp2 = await fhevm.createEncryptedInput(payrollAddr, employer.address);
        inp2.add64(SALARY);
        const enc2 = await inp2.encrypt();
        await payroll.connect(employer).onboardEmployee(
          bob.address,
          enc2.handles[0],
          enc2.inputProof,
          "0x"
        );

        // Wrap USDC for employer
        await usdc.connect(employer).approve(wrapperAddr, WRAP_AMOUNT);
        await wrapper.connect(employer).wrap(employer.address, WRAP_AMOUNT);

        // Set operator
        const farFuture = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
        await wrapper.connect(employer).setOperator(payrollAddr, farFuture);
      });

      it("should batch-pay salaries to multiple employees", async function () {
        const payrollAddr = await payroll.getAddress();

        const inp1 = await fhevm.createEncryptedInput(payrollAddr, employer.address);
        inp1.add64(SALARY);
        const enc1 = await inp1.encrypt();

        const inp2 = await fhevm.createEncryptedInput(payrollAddr, employer.address);
        inp2.add64(SALARY);
        const enc2 = await inp2.encrypt();

        const tx = await payroll.connect(employer).batchPaySalaries(
          [alice.address, bob.address],
          [enc1.handles[0], enc2.handles[0]],
          [enc1.inputProof, enc2.inputProof]
        );
        const receipt = await tx.wait();

        const events = receipt?.logs.filter((log: any) => {
          try {
            return payroll.interface.parseLog(log)?.name === "SalaryPaid";
          } catch {
            return false;
          }
        });
        expect(events?.length).to.equal(2);
      });

      it("should revert batch pay with length mismatch", async function () {
        const payrollAddr = await payroll.getAddress();

        const inp1 = await fhevm.createEncryptedInput(payrollAddr, employer.address);
        inp1.add64(SALARY);
        const enc1 = await inp1.encrypt();

        await expect(
          payroll.connect(employer).batchPaySalaries(
            [alice.address, bob.address],
            [enc1.handles[0]],
            [enc1.inputProof]
          )
        ).to.be.revertedWithCustomError(payroll, "LengthMismatch");
      });
    });
  });
});
