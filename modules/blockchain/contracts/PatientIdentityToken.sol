// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title PatientIdentityToken
/// @notice Real ERC-721 implementation of the PPT's "NFT-Style Minting" feature.
///         Mints one identity token per patient, keyed off a privacy-preserving
///         hash of their real identity (Aadhaar/UID) - never the raw ID itself.
///         Prevents the same person being registered twice across hospitals.
contract PatientIdentityToken is ERC721, Ownable {
    uint256 private _nextTokenId;

    // hash(patientAadhaarOrUID + salt) => already minted?
    mapping(bytes32 => bool) public identityHashUsed;
    mapping(uint256 => bytes32) public tokenIdentityHash;

    event PatientMinted(uint256 indexed tokenId, bytes32 indexed identityHash, address indexed mintedBy);

    constructor() ERC721("DoosraJeevanPatientID", "DJPID") Ownable() {}

    /// @notice identityHash should be computed off-chain as keccak256(uid + hospitalSalt)
    ///         so the raw Aadhaar/UID never touches the chain.
    function mintPatientToken(address to, bytes32 identityHash) external onlyOwner returns (uint256) {
        require(!identityHashUsed[identityHash], "Patient already registered - double-listing blocked");

        uint256 tokenId = _nextTokenId++;
        identityHashUsed[identityHash] = true;
        tokenIdentityHash[tokenId] = identityHash;

        _safeMint(to, tokenId);

        emit PatientMinted(tokenId, identityHash, msg.sender);
        return tokenId;
    }

    function isRegistered(bytes32 identityHash) external view returns (bool) {
        return identityHashUsed[identityHash];
    }
}
