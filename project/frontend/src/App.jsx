import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Wallet, Home, Coins, Image, ShoppingCart, Gavel } from 'lucide-react';
import { connectWallet, getCurrentAccount, onAccountsChanged, removeAccountsChangedListener } from './utils/web3';
import HomePage from './pages/HomePage';
import StablecoinPage from './pages/StablecoinPage';
import NFTPage from './pages/NFTPage';
import MarketplacePage from './pages/MarketplacePage';
import AuctionPage from './pages/AuctionPage';
import './index.css';

function Navigation() {
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkConnection();
    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        setAccount(accounts[0]);
      } else {
        setAccount(null);
      }
    };
    onAccountsChanged(handleAccountsChanged);
    return () => {
      removeAccountsChangedListener(handleAccountsChanged);
    };
  }, []);

  const checkConnection = async () => {
    try {
      const currentAccount = await getCurrentAccount();
      setAccount(currentAccount);
    } catch (error) {
      console.error('Failed to check connection:', error);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const address = await connectWallet();
      setAccount(address);
    } catch (error) {
      alert('Failed to connected wallet: ' + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <nav className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2 text-xl font-bold hover:text-purple-200">
              <Home className="w-6 h-6" />
              <span>NFT Marketplace</span>
            </Link>
            <div className="flex space-x-4">
              <Link to="/stablecoin" className="flex items-center space-x-1 hover:text-purple-200 transition">
                <Coins className="w-4 h-4" />
                <span>Stablecoin</span>
              </Link>
              <Link to="/nft" className="flex items-center space-x-1 hover:text-purple-200 transition">
                <Image className="w-4 h-4" />
                <span>NFT</span>
              </Link>
              <Link to="/marketplace" className="flex items-center space-x-1 hover:text-purple-200 transition">
                <ShoppingCart className="w-4 h-4" />
                <span>Marketplace</span>
              </Link>
              <Link to="/auction" className="flex items-center space-x-1 hover:text-purple-200 transition">
                <Gavel className="w-4 h-4" />
                <span>Auction</span>
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {account ? (
              <div className="flex items-center space-x-2 bg-white/20 px-4 py-2 rounded-lg">
                <Wallet className="w-4 h-4" />
                <span className="text-sm font-mono">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </span>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-purple-50 transition disabled:opacity-50"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/stablecoin" element={<StablecoinPage />} />
            <Route path="/nft" element={<NFTPage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/auction" element={<AuctionPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;










