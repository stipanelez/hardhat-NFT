// SPDX-License-Identifier:MIT

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

pragma solidity ^0.8.8;

//Inheritance
contract BasicNft is ERC721 {
    // public constat bcz this TOKE_URI will never change
    //NFTs use this TokenURI to tell us how looks like
    //All that info is metadata and tells us about NFT
    //tokenURI is just a simple API call
    string public constant TOKEN_URI =
        "ipfs://bafybeig37ioir76s7mg5oobetncojcm3c3hxasyd4rvid4jqhy4gkaheg4/?filename=0-PUG.json";

    //token conuter is tokenID
    uint256 private s_tokenCounter;

    //Symbol and name in ERC721 constructor
    constructor() ERC721("Dogie", "DOG") {
        s_tokenCounter = 0;
    }

    //To create a new dogs we have to make mint function
    //All Nfts has to have a unique TokenID
    function mintNft() public {
        //_safeMint(who calls(owner of nft), tokenID)
        _safeMint(msg.sender, s_tokenCounter);
        s_tokenCounter = s_tokenCounter + 1;
    }

    //overriding function in ERC721.sol
    function tokenURI(uint256 /*tokenId*/) public view override returns (string memory) {
        //require(_exists(tokenID))
        return TOKEN_URI;
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }
}
