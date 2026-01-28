import { useState, useEffect } from 'react';
import { ShoppingCart, List, X, Loader, Search } from 'lucide-react';
import { getMarketplaceContract, getNFTContract, formatEther, parseEther, getCurrentAccount } from '../utils/web3';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../config/contracts';


export default function MarketplacePage() {
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  
  // Listing form
  const [listTokenId, setListTokenId] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [isListing, setIsListing] = useState(false);
  
  // Buy form
  const [buyNftContract, setBuyNftContract] = useState(CONTRACT_ADDRESSES.nft);
  const [buyTokenId, setBuyTokenId] = useState('');
  const [isBuying, setIsBuying] = useState(false);
  
  // Cancel listing
  const [cancelNftContract, setCancelNftContract] = useState(CONTRACT_ADDRESSES.nft);
  const [cancelTokenId, setCancelTokenId] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    setIsLoading(true);
    try {
      setListings([]);
      
      const marketplaceContract = await getMarketplaceContract();
      
      const activeListings = [];
      
      // 扫描前 20 个 ID
      for (let i = 0; i < 20; i++) {
        try {
          const listing = await marketplaceContract.getListing(CONTRACT_ADDRESSES.nft, i);
          
          // 如果 seller 不是空地址，说明已上架
          if (listing.seller !== ethers.ZeroAddress) {
            activeListings.push({
              nftContract: CONTRACT_ADDRESSES.nft,
              tokenId: i,
              seller: listing.seller,
              price: formatEther(listing.price)
            });
          }
        } catch (err) {}
      }
      
      setListings(activeListings);

    } catch (error) {
      console.error('Failed to load listings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleList = async () => {
    if (!listTokenId || !listPrice || parseFloat(listPrice) <= 0) {
      setStatus({ type: 'error', message: 'Please enter a valid Token ID and price' });
      return;
    }

    setIsListing(true);
    setStatus({ type: '', message: '' });

    try {
      const marketplaceContract = await getMarketplaceContract();
      const nftContract = await getNFTContract();
      
      const approved = await nftContract.getApproved(listTokenId);
      const isApprovedForAll = await nftContract.isApprovedForAll(
        await getCurrentAccount(),
        CONTRACT_ADDRESSES.marketplace
      );

      if (approved.toLowerCase() !== CONTRACT_ADDRESSES.marketplace.toLowerCase() && !isApprovedForAll) {
        const approveTx = await nftContract.approve(CONTRACT_ADDRESSES.marketplace, listTokenId);
        await approveTx.wait();
      }

      const price = parseEther(listPrice);
      const tx = await marketplaceContract.listNFT(CONTRACT_ADDRESSES.nft, listTokenId, price);
      setStatus({ type: 'info', message: 'Transaction submitted, waiting for confirmation...' });
      
      await tx.wait();
      setStatus({ type: 'success', message: 'NFT listed successfully!' });
      setListTokenId('');
      setListPrice('');
      await loadListings();
    } catch (error) {
      console.error('Listing failed:', error);
      setStatus({ type: 'error', message: 'Listing failed: ' + error.message });
    } finally {
      setIsListing(false);
    }
  };

  const handleBuy = async () => {
    if (!buyTokenId) {
      setStatus({ type: 'error', message: 'Please enter a Token ID' });
      return;
    }

    setIsBuying(true);
    setStatus({ type: '', message: '' });

    try {
      const marketplaceContract = await getMarketplaceContract();
      const listing = await marketplaceContract.getListing(buyNftContract, buyTokenId);
      
      if (listing.seller === ethers.ZeroAddress) {
        setStatus({ type: 'error', message: 'This NFT is not listed' });
        return;
      }

      const tx = await marketplaceContract.buyNFT(buyNftContract, buyTokenId);
      setStatus({ type: 'info', message: 'Transaction submitted, waiting for confirmation...' });
      
      await tx.wait();
      setStatus({ type: 'success', message: 'Purchase successful!' });
      setBuyTokenId('');
      await loadListings();
    } catch (error) {
      console.error('Purchase failed:', error);
      setStatus({ type: 'error', message: 'Purchase failed: ' + error.message });
    } finally {
      setIsBuying(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTokenId) {
      setStatus({ type: 'error', message: 'Please enter a Token ID' });
      return;
    }

    setIsCancelling(true);
    setStatus({ type: '', message: '' });

    try {
      const marketplaceContract = await getMarketplaceContract();
      const tx = await marketplaceContract.cancelListing(cancelNftContract, cancelTokenId);
      setStatus({ type: 'info', message: 'Transaction submitted, waiting for confirmation...' });
      
      await tx.wait();
      setStatus({ type: 'success', message: 'Listing cancelled successfully!' });
      setCancelTokenId('');
      await loadListings();
    } catch (error) {
      console.error('Cancel failed:', error);
      setStatus({ type: 'error', message: 'Cancel failed: ' + error.message });
    } finally {
      setIsCancelling(false);
    }
  };

  const checkListing = async (nftContract, tokenId) => {
    try {
      const marketplaceContract = await getMarketplaceContract();
      const listing = await marketplaceContract.getListing(nftContract, tokenId);
      if (listing.seller !== ethers.ZeroAddress) {
        return {
          seller: listing.seller,
          price: formatEther(listing.price)
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">NFT Marketplace</h1>
          </div>
          <button
            onClick={loadListings}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
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

        <div className="grid md:grid-cols-2 gap-6">
          {/* List NFT */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <List className="w-5 h-5 mr-2" />
              List NFT
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Token ID
                </label>
                <input
                  type="number"
                  value={listTokenId}
                  onChange={(e) => setListTokenId(e.target.value)}
                  placeholder="Enter Token ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (MPGA)
                </label>
                <input
                  type="number"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                  placeholder="Enter price"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  step="0.000001"
                  min="0"
                />
              </div>
              <button
                onClick={handleList}
                disabled={isListing || !listTokenId || !listPrice}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isListing ? (
                  <>
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Listing...
                  </>
                ) : (
                  <>
                    <List className="w-5 h-5 mr-2" />
                    List
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Buy NFT */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Buy NFT
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  NFT Contract Address
                </label>
                <input
                  type="text"
                  value={buyNftContract}
                  onChange={(e) => setBuyNftContract(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Token ID
                </label>
                <input
                  type="number"
                  value={buyTokenId}
                  onChange={(e) => setBuyTokenId(e.target.value)}
                  placeholder="Enter Token ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min="0"
                />
              </div>
              <button
                onClick={handleBuy}
                disabled={isBuying || !buyTokenId}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isBuying ? (
                  <>
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Buying...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Buy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Cancel Listing */}
        <div className="bg-gray-50 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <X className="w-5 h-5 mr-2" />
            Cancel Listing
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NFT Contract Address
              </label>
              <input
                type="text"
                value={cancelNftContract}
                onChange={(e) => setCancelNftContract(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token ID
              </label>
              <input
                type="number"
                value={cancelTokenId}
                onChange={(e) => setCancelTokenId(e.target.value)}
                placeholder="Enter Token ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                min="0"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleCancel}
                disabled={isCancelling || !cancelTokenId}
                className="w-full px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isCancelling ? (
                  <>
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <X className="w-5 h-5 mr-2" />
                    Cancel Listing
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Listings */}
        <div className="mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">NFTs on Marketplace</h2>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader className="w-8 h-8 animate-spin text-green-600" />
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No NFTs currently listed</p>
              <p className="text-sm text-gray-500 mt-2">Note: In a real application, use event logs to fetch all listings</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <div
                  key={`${listing.nftContract}-${listing.tokenId}`}
                  className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition"
                >
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Token ID: {listing.tokenId}
                  </h3>
                  <p className="text-gray-600 mb-2">Price: {listing.price} MPGA</p>
                  <p className="text-sm text-gray-500 font-mono">
                    Seller: {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


