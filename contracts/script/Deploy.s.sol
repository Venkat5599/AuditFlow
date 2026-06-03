// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AuditRegistry} from "../src/AuditRegistry.sol";

/// @notice Deploy AuditRegistry to Mantle.
/// Usage:
///   forge script script/Deploy.s.sol --rpc-url mantle_sepolia --broadcast --private-key $PRIVATE_KEY
contract Deploy is Script {
    function run() external returns (AuditRegistry reg) {
        vm.startBroadcast();
        reg = new AuditRegistry();
        console.log("AuditRegistry deployed at:", address(reg));
        vm.stopBroadcast();
    }
}
