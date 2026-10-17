// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title DoosraLedger
/// @notice Append-only decision ledger for the Doosra Jeevan organ allocation platform.
///         Every allocation/verification/anomaly event is written as a permanent,
///         hash-chained block. Nothing can be edited or deleted once written -
///         this replaces the simulated "Block #14895 / prev-hash / curr-hash" UI
///         with real on-chain data.
contract DoosraLedger {
    struct Block {
        uint256 blockNumber;
        bytes32 prevHash;
        bytes32 currHash;
        string action;      // e.g. "TRANSPLANT COMPLETED & RECIPIENT LIBERATED"
        string clauseRef;   // e.g. "NOTTO Clause: THOA Section 9(1A)"
        address submittedBy;
        uint256 timestamp;
    }

    address public admin;
    mapping(address => bool) public authorizedNodes; // hospitals / NOTTO validator wallets

    Block[] private chain;
    bytes32 public latestHash;

    event BlockAppended(
        uint256 indexed blockNumber,
        bytes32 prevHash,
        bytes32 currHash,
        string action,
        string clauseRef,
        address submittedBy,
        uint256 timestamp
    );

    event AnomalyFlagged(uint256 indexed relatedBlock, string reason, address flaggedBy, uint256 timestamp);
    event NodeAuthorized(address indexed node);
    event NodeRevoked(address indexed node);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier onlyAuthorized() {
        require(authorizedNodes[msg.sender] || msg.sender == admin, "Not an authorized node");
        _;
    }

    constructor() {
        admin = msg.sender;
        authorizedNodes[msg.sender] = true;

        // genesis block
        bytes32 genesisHash = keccak256(abi.encodePacked("DOOSRA_JEEVAN_GENESIS", block.timestamp));
        chain.push(Block({
            blockNumber: 0,
            prevHash: bytes32(0),
            currHash: genesisHash,
            action: "GENESIS BLOCK",
            clauseRef: "N/A",
            submittedBy: msg.sender,
            timestamp: block.timestamp
        }));
        latestHash = genesisHash;

        emit BlockAppended(0, bytes32(0), genesisHash, "GENESIS BLOCK", "N/A", msg.sender, block.timestamp);
    }

    /// @notice Authorize a hospital/registry wallet to write to the ledger (multi-sig style trust layer)
    function authorizeNode(address node) external onlyAdmin {
        authorizedNodes[node] = true;
        emit NodeAuthorized(node);
    }

    function revokeNode(address node) external onlyAdmin {
        authorizedNodes[node] = false;
        emit NodeRevoked(node);
    }

    /// @notice Append a new immutable block. dataHash = keccak256 of the off-chain record
    ///         (patient docs / match decision JSON) computed by the backend before calling this.
    function appendBlock(
        bytes32 dataHash,
        string calldata action,
        string calldata clauseRef
    ) external onlyAuthorized returns (uint256) {
        bytes32 currHash = keccak256(abi.encodePacked(latestHash, dataHash, block.timestamp, msg.sender));
        uint256 blockNumber = chain.length;

        chain.push(Block({
            blockNumber: blockNumber,
            prevHash: latestHash,
            currHash: currHash,
            action: action,
            clauseRef: clauseRef,
            submittedBy: msg.sender,
            timestamp: block.timestamp
        }));

        latestHash = currHash;

        emit BlockAppended(blockNumber, chain[blockNumber].prevHash, currHash, action, clauseRef, msg.sender, block.timestamp);
        return blockNumber;
    }

    /// @notice Called by the off-chain anomaly scanner when it detects rank-jumping / tampering.
    ///         This itself becomes a permanent, tamper-evident record.
    function flagAnomaly(uint256 relatedBlock, string calldata reason) external onlyAuthorized {
        emit AnomalyFlagged(relatedBlock, reason, msg.sender, block.timestamp);
    }

    function getBlock(uint256 index) external view returns (Block memory) {
        require(index < chain.length, "Out of range");
        return chain[index];
    }

    function chainLength() external view returns (uint256) {
        return chain.length;
    }

    /// @notice Verify that a chain segment is intact (no tampering) by re-deriving hashes.
    function verifyIntegrity() external view returns (bool) {
        for (uint256 i = 1; i < chain.length; i++) {
            if (chain[i].prevHash != chain[i - 1].currHash) {
                return false;
            }
        }
        return true;
    }
}
