// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestNFT
 * @dev Simple NFT contract for testing fhEVM trading on Sepolia
 */
contract TestNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId = 1;
    
    // Mapping to store token metadata
    mapping(uint256 => string) private _tokenNames;
    
    constructor() ERC721("Test NFT Collection", "TEST") Ownable(msg.sender) {}

    /**
     * @dev Public mint function - anyone can mint for free
     */
    function mint(address to, string memory name) public returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        
        // Set token name
        _tokenNames[tokenId] = name;
        
        // Set a basic metadata URI (you can replace with IPFS URI)
        string memory uri = string(abi.encodePacked(
            "data:application/json,{",
            '"name":"', name, ' #', _toString(tokenId), '",',
            '"description":"Test NFT for fhEVM trading",',
            '"image":"https://via.placeholder.com/400x400/7c3aed/white?text=Test%20NFT%20%23', _toString(tokenId), '",',
            '"attributes":[{"trait_type":"Type","value":"Test"},{"trait_type":"ID","value":', _toString(tokenId), '}]',
            '}'
        ));
        
        _setTokenURI(tokenId, uri);
        
        return tokenId;
    }

    /**
     * @dev Batch mint function for testing
     */
    function batchMint(address to, uint256 amount) public {
        for (uint256 i = 0; i < amount; i++) {
            mint(to, string(abi.encodePacked("Test NFT ", _toString(_nextTokenId))));
        }
    }

    /**
     * @dev Get token name
     */
    function getTokenName(uint256 tokenId) public view returns (string memory) {
        return _tokenNames[tokenId];
    }

    /**
     * @dev Get total supply
     */
    function totalSupply() public view returns (uint256) {
        return _nextTokenId - 1;
    }

    // Override functions
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // Helper function to convert uint to string
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        
        return string(buffer);
    }
}
