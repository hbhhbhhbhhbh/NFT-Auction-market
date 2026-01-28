import { useState, useEffect } from 'react';
import { Gavel, Clock, Eye, EyeOff, Loader, CheckCircle, XCircle } from 'lucide-react';
import { getMarketplaceContract, getNFTContract, formatEther, parseEther, getCurrentAccount, hashBid, generateNonce } from '../utils/web3';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../config/contracts';


export default function AuctionPage() {
  const [auctions, setAuctions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  
  // Start auction
  const [startTokenId, setStartTokenId] = useState('');
  const [biddingTime, setBiddingTime] = useState('3600'); // default 1 hour
  const [revealTime, setRevealTime] = useState('3600'); // default 1 hour
  const [isStarting, setIsStarting] = useState(false);
  
  // Place bid
  const [bidNftContract, setBidNftContract] = useState(CONTRACT_ADDRESSES.nft);
  const [bidTokenId, setBidTokenId] = useState('');
  const [bidValue, setBidValue] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [secretNonce, setSecretNonce] = useState('');
  const [hashedBid, setHashedBid] = useState('');
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  
  // Reveal bid
  const [revealNftContract, setRevealNftContract] = useState(CONTRACT_ADDRESSES.nft);
  const [revealTokenId, setRevealTokenId] = useState('');
  const [revealBidValue, setRevealBidValue] = useState('');
  const [revealSecretNonce, setRevealSecretNonce] = useState('');
  const [isRevealing, setIsRevealing] = useState(false);
  
  // End auction
  const [endNftContract, setEndNftContract] = useState(CONTRACT_ADDRESSES.nft);
  const [endTokenId, setEndTokenId] = useState('');
  const [isEnding, setIsEnding] = useState(false);
  
  // Withdraw refund
  const [withdrawNftContract, setWithdrawNftContract] = useState(CONTRACT_ADDRESSES.nft);
  const [withdrawTokenId, setWithdrawTokenId] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  
  // View auction info
  const [viewNftContract, setViewNftContract] = useState(CONTRACT_ADDRESSES.nft);
  const [viewTokenId, setViewTokenId] = useState('');
  const [auctionInfo, setAuctionInfo] = useState(null);
  const [myBidInfo, setMyBidInfo] = useState(null);

  useEffect(() => {
    loadAuctions();
  }, []);

  const loadAuctions = async () => {
    setIsLoading(true);
    setAuctions([]);
    
    try {
      const account = await getCurrentAccount();
      const marketplaceContract = await getMarketplaceContract();
      
      const activeAuctions = [];
      
      for (let i = 0; i < 20; i++) {
        try {
          // 获取拍卖信息
          const auction = await marketplaceContract.getAuction(CONTRACT_ADDRESSES.nft, i);
          
          // 检查拍卖是否存在 (结束时间 > 0 说明存在)
          // 并且还没有被彻底结算清理 (或者你想显示已结束的也可以)
          if (auction.endTime > 0) {
            const now = Math.floor(Date.now() / 1000);
            
            // 构造前端需要的数据结构
            activeAuctions.push({
              nftContract: CONTRACT_ADDRESSES.nft,
              tokenId: i,
              seller: auction.seller,
              highestBid: formatEther(auction.highestBid),
              // 判断当前阶段
              status: now < auction.endTime ? 'Bidding' : (now < auction.revealEndTime ? 'Reveal' : 'Ended')
            });
          }
        } catch (err) {
          // 忽略不存在的 Token ID 报错
        }
      }
      
      setAuctions(activeAuctions);
      
    } catch (error) {
      console.error('Failed to load auctions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewNonce = () => {
    const nonce = generateNonce();
    const hexNonce = ethers.hexlify(nonce);
    setSecretNonce(hexNonce);
    return hexNonce;
  };

  const calculateHashedBid = () => {
    if (bidValue && secretNonce) {
      try {
        const bidValueBigInt = parseEther(bidValue);
        const hash = hashBid(bidValueBigInt, secretNonce);
        setHashedBid(hash);
        return hash;
      } catch (error) {
        console.error('Failed to calculate hash:', error);
        return null;
      }
    }
    return null;
  };

  useEffect(() => {
    calculateHashedBid();
  }, [bidValue, secretNonce]);

  const handleStartAuction = async () => {
    if (!startTokenId || !biddingTime || !revealTime) {
      setStatus({ type: 'error', message: 'Please fill in all fields' });
      return;
    }

    setIsStarting(true);
    setStatus({ type: '', message: '' });

    try {
      const marketplaceContract = await getMarketplaceContract();
      const nftContract = await getNFTContract();
      
      // Check approval
      // ▼▼▼ 修改后的代码：强制请求总授权 ▼▼▼
      // 不再判断是否已经授权，每次都强制弹窗，确保 100% 成功
      console.log("Requesting SetApprovalForAll...");
      setStatus({ type: 'info', message: 'Requesting permission to manage your NFTs...' });
      
      // 使用 setApprovalForAll (一次授权，永久有效)
      const approveTx = await nftContract.setApprovalForAll(CONTRACT_ADDRESSES.marketplace, true);
      await approveTx.wait();
      
      setStatus({ type: 'success', message: 'Approval successful! Starting auction...' });
      // ▲▲▲ 修改结束 ▲▲▲

      const biddingTimeSeconds = parseInt(biddingTime);
      const revealTimeSeconds = parseInt(revealTime);
      const tx = await marketplaceContract.startAuction(
        CONTRACT_ADDRESSES.nft,
        startTokenId,
        biddingTimeSeconds,
        revealTimeSeconds
      );
      setStatus({ type: 'info', message: 'Transaction submitted, waiting for confirmation...' });
      
      await tx.wait();
      setStatus({ type: 'success', message: 'Auction started!' });
      setStartTokenId('');
      await loadAuctions();
    } catch (error) {
      console.error('Failed to start auction:', error);
      setStatus({ type: 'error', message: 'Failed to start auction: ' + error.message });
    } finally {
      setIsStarting(false);
    }
  };

  const handlePlaceBid = async () => {
    if (!bidTokenId || !bidValue || !depositAmount || !secretNonce) {
      setStatus({ type: 'error', message: 'Please fill in all fields' });
      return;
    }

    if (parseFloat(depositAmount) < parseFloat(bidValue)) {
      setStatus({ type: 'error', message: 'Deposit must be greater than or equal to bid' });
      return;
    }

    const hash = calculateHashedBid();
    if (!hash) {
      setStatus({ type: 'error', message: 'Failed to calculate hash' });
      return;
    }

    setIsPlacingBid(true);
    setStatus({ type: '', message: '' });

    try {
      const marketplaceContract = await getMarketplaceContract();
      const deposit = parseEther(depositAmount);
      const tx = await marketplaceContract.placeBid(
        bidNftContract,
        bidTokenId,
        hash,
        deposit
      );
      setStatus({ type: 'info', message: 'Transaction submitted, waiting for confirmation...' });
      
      await tx.wait();
      setStatus({ type: 'success', message: 'Bid placed! Please save your bid and nonce for the reveal phase.' });
    } catch (error) {
      console.error('Failed to place bid:', error);
      setStatus({ type: 'error', message: 'Failed to place bid: ' + error.message });
    } finally {
      setIsPlacingBid(false);
    }
  };

  const handleRevealBid = async () => {
    if (!revealTokenId || !revealBidValue || !revealSecretNonce) {
      setStatus({ type: 'error', message: 'Please fill in all fields' });
      return;
    }

    setIsRevealing(true);
    setStatus({ type: '', message: '' });

    try {
      const marketplaceContract = await getMarketplaceContract();
      const bidValueBigInt = parseEther(revealBidValue);
      let nonceBytes32 = revealSecretNonce;
      if (nonceBytes32.startsWith('0x')) {
        const bytes = ethers.getBytes(nonceBytes32);
        if (bytes.length !== 32) {
          throw new Error('Nonce must be 32 bytes');
        }
      } else {
        nonceBytes32 = ethers.hexlify(ethers.toUtf8Bytes(nonceBytes32));
        const bytes = ethers.getBytes(nonceBytes32);
        const padded = new Uint8Array(32);
        padded.set(bytes.slice(0, Math.min(32, bytes.length)));
        nonceBytes32 = ethers.hexlify(padded);
      }
      const tx = await marketplaceContract.revealBid(
        revealNftContract,
        revealTokenId,
        bidValueBigInt,
        nonceBytes32
      );
      setStatus({ type: 'info', message: 'Transaction submitted, waiting for confirmation...' });
      
      await tx.wait();
      setStatus({ type: 'success', message: 'Bid revealed!' });
      setRevealBidValue('');
      setRevealSecretNonce('');
      await loadAuctionInfo();
    } catch (error) {
      console.error('Failed to reveal bid:', error);
      setStatus({ type: 'error', message: 'Failed to reveal bid: ' + error.message });
    } finally {
      setIsRevealing(false);
    }
  };

  const handleEndAuction = async () => {
    if (!endTokenId) {
      setStatus({ type: 'error', message: 'Please enter Token ID' });
      return;
    }

    setIsEnding(true);
    setStatus({ type: '', message: '' });

    try {
      const marketplaceContract = await getMarketplaceContract();
      const tx = await marketplaceContract.endAuction(endNftContract, endTokenId);
      setStatus({ type: 'info', message: 'Transaction submitted, waiting for confirmation...' });
      
      await tx.wait();
      setStatus({ type: 'success', message: 'Auction ended!' });
      setEndTokenId('');
      await loadAuctionInfo();
    } catch (error) {
      console.error('Failed to end auction:', error);
      setStatus({ type: 'error', message: 'Failed to end auction: ' + error.message });
    } finally {
      setIsEnding(false);
    }
  };

  const handleWithdrawRefund = async () => {
    if (!withdrawTokenId) {
      setStatus({ type: 'error', message: 'Please enter Token ID' });
      return;
    }

    setIsWithdrawing(true);
    setStatus({ type: '', message: '' });

    try {
      const marketplaceContract = await getMarketplaceContract();
      const tx = await marketplaceContract.withdrawRefund(withdrawNftContract, withdrawTokenId);
      setStatus({ type: 'info', message: 'Transaction submitted, waiting for confirmation...' });
      
      await tx.wait();
      setStatus({ type: 'success', message: 'Refund withdrawn!' });
      setWithdrawTokenId('');
      await loadAuctionInfo();
    } catch (error) {
      console.error('Failed to withdraw refund:', error);
      setStatus({ type: 'error', message: 'Failed to withdraw refund: ' + error.message });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const loadAuctionInfo = async () => {
    if (!viewTokenId) {
      setAuctionInfo(null);
      setMyBidInfo(null);
      return;
    }

    try {
      const account = await getCurrentAccount();
      if (!account) return;

      const marketplaceContract = await getMarketplaceContract();
      const auction = await marketplaceContract.getAuction(viewNftContract, viewTokenId);
      
      if (auction.seller === ethers.ZeroAddress) {
        setAuctionInfo(null);
        setMyBidInfo(null);
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const auctionData = {
        seller: auction.seller,
        endTime: Number(auction.endTime),
        revealEndTime: Number(auction.revealEndTime),
        finalized: auction.finalized,
        highestBidder: auction.highestBidder,
        highestBid: formatEther(auction.highestBid),
        secondHighestBid: formatEther(auction.secondHighestBid),
        phase: now < auction.endTime ? 'bidding' : now < auction.revealEndTime ? 'reveal' : 'ended'
      };
      setAuctionInfo(auctionData);

      const deposit = await marketplaceContract.getDeposit(viewNftContract, viewTokenId, account);
      const hashedBid = await marketplaceContract.getHashedBid(viewNftContract, viewTokenId, account);
      const revealedBid = await marketplaceContract.getRevealedBid(viewNftContract, viewTokenId, account);

      setMyBidInfo({
        deposit: formatEther(deposit),
        hashedBid: hashedBid,
        revealedBid: formatEther(revealedBid)
      });
    } catch (error) {
      console.error('Failed to load auction info:', error);
    }
  };

  useEffect(() => {
    loadAuctionInfo();
  }, [viewTokenId, viewNftContract]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Gavel className="w-6 h-6 text-orange-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Sealed-Bid Auction</h1>
          </div>
          <button
            onClick={loadAuctions}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
          >
            Refresh
          </button>
        </div>

        {/* Status message */}
        {status.message && (
          <div
            className={`p-4 rounded-lg mb-6 ${
              status.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : status.type === 'error'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            {status.message}
          </div>
        )}

        {/* View auction info */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Eye className="w-5 h-5 mr-2" />
            View Auction Details
          </h2>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NFT Contract Address
              </label>
              <input
                type="text"
                value={viewNftContract}
                onChange={(e) => setViewNftContract(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token ID
              </label>
              <input
                type="number"
                value={viewTokenId}
                onChange={(e) => setViewTokenId(e.target.value)}
                placeholder="Enter Token ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                min="0"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={loadAuctionInfo}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
              >
                Query
              </button>
            </div>
          </div>

          {auctionInfo && (
            <div className="bg-white rounded-lg p-4 border-2 border-orange-200">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Phase</p>
                  <p className="font-semibold text-lg capitalize">
                    {auctionInfo.phase === 'bidding' && 'Bidding Phase'}
                    {auctionInfo.phase === 'reveal' && 'Reveal Phase'}
                    {auctionInfo.phase === 'ended' && 'Ended'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-semibold text-lg">
                    {auctionInfo.finalized ? 'Finalized' : 'In Progress'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Highest Bid</p>
                  <p className="font-semibold text-lg">{auctionInfo.highestBid} MPGA</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Second Highest Bid</p>
                  <p className="font-semibold text-lg">{auctionInfo.secondHighestBid} MPGA</p>
                </div>
              </div>
              {myBidInfo && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-2">My Bid</p>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Deposit</p>
                      <p className="font-semibold">{myBidInfo.deposit} MPGA</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Revealed Bid</p>
                      <p className="font-semibold">
                        {parseFloat(myBidInfo.revealedBid) > 0
                          ? `${myBidInfo.revealedBid} MPGA`
                          : 'Not Revealed'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Hashed Bid</p>
                      <p className="font-mono text-xs break-all">
                        {myBidInfo.hashedBid !== ethers.ZeroHash
                          ? `${myBidInfo.hashedBid.slice(0, 20)}...`
                          : 'None'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Start auction */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Gavel className="w-5 h-5 mr-2" />
            Start Auction
          </h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token ID
              </label>
              <input
                type="number"
                value={startTokenId}
                onChange={(e) => setStartTokenId(e.target.value)}
                placeholder="Token ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bidding Duration (seconds)
              </label>
              <input
                type="number"
                value={biddingTime}
                onChange={(e) => setBiddingTime(e.target.value)}
                placeholder="3600"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reveal Duration (seconds)
              </label>
              <input
                type="number"
                value={revealTime}
                onChange={(e) => setRevealTime(e.target.value)}
                placeholder="3600"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                min="1"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleStartAuction}
                disabled={isStarting || !startTokenId}
                className="w-full px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isStarting ? (
                  <>
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Gavel className="w-5 h-5 mr-2" />
                    Start
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Place bid */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <EyeOff className="w-5 h-5 mr-2" />
            Place Bid (Bidding Phase)
          </h2>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  NFT Contract Address
                </label>
                <input
                  type="text"
                  value={bidNftContract}
                  onChange={(e) => setBidNftContract(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Token ID
                </label>
                <input
                  type="number"
                  value={bidTokenId}
                  onChange={(e) => setBidTokenId(e.target.value)}
                  placeholder="Token ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  min="0"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bid Value (MPGA)
                </label>
                <input
                  type="number"
                  value={bidValue}
                  onChange={(e) => setBidValue(e.target.value)}
                  placeholder="Bid amount"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  step="0.000001"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deposit (MPGA)
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Deposit amount"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  step="0.000001"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">Must be ≥ bid value</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secret Nonce
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={secretNonce}
                    onChange={(e) => setSecretNonce(e.target.value)}
                    placeholder="0x..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                  />
                  <button
                    onClick={generateNewNonce}
                    type="button"
                    className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm"
                  >
                    Generate
                  </button>
                </div>
              </div>
            </div>
            {hashedBid && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-900 mb-1">Hashed Bid:</p>
                <p className="font-mono text-xs text-blue-800 break-all">{hashedBid}</p>
                <p className="text-xs text-blue-600 mt-2">
                  ⚠️ Please store your bid ({bidValue} MPGA) and nonce for the reveal phase.
                </p>
              </div>
            )}
            <button
              onClick={handlePlaceBid}
              disabled={isPlacingBid || !bidTokenId || !bidValue || !depositAmount || !secretNonce}
              className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isPlacingBid ? (
                <>
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <EyeOff className="w-5 h-5 mr-2" />
                  Submit Bid
                </>
              )}
            </button>
          </div>
        </div>

        {/* Reveal bid */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Eye className="w-5 h-5 mr-2" />
            Reveal Bid (Reveal Phase)
          </h2>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  NFT Contract Address
                </label>
                <input
                  type="text"
                  value={revealNftContract}
                  onChange={(e) => setRevealNftContract(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Token ID
                </label>
                <input
                  type="number"
                  value={revealTokenId}
                  onChange={(e) => setRevealTokenId(e.target.value)}
                  placeholder="Token ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  min="0"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bid Value (MPGA)
                </label>
                <input
                  type="number"
                  value={revealBidValue}
                  onChange={(e) => setRevealBidValue(e.target.value)}
                  placeholder="Your original bid"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  step="0.000001"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secret Nonce
                </label>
                <input
                  type="text"
                  value={revealSecretNonce}
                  onChange={(e) => setRevealSecretNonce(e.target.value)}
                  placeholder="Nonce used previously"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                />
              </div>
            </div>
            <button
              onClick={handleRevealBid}
              disabled={isRevealing || !revealTokenId || !revealBidValue || !revealSecretNonce}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isRevealing ? (
                <>
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                  Revealing...
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5 mr-2" />
                  Reveal Bid
                </>
              )}
            </button>
          </div>
        </div>

        {/* End auction & withdraw refund */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              Finalize Auction
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  NFT Contract Address
                </label>
                <input
                  type="text"
                  value={endNftContract}
                  onChange={(e) => setEndNftContract(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Token ID
                </label>
                <input
                  type="number"
                  value={endTokenId}
                  onChange={(e) => setEndTokenId(e.target.value)}
                  placeholder="Token ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  min="0"
                />
              </div>
              <button
                onClick={handleEndAuction}
                disabled={isEnding || !endTokenId}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isEnding ? (
                  <>
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Finalizing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Finalize
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Withdraw Refund
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  NFT Contract Address
                </label>
                <input
                  type="text"
                  value={withdrawNftContract}
                  onChange={(e) => setWithdrawNftContract(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Token ID
                </label>
                <input
                  type="number"
                  value={withdrawTokenId}
                  onChange={(e) => setWithdrawTokenId(e.target.value)}
                  placeholder="Token ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  min="0"
                />
              </div>
              <button
                onClick={handleWithdrawRefund}
                disabled={isWithdrawing || !withdrawTokenId}
                className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isWithdrawing ? (
                  <>
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Withdrawing...
                  </>
                ) : (
                  <>
                    <Clock className="w-5 h-5 mr-2" />
                    Withdraw
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
