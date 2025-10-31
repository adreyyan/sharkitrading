// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestNFTForDemo
 * @dev Simple test NFT for hackathon demo
 * Mint a few NFTs to demonstrate the private vault system!
 */
contract TestNFTForDemo is ERC721, Ownable {
    uint256 private _nextTokenId = 1;
    
    // Optional: Set base URI for metadata
    string private _baseTokenURI;
    
    constructor() ERC721("Demo NFT", "DEMO") Ownable(msg.sender) {}
    
    /**
     * @dev Mint a new NFT
     */
    function mint(address to) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        return tokenId;
    }
    
    /**
     * @dev Batch mint multiple NFTs
     */
    function batchMint(address to, uint256 amount) public onlyOwner {
        for (uint256 i = 0; i < amount; i++) {
            mint(to);
        }
    }
    
    /**
     * @dev Set base URI for metadata (optional)
     */
    function setBaseURI(string memory baseURI) public onlyOwner {
        _baseTokenURI = baseURI;
    }
    
    /**
     * @dev Override base URI
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }
    
    /**
     * @dev Get total supply
     */
    function totalSupply() public view returns (uint256) {
        return _nextTokenId - 1;
    }
}


