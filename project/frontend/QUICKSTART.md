# 快速开始指南

## 1. 安装依赖

```bash
cd frontend
npm install
```

## 2. 部署智能合约

在项目根目录运行：

```bash
# 编译合约
npx hardhat compile

# 启动本地节点
npx hardhat node

# 在另一个终端部署合约
npx hardhat run scripts/deploy.js --network localhost
```

部署后会输出合约地址，复制这些地址。

## 3. 配置合约地址

编辑 `frontend/src/config/contracts.js`，将部署得到的合约地址填入：

```javascript
export const CONTRACT_ADDRESSES = {
  stablecoin: "你的稳定币合约地址",
  nft: "你的NFT合约地址",
  marketplace: "你的市场合约地址"
};
```

## 4. 配置 MetaMask

1. 打开 MetaMask
2. 添加网络：
   - 网络名称: Hardhat Local
   - RPC URL: http://127.0.0.1:8545
   - 链ID: 31337
   - 货币符号: ETH
3. 导入测试账户（从 `npx hardhat node` 的输出中复制私钥）

## 5. 启动前端

```bash
npm run dev
```

访问 http://localhost:3000

## 6. 使用流程

1. **连接钱包** - 点击右上角连接 MetaMask
2. **授权代币** - 进入稳定币页面，授权市场合约使用代币
3. **铸造 NFT** - 进入 NFT 页面，铸造一个 NFT
4. **上架销售** - 进入市场页面，上架您的 NFT
5. **或发起暗拍** - 进入暗拍页面，发起一个暗拍

## 常见问题

### 合约地址错误
确保 `contracts.js` 中的地址与部署输出一致。

### 交易失败
- 检查 MetaMask 是否连接到正确的网络
- 确保账户有足够的 ETH 支付 Gas
- 检查是否已授权足够的代币

### NFT 图片不显示
确保 Token URI 指向有效的 JSON 元数据文件，格式如下：

```json
{
  "name": "My NFT",
  "description": "NFT Description",
  "image": "https://example.com/image.png"
}
```











