// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.27;

import {Payroll} from "./Payroll.sol";

/// @title PayrollFactory
/// @notice Deploys dedicated confidential Payroll contracts for each employer.
contract PayrollFactory {
    /// @notice Confidential token (ERC-7984 wrapper) used for all payrolls
    address public immutable confidentialToken;

    /// @notice Mapping of employer → deployed payroll contract
    mapping(address => address) public employerPayroll;

    /// @notice List of all employers for indexing / dashboards
    address[] public allEmployers;

    /// @dev Emitted when a new Payroll is deployed for an employer
    event PayrollCreated(address indexed employer, address payroll);

    constructor(address _confidentialToken) {
        require(_confidentialToken != address(0), "Invalid token");
        confidentialToken = _confidentialToken;
    }

    /// @notice Deploy a confidential Payroll for the calling employer
    function registerEmployer() external returns (address payrollAddress) {
        require(employerPayroll[msg.sender] == address(0), "Already registered");

        Payroll payroll = new Payroll(confidentialToken, msg.sender);
        payrollAddress = address(payroll);

        employerPayroll[msg.sender] = payrollAddress;
        allEmployers.push(msg.sender);

        emit PayrollCreated(msg.sender, payrollAddress);
    }

    /// @notice Get the payroll contract address for a given employer
    function getPayroll(address employer) external view returns (address) {
        return employerPayroll[employer];
    }

    /// @notice Total number of registered employers
    function totalEmployers() external view returns (uint256) {
        return allEmployers.length;
    }

    /// @notice Return the list of all employers
    function getAllEmployers() external view returns (address[] memory) {
        return allEmployers;
    }
}

