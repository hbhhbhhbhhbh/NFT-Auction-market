import { Link } from 'react-router-dom';
import { Coins, Image, ShoppingCart, Gavel, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          COMP5521 NFT Marketplace
        </h1>
        <p className="text-xl text-gray-600">
          A decentralized digital collectibles trading platform
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Link
          to="/stablecoin"
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1"
        >
          <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4 mx-auto">
            <Coins className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
            Stablecoin
          </h3>
          <p className="text-gray-600 text-center mb-4">
            View and manage your MPGA token balance
          </p>
          <div className="flex items-center justify-center text-purple-600">
            <span className="text-sm font-semibold">Enter</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </div>
        </Link>

        <Link
          to="/nft"
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1"
        >
          <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4 mx-auto">
            <Image className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
            NFT Collectibles
          </h3>
          <p className="text-gray-600 text-center mb-4">
            Create and view your digital collectibles
          </p>
          <div className="flex items-center justify-center text-blue-600">
            <span className="text-sm font-semibold">Enter</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </div>
        </Link>

        <Link
          to="/marketplace"
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1"
        >
          <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4 mx-auto">
            <ShoppingCart className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
            Direct Sale
          </h3>
          <p className="text-gray-600 text-center mb-4">
            List and purchase NFTs
          </p>
          <div className="flex items-center justify-center text-green-600">
            <span className="text-sm font-semibold">Enter</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </div>
        </Link>

        <Link
          to="/auction"
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1"
        >
          <div className="flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4 mx-auto">
            <Gavel className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
            Sealed Bid Auction
          </h3>
          <p className="text-gray-600 text-center mb-4">
            Participate in or initiate sealed auctions
          </p>
          <div className="flex items-center justify-center text-orange-600">
            <span className="text-sm font-semibold">Enter</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </div>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Features</h2>
        <div className="space-y-4 text-gray-700">
          <div>
            <h3 className="font-semibold text-lg mb-2">1. Stablecoin (MPGA)</h3>
            <p>The marketplace's transaction medium. Supports balance viewing and authorizing market contracts to use tokens.</p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">2. NFT Collectibles</h3>
            <p>Create unique digital collectibles, each NFT has a unique token ID and metadata URI.</p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">3. Direct Sale Marketplace</h3>
            <p>List your NFTs at fixed prices or browse and purchase NFTs listed by others.</p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">4. Sealed Bid Auction</h3>
            <p>Participate in or initiate auctions using the Vickrey mechanism (second-price sealed-bid), protecting bidder privacy.</p>
          </div>
        </div>
      </div>
    </div>
  );
}


