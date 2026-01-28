// 合约地址配置
// 部署后请更新这些地址
// 这些是 Hardhat 默认部署地址，请根据实际部署情况修改
export const CONTRACT_ADDRESSES = {
  // ⚠️ 请确保这里填的是你【最新一次部署】的地址
  stablecoin: "0x5FbDB2315678afecb367f032d93F642f64180aa3", 
  nft: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", 
  marketplace: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0" 
};

// 合约ABI（已更新，包含 transferToUser）
export const STABLECOIN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function mint(address to, uint256 amount)",
  // ▼▼▼ 新增的部分 ▼▼▼
  "function transferToUser(address to, uint256 hkdAmount)", 
  "function EXCHANGE_RATE() view returns (uint256)",
  "function owner() view returns (address)", // 用来检查是不是管理员
  // ▲▲▲ 新增结束 ▲▲▲
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

export const NFT_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function ownerOf(uint256) view returns (address)",
  "function tokenURI(uint256) view returns (string)",
  "function safeMint(address to, string memory tokenURI)",
  "function approve(address to, uint256 tokenId)",
  "function getApproved(uint256) view returns (address)",
  "function setApprovalForAll(address operator, bool approved)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function transferFrom(address from, address to, uint256 tokenId)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)"
];

export const MARKETPLACE_ABI = [
  "function listNFT(address nftContract, uint256 tokenId, uint256 price)",
  "function buyNFT(address nftContract, uint256 tokenId)",
  "function cancelListing(address nftContract, uint256 tokenId)",
  "function startAuction(address nftContract, uint256 tokenId, uint256 biddingTime, uint256 revealTime)",
  "function placeBid(address nftContract, uint256 tokenId, bytes32 hashedBid, uint256 depositAmount)",
  "function revealBid(address nftContract, uint256 tokenId, uint256 bidValue, bytes32 secretNonce)",
  "function endAuction(address nftContract, uint256 tokenId)",
  "function withdrawRefund(address nftContract, uint256 tokenId)",
  "function getListing(address nftContract, uint256 tokenId) view returns (tuple(address seller, uint256 price))",
  "function getAuction(address nftContract, uint256 tokenId) view returns (tuple(address seller, uint256 endTime, uint256 revealEndTime, bool finalized, address highestBidder, uint256 highestBid, uint256 secondHighestBid))",
  "function getDeposit(address nftContract, uint256 tokenId, address bidder) view returns (uint256)",
  "function getHashedBid(address nftContract, uint256 tokenId, address bidder) view returns (bytes32)",
  "function getRevealedBid(address nftContract, uint256 tokenId, address bidder) view returns (uint256)",
  "event Listed(address indexed nftContract, uint256 indexed tokenId, address indexed seller, uint256 price)",
  "event Sold(address indexed nftContract, uint256 indexed tokenId, address indexed buyer, uint256 price)",
  "event Cancelled(address indexed nftContract, uint256 indexed tokenId, address indexed seller)",
  "event AuctionStarted(address indexed nftContract, uint256 indexed tokenId, address indexed seller, uint256 revealEndTime)",
  "event BidPlaced(bytes32 indexed auctionKey, address indexed bidder, bytes32 hashedBid, uint256 depositAmount)",
  "event BidRevealed(bytes32 indexed auctionKey, address indexed bidder, uint256 revealedValue)",
  "event AuctionEnded(bytes32 indexed auctionKey, address winner, uint256 winningPrice)"
];