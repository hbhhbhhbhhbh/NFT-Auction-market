// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract COMP5521Collectible is ERC721URIStorage, Ownable {

    // 使用 uint256 作为 token ID 计数器
    uint256 private _tokenIdCounter;

    /**
     * @dev 构造函数在部署时设置 NFT 的 Name 和 Symbol.
     * 它还设置了合约的初始 Owner.
     */
    constructor(address initialOwner) 
        ERC721("COMP5521 Collectible", "C5C")
        Ownable(initialOwner)
    {
        _tokenIdCounter = 0;
    }

    /**
     * @dev 创建一个新的 NFT 并将其分配给 'to' 地址.
     * 自动为新的 NFT 分配一个递增的 token ID.
     * 将 'tokenURI' 与此 NFT 关联.
     * 此函数受到 'onlyOwner' 修饰符的限制.
     * @param to 接收新 NFT 的地址.
     * @param tokenURI 指向 NFT 元数据 JSON 文件的 URI.
     */
    function safeMint(address to, string memory tokenURI) 
        public 
        onlyOwner 
    {
        // 获取当前计数器值作为 token ID
        uint256 tokenId = _tokenIdCounter;
        
        // 调用 OpenZeppelin ERC721 内部的 _safeMint 函数
        _safeMint(to, tokenId);
        
        // 设置 token URI
        _setTokenURI(tokenId, tokenURI);

        // 计数器加 1
        _tokenIdCounter += 1;
    }
}
