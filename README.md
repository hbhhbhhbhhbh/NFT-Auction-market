"# COMP5521"
COMP5521 NFT 市场项目 (COMP5521 Marketplace Project)
这是一个基于以太坊 Solidity 开发的去中心化 NFT 交易平台。项目包含了自定义的 ERC20 稳定币、ERC721 NFT 合约以及一个功能丰富的市场合约，支持直接销售与密封投标式暗拍 (Sealed-Bid Auction) 。
📄 合约组成
项目由以下三个核心智能合约组成：
1. MakePolyuGreatAgain (MPGA) - ERC20 稳定币
代币名称: MakePolyuGreatAgain
符号: MPGA
模式: 采用“储备金模式”，初始铸造 10 亿枚代币给管理员 (Owner) 。
核心功能:
线下入金模拟: 管理员可通过 transferToUser 函数，根据 1:1 的汇率将代币转给线下支付港币的用户 。
支持 Permit: 兼容 ERC20Permit 扩展，支持无 Gas 签名授权 。
2. COMP5521Collectible (C5C) - ERC721 NFT
代币名称: COMP5521 Collectible
符号: C5C
核心功能:
安全铸造: 只有管理员可以调用 safeMint 创建新 NFT 。
元数据: 支持存储 tokenURI，关联 NFT 的 JSON 描述文件 。
自动计数: 使用内部计数器自动分配递增的 Token ID 。
3. Marketplace - 市场合约
该合约是项目的核心逻辑，使用 MPGA 稳定币作为支付结算货币 。
直接销售 (Direct Sale):
用户可以上架 (List) 自己的 NFT 并设定价格 。
买家在提前授权稳定币后可直接购买 (Buy) 。
卖家可以随时取消 (Cancel) 未售出的上架记录 。
奖励功能：密封投标式暗拍 (Sealed-Bid Auction):
投标阶段: 投标人提交出价的哈希值（以隐藏价格）并锁定足够的押金 。
揭标阶段: 投标人揭示其真实出价和随机数盐值 。
Vickrey 拍卖机制: 拍卖结算时，最高出价者获胜，但仅需支付第二高的出价金额 。
退款机制: 未中拍者在拍卖结束后可自行取回押金 。

🛠 技术栈
语言: Solidity ^0.8.20 / ^0.8.27
标准库: OpenZeppelin (ERC20, ERC721, Ownable, ReentrancyGuard)
拍卖机制: 密封投标 (Sealed-bid) + 第二价格拍卖 (Vickrey Auction)
