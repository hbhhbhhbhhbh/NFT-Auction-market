import { useState, useEffect } from 'react';
import { Image, Plus, Loader, ExternalLink } from 'lucide-react';
import { getNFTContract, getCurrentAccount } from '../utils/web3';
import { CONTRACT_ADDRESSES } from '../config/contracts';

export default function NFTPage() {
  const [myNFTs, setMyNFTs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [tokenURI, setTokenURI] = useState('');
  const [mintToAddress, setMintToAddress] = useState('');

  useEffect(() => {
    loadMyNFTs();
  }, []);

  // ---------------------------------------------------------
  // 核心逻辑：加载 NFT 并解析元数据 (支持 IPFS 和 Base64)
  // ---------------------------------------------------------
  const loadMyNFTs = async () => {
    try {
      const account = await getCurrentAccount();
      if (!account) {
        setStatus({ type: 'error', message: 'Please connect your wallet first' });
        return;
      }

      setIsLoading(true);
      const nftContract = await getNFTContract();
      const nfts = [];

      // 辅助函数：将 ipfs:// 转换为可访问的 http 网关地址
      const toGateway = (uri) => {
        if (!uri) return '';
        if (uri.startsWith('ipfs://')) {
          return uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
        }
        return uri;
      };

      // 扫描前 30 个 Token ID
      for (let i = 0; i < 30; i++) {
        try {
          // 1. 获取 Token URI (链上存储的原始数据)
          // 如果 ID 不存在，这一步会报错，直接跳到 catch
          const rawUri = await nftContract.tokenURI(i);
          
          // 2. 检查所有权
          const owner = await nftContract.ownerOf(i);
          
          if (owner.toLowerCase() === account.toLowerCase()) {
            
            // A. 准备 "View Metadata" 按钮的链接
            // 如果是 IPFS，转为网关链接，否则直接用原始链接
            const metadataViewLink = toGateway(rawUri);

            // B. 准备图片链接 (用于 <img src> 显示)
            let displayImage = rawUri; // 默认值

            try {
              // 情况 1: Base64 编码的 JSON (On-chain)
              if (rawUri.startsWith('data:application/json;base64,')) {
                const json = atob(rawUri.split(',')[1]);
                const metadata = JSON.parse(json);
                if (metadata.image) displayImage = metadata.image;
              } 
              // 情况 2: 外部链接 (IPFS 或 HTTP)
              else {
                // 下载 JSON 文件来读取 image 字段
                // 注意：使用 metadataViewLink (已转网关) 来 fetch
                const response = await fetch(metadataViewLink);
                const metadata = await response.json();
                if (metadata.image) displayImage = metadata.image;
              }
            } catch (err) {
              console.warn(`Metadata parsing warning for #${i}:`, err);
              // 解析失败时不中断，尝试直接用 rawUri 作为图片
            }

            // C. 最后一步：图片链接如果是 ipfs://，也必须转网关
            displayImage = toGateway(displayImage);

            nfts.push({ 
              tokenId: i, 
              image: displayImage,       // 给 <img src> 用
              metadata: metadataViewLink // 给 <a href> 用
            });
          }
        } catch (e) {
          // 忽略不存在的 ID
        }
      }
      setMyNFTs(nfts);
    } catch (error) {
      console.error('Failed to load NFTs:', error);
      setStatus({ type: 'error', message: 'Failed to load NFTs: ' + error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------
  // 铸造逻辑 (支持自动生成 Base64)
  // ---------------------------------------------------------
  const handleMint = async () => {
    if (!mintToAddress.trim()) {
      setStatus({ type: 'error', message: 'Please enter the recipient address' });
      return;
    }

    setIsMinting(true);
    setStatus({ type: '', message: '' });

    try {
      const nftContract = await getNFTContract();
      
      let finalURI = tokenURI;

      // 如果用户留空，自动生成一个独特的 Robot NFT
      if (!finalURI || finalURI.trim() === "") {
         const uniqueId = Date.now().toString(); 
         const imageURI = `https://robohash.org/C5C_${uniqueId}.png?set=set4`; 

         const metadata = {
            name: `COMP5521 NFT #${uniqueId.slice(-4)}`,
            description: "Auto-generated unique NFT",
            image: imageURI,
            attributes: [{ trait_type: "Type", value: "Robot Cat" }]
         };

         const jsonString = JSON.stringify(metadata);
         const base64JSON = btoa(jsonString);
         finalURI = `data:application/json;base64,${base64JSON}`;
      }

      const tx = await nftContract.safeMint(mintToAddress, finalURI);
      setStatus({ type: 'info', message: 'Transaction submitted, waiting for confirmation...' });
      
      await tx.wait();
      setStatus({ type: 'success', message: 'NFT minted successfully!' });
      
      setTokenURI('');
      await loadMyNFTs(); // 铸造完自动刷新列表
    } catch (error) {
      console.error('Minting failed:', error);
      setStatus({ type: 'error', message: 'Minting failed: ' + error.message });
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Image className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">NFT Collection</h1>
          </div>
          <button
            onClick={loadMyNFTs}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Refresh
          </button>
        </div>

        {/* Mint Form */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Mint New NFT
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Address
              </label>
              <input
                type="text"
                value={mintToAddress}
                onChange={(e) => setMintToAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token URI (Optional)
              </label>
              <input
                type="text"
                value={tokenURI}
                onChange={(e) => setTokenURI(e.target.value)}
                placeholder="Leave empty to auto-generate unique image"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                Leave empty to generate a unique Robot/Cat NFT automatically!
              </p >
            </div>
            <button
              onClick={handleMint}
              disabled={isMinting || !mintToAddress}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isMinting ? (
                <>
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                  Minting...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Mint NFT
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status Message */}
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

        {/* NFT Grid */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">My NFTs</h2>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : myNFTs.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Image className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">You don't have any NFTs yet</p >
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myNFTs.map((nft) => (
                <div
                  key={nft.tokenId}
                  className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition"
                >
                  <div className="bg-gradient-to-br from-blue-400 to-purple-500 h-64 flex items-center justify-center overflow-hidden">
                    {nft.image ? (
                      <img
                        src={nft.image}
                        alt={`NFT #${nft.tokenId}`}
                        className="w-full h-full object-cover transform hover:scale-105 transition duration-500"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.classList.remove('bg-white'); // 失败时显示背景色
                        }}
                      />
                    ) : (
                      <Image className="w-16 h-16 text-white opacity-50" />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Token ID: {nft.tokenId.toString()}
                    </h3>
                    <div className="flex items-center justify-between">
                      {/* 【关键修复】：href 指向 nft.metadata，并添加 target="_blank" */}
                      <a
                        href={nft.metadata}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        View Metadata
                        <ExternalLink className="w-4 h-4 ml-1" />
                      </a >
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}