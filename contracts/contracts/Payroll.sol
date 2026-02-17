// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Payroll
/// @notice Confidential, per-employer payroll contract using ERC-7984 tokens.
contract Payroll is ZamaEthereumConfig, ReentrancyGuard {
    using FHE for *;

    /// @notice Employer (set at deployment)
    address public employer;

    /// @notice Confidential token used for payroll (wrapped USDC or similar)
    IERC7984 public confidentialToken;

    /// @notice Whitelisted employees
    mapping(address employee => bool isWhitelisted) public whitelisted;

    /// @notice Each employee’s encrypted salary history (append-only, only ciphertexts)
    mapping(address employee => euint64[] salaries) private salaryHistory;

    /// @notice Emitted when an employee is onboarded
    event EmployeeOnboarded(
        address indexed employer,
        address indexed employee,
        externalEuint64 encryptedSalary,
        bytes inputProof,
        bytes signature
    );

    /// @notice Emitted when an employee’s salary is updated
    event EmployeeUpdated(
        address indexed employer,
        address indexed employee,
        externalEuint64 newEncryptedSalary,
        bytes newInputProof,
        bytes newSignature,
        uint256 timestamp,
        bytes32 salaryId,
        address payroll
    );

    /// @notice Emitted when an employee is removed
    event EmployeeRemoved(address indexed employee);

    /// @notice Emitted when salary is paid (single or batch)
    event SalaryPaid(
        address indexed employer,
        address indexed employee,
        uint256 index,
        euint64 salary,
        uint256 timestamp,
        bytes32 paymentId,
        address payroll
    );

    error NotEmployer();
    error NotEmployee();
    error InvalidEmployee();
    error AlreadyWhitelisted();
    error NotWhitelisted();
    error InvalidToken();
    error InputLengthMismatch();
    error LengthMismatch();

    modifier onlyEmployer() {
        if (msg.sender != employer) revert NotEmployer();
        _;
    }

    modifier onlyEmployee() {
        if (!whitelisted[msg.sender]) revert NotEmployee();
        _;
    }

    constructor(address _confidentialToken, address _employer) {
        if (_confidentialToken == address(0)) revert InvalidToken();
        confidentialToken = IERC7984(_confidentialToken);
        employer = _employer == address(0) ? msg.sender : _employer;
    }

    /// @notice Onboard a single employee with an encrypted salary
    function onboardEmployee(
        address employee,
        externalEuint64 encryptedSalary,
        bytes calldata inputProof,
        bytes calldata signature
    ) external onlyEmployer {
        if (employee == address(0)) revert InvalidEmployee();
        if (whitelisted[employee]) revert AlreadyWhitelisted();

        whitelisted[employee] = true;

        euint64 salary = FHE.fromExternal(encryptedSalary, inputProof);

        FHE.allowThis(salary);
        FHE.allow(salary, employee);
        FHE.allow(salary, msg.sender);
        FHE.allow(salary, address(confidentialToken));

        emit EmployeeOnboarded(
            msg.sender,
            employee,
            encryptedSalary,
            inputProof,
            signature
        );
    }

    /// @notice Onboard many employees at once
    function batchOnboardEmployees(
        address[] calldata employees,
        externalEuint64[] calldata encryptedSalaries,
        bytes[] calldata inputProofs,
        bytes[] calldata signatures
    ) external onlyEmployer {
        if (
            employees.length != encryptedSalaries.length ||
            employees.length != inputProofs.length ||
            employees.length != signatures.length
        ) revert InputLengthMismatch();

        for (uint256 i = 0; i < employees.length; i++) {
            address employee = employees[i];
            if (employee == address(0)) revert InvalidEmployee();
            if (whitelisted[employee]) revert AlreadyWhitelisted();

            whitelisted[employee] = true;

            euint64 salary = FHE.fromExternal(
                encryptedSalaries[i],
                inputProofs[i]
            );

            FHE.allowThis(salary);
            FHE.allow(salary, employee);
            FHE.allow(salary, msg.sender);
            FHE.allow(salary, address(confidentialToken));

            emit EmployeeOnboarded(
                msg.sender,
                employee,
                encryptedSalaries[i],
                inputProofs[i],
                signatures[i]
            );
        }
    }

    /// @notice Update an employee’s salary (append to history)
    function editEmployee(
        address employee,
        externalEuint64 newEncryptedSalary,
        bytes calldata newInputProof,
        bytes calldata newSignature
    ) external onlyEmployer {
        if (employee == address(0)) revert InvalidEmployee();
        if (!whitelisted[employee]) revert NotWhitelisted();

        euint64 newSalary = FHE.fromExternal(
            newEncryptedSalary,
            newInputProof
        );

        FHE.allowThis(newSalary);
        FHE.allow(newSalary, employee);
        FHE.allow(newSalary, msg.sender);
        FHE.allow(newSalary, address(confidentialToken));

        uint256 idx = salaryHistory[employee].length;
        salaryHistory[employee].push(newSalary);

        emit EmployeeUpdated(
            msg.sender,
            employee,
            newEncryptedSalary,
            newInputProof,
            newSignature,
            block.timestamp,
            keccak256(
                abi.encodePacked(blockhash(block.number - 1), employee, idx)
            ),
            address(this)
        );
    }

    /// @notice Remove an employee from the whitelist
    function removeEmployee(address employee) external onlyEmployer {
        whitelisted[employee] = false;
        emit EmployeeRemoved(employee);
    }

    /// @notice Pay salary for a single employee
    function paySalary(
        address employee,
        externalEuint64 salaryEncrypted,
        bytes calldata inputProof
    ) external onlyEmployer nonReentrant {
        if (!whitelisted[employee]) revert NotWhitelisted();
        if (employee == address(0)) revert InvalidEmployee();

        euint64 salary = FHE.fromExternal(salaryEncrypted, inputProof);

        FHE.allow(salary, msg.sender);
        FHE.allow(salary, address(confidentialToken));
        FHE.allow(salary, employee);

        confidentialToken.confidentialTransferFrom(
            msg.sender,
            employee,
            salary
        );

        uint256 idx = salaryHistory[employee].length;
        salaryHistory[employee].push(salary);

        emit SalaryPaid(
            msg.sender,
            employee,
            idx,
            salary,
            block.timestamp,
            keccak256(
                abi.encodePacked(blockhash(block.number - 1), employee, idx)
            ),
            address(this)
        );
    }

    /// @notice Pay salaries for multiple employees in a single transaction
    function batchPaySalaries(
        address[] calldata employees,
        externalEuint64[] calldata encryptedSalaries,
        bytes[] calldata inputProofs
    ) external onlyEmployer nonReentrant {
        if (
            employees.length != encryptedSalaries.length ||
            employees.length != inputProofs.length
        ) revert LengthMismatch();

        for (uint256 i = 0; i < employees.length; i++) {
            address employee = employees[i];
            if (!whitelisted[employee]) revert NotWhitelisted();

            euint64 salary = FHE.fromExternal(
                encryptedSalaries[i],
                inputProofs[i]
            );

            FHE.allow(salary, msg.sender);
            FHE.allow(salary, address(confidentialToken));
            FHE.allow(salary, employee);

            confidentialToken.confidentialTransferFrom(
                msg.sender,
                employee,
                salary
            );

            uint256 idx = salaryHistory[employee].length;
            salaryHistory[employee].push(salary);

            emit SalaryPaid(
                msg.sender,
                employee,
                idx,
                salary,
                block.timestamp,
                keccak256(
                    abi.encodePacked(
                        blockhash(block.number - 1),
                        employee,
                        idx
                    )
                ),
                address(this)
            );
        }
    }

    /// @notice Return how many salary entries exist for an employee
    function getSalaryHistoryLength(
        address employee
    ) external view returns (uint256) {
        return salaryHistory[employee].length;
    }
}

