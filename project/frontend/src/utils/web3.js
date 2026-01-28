import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, STABLECOIN_ABI, NFT_ABI, MARKETPLACE_ABI } from '../config/contracts.js';

// 获取以太坊提供者
export const getProvider = () => {
  if (typeof window.ethereum !== 'undefined') {
    return new ethers.BrowserProvider(window.ethereum);
  }
  throw new Error('Please install MetaMask or other Web3 wallet');
};

// 连接钱包
export const connectWallet = async () => {
  if (typeof window.ethereum !== 'undefined') {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      return accounts[0];
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  } else {
    throw new Error('Please install MetaMask');
  }
};

// 获取当前账户
export const getCurrentAccount = async () => {
  if (typeof window.ethereum !== 'undefined') {
    const provider = getProvider();
    const accounts = await provider.listAccounts();
    return accounts.length > 0 ? accounts[0].address : null;
  }
  return null;
};

// 获取合约实例
export const getStablecoinContract = async () => {
  const provider = getProvider();
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESSES.stablecoin, STABLECOIN_ABI, signer);
};

export const getNFTContract = async () => {
  const provider = getProvider();
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESSES.nft, NFT_ABI, signer);
};

export const getMarketplaceContract = async () => {
  const provider = getProvider();
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESSES.marketplace, MARKETPLACE_ABI, signer);
};

// 格式化以太币金额
export const formatEther = (value) => {
  return ethers.formatEther(value);
};

// 解析以太币金额
export const parseEther = (value) => {
  return ethers.parseEther(value);
};

// 监听账户变化
export const onAccountsChanged = (callback) => {
  if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', callback);
  }
};

// 移除账户变化监听
export const removeAccountsChangedListener = (callback) => {
  if (typeof window.ethereum !== 'undefined') {
    window.ethereum.removeListener('accountsChanged', callback);
  }
};

// 生成哈希出价（用于暗拍）
export const hashBid = (bidValue, secretNonce) => {
  // secretNonce 应该是 bytes32，如果传入的是 hex string，需要转换
  const nonceBytes = typeof secretNonce === 'string' ? ethers.getBytes(secretNonce) : secretNonce;
  return ethers.solidityPackedKeccak256(
    ['uint256', 'bytes32'],
    [bidValue, nonceBytes]
  );
};

// 生成随机nonce
export const generateNonce = () => {
  return ethers.randomBytes(32);
};

