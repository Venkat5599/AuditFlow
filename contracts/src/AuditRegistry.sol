// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title AuditRegistry
/// @notice On-chain attestation registry for AuditFlow audits, deployed on Mantle.
///         Each audit emits an immutable record: which repo, the report hash,
///         finding counts by severity, and who ran it. Anyone can verify a report
///         off-chain matches the on-chain hash.
/// @dev evmVersion should be set to a Mantle-supported target in foundry.toml.
contract AuditRegistry {
    struct Attestation {
        bytes32 repoId;       // keccak256("owner/name@commit")
        bytes32 reportHash;   // keccak256 of the markdown report
        uint32  high;
        uint32  medium;
        uint32  low;
        uint64  timestamp;
        address auditor;      // msg.sender (the AuditFlow operator/user)
    }

    Attestation[] public attestations;

    /// @notice latest attestation index for a given repoId (+1; 0 = none)
    mapping(bytes32 => uint256) public latestOf;

    event AuditAttested(
        uint256 indexed id,
        bytes32 indexed repoId,
        bytes32 reportHash,
        uint32 high,
        uint32 medium,
        uint32 low,
        address indexed auditor
    );

    /// @notice Record an audit attestation on Mantle.
    /// @return id index of the stored attestation.
    function attest(
        bytes32 repoId,
        bytes32 reportHash,
        uint32 high,
        uint32 medium,
        uint32 low
    ) external returns (uint256 id) {
        id = attestations.length;
        attestations.push(
            Attestation({
                repoId: repoId,
                reportHash: reportHash,
                high: high,
                medium: medium,
                low: low,
                timestamp: uint64(block.timestamp),
                auditor: msg.sender
            })
        );
        latestOf[repoId] = id + 1;
        emit AuditAttested(id, repoId, reportHash, high, medium, low, msg.sender);
    }

    function count() external view returns (uint256) {
        return attestations.length;
    }

    /// @notice Verify a report hash matches the latest attestation for a repo.
    function verifyLatest(bytes32 repoId, bytes32 reportHash) external view returns (bool) {
        uint256 ptr = latestOf[repoId];
        if (ptr == 0) return false;
        return attestations[ptr - 1].reportHash == reportHash;
    }
}
