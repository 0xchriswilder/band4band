// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.27;

import "@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ConfidentialPayrollToken
/// @notice Wraps a public ERC20 (e.g. USDC) into a confidential ERC-7984 token
///         to be used as the payroll currency.
contract ConfidentialPayrollToken is ZamaEthereumConfig, ERC7984ERC20Wrapper {
    constructor(
        address underlyingToken,
        string memory name,
        string memory symbol,
        string memory uri
    ) ERC7984(name, symbol, uri) ERC7984ERC20Wrapper(IERC20(underlyingToken)) {}
}

