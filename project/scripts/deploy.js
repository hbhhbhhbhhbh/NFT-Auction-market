const hre = require("hardhat");

async function main() {
  const ethers = hre.ethers;
  const [deployer] = await ethers.getSigners();

  const balance = await deployer.provider.getBalance(deployer.address);

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // 1. Deploy Stablecoin
  console.log("Deploying Stablecoin contract...");
  const Stablecoin = await ethers.getContractFactory("MakePolyuGreatAgain");
  // 部署时，deployer 将获得 10 亿初始代币
  const stablecoin = await Stablecoin.deploy(deployer.address, deployer.address);
  await stablecoin.waitForDeployment();
  console.log("Stablecoin deployed at:", stablecoin.target);

  // 2. Deploy NFT
  console.log("Deploying NFT contract...");
  const NFT = await ethers.getContractFactory("COMP5521Collectible");
  const nft = await NFT.deploy(deployer.address);
  await nft.waitForDeployment();
  console.log("NFT deployed at:", nft.target);

  // 3. Deploy Marketplace
  console.log("Deploying Marketplace contract...");
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(stablecoin.target);
  await marketplace.waitForDeployment();
  console.log("Marketplace deployed at:", marketplace.target);

  // --- 删除了之前的自动发钱逻辑 ---
  // 现在只有 deployer (Owner) 有钱，其他账户都是 0

  console.log("Deployment completed successfully!");
  console.log("Stablecoin address:", stablecoin.target);
  console.log("NFT address:", nft.target);
  console.log("Marketplace address:", marketplace.target);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});