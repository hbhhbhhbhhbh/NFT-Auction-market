// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.4.0
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title COMP5521Dollar (C5D)
 * @dev 这是 COMP5521 项目的 ERC20 稳定币合约.
 * 采用“储备金模式”：初始发行 10 亿在 Owner 手里，后续通过转账分发。
 */
contract MakePolyuGreatAgain is ERC20, Ownable, ERC20Permit {
    // 定义汇率：1 HKD = 1 MPGA
    uint256 public constant EXCHANGE_RATE = 1;

    constructor(address recipient, address initialOwner)
        ERC20("MakePolyuGreatAgain", "MPGA")
        Ownable(initialOwner)
        ERC20Permit("MakePolyuGreatAgain")
    {
        // 初始铸造 10 亿给 Owner (作为储备金)
        _mint(recipient, 1000000000 * 10 ** decimals());
    }

    /**
     * @dev 核心功能：Owner 给用户转账 (模拟线下入金)
     * @param to 用户的钱包地址
     * @param hkdAmount 用户线下支付的港币金额
     * * 逻辑：Owner 收到 HKD -> 调用此函数 -> 从 Owner 余额转 MPGA 给 User
     */
    function transferToUser(address to, uint256 hkdAmount) public onlyOwner {
        // 1. 计算应该给多少代币 (Amount * Rate)
        uint256 tokensToSend = hkdAmount * EXCHANGE_RATE;
        
        // 2. 执行转账：从消息发送者 (Owner) 转给目标用户 (to)
        // 注意：这里使用的是 _transfer，它会扣除 Owner 的余额
        _transfer(_msgSender(), to, tokensToSend);
    }

    // 保留 mint 函数作为备用（万一 10 亿不够了可以增发）
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}