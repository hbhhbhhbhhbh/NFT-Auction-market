import { useState, useEffect } from 'react';
import { Coins, CheckCircle, XCircle, Loader, Banknote } from 'lucide-react'; // 引入 Banknote 图标
import { getStablecoinContract, getMarketplaceContract, formatEther, parseEther, getCurrentAccount } from '../utils/web3';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../config/contracts';

export default function StablecoinPage() {
  const [balance, setBalance] = useState('0');
  const [allowance, setAllowance] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [approveAmount, setApproveAmount] = useState('');
  
  // 新增：管理员入金相关状态
  const [depositAddress, setDepositAddress] = useState('');
  const [hkdAmount, setHkdAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [isOwner, setIsOwner] = useState(false); // 检查是否是管理员

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const account = await getCurrentAccount();
      if (!account) {
        setStatus({ type: 'error', message: 'Please connect your wallet first' });
        return;
      }

      const stablecoinContract = await getStablecoinContract();
      const balance = await stablecoinContract.balanceOf(account);
      setBalance(formatEther(balance));

      // 检查是否是管理员
      const owner = await stablecoinContract.owner();
      if (owner.toLowerCase() === account.toLowerCase()) {
        setIsOwner(true);
      } else {
        setIsOwner(false);
      }

      const marketplaceContract = await getMarketplaceContract();
      const allowance = await stablecoinContract.allowance(account, CONTRACT_ADDRESSES.marketplace);
      setAllowance(formatEther(allowance));
    } catch (error) {
      console.error('Failed to load data:', error);
      setStatus({ type: 'error', message: 'Failed to load data: ' + error.message });
    }
  };

  const handleApprove = async () => {
    // ... (Approve 逻辑保持不变，为了节省篇幅我略过了，实际文件中请保留) ...
    // 如果您直接复制这个文件，请把下面的 handleApprove 和 handleApproveMax 替换为您原来的逻辑
    if (!approveAmount || parseFloat(approveAmount) <= 0) {
      setStatus({ type: 'error', message: 'Please enter a valid approval amount' });
      return;
    }
    setIsLoading(true);
    setStatus({ type: '', message: '' });
    try {
      const stablecoinContract = await getStablecoinContract();
      const amount = parseEther(approveAmount);
      const tx = await stablecoinContract.approve(CONTRACT_ADDRESSES.marketplace, amount);
      setStatus({ type: 'info', message: 'Transaction submitted, waiting for confirmation...' });
      await tx.wait();
      setStatus({ type: 'success', message: 'Approval successful!' });
      setApproveAmount('');
      await loadData();
    } catch (error) {
      setStatus({ type: 'error', message: 'Approval failed: ' + error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveMax = async () => {
    setIsLoading(true);
    setStatus({ type: '', message: '' });
    try {
      const stablecoinContract = await getStablecoinContract();
      const maxAmount = ethers.MaxUint256;
      const tx = await stablecoinContract.approve(CONTRACT_ADDRESSES.marketplace, maxAmount);
      setStatus({ type: 'info', message: 'Transaction submitted, waiting for confirmation...' });
      await tx.wait();
      setStatus({ type: 'success', message: 'Unlimited approval successful!' });
      await loadData();
    } catch (error) {
      setStatus({ type: 'error', message: 'Approval failed: ' + error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // ▼▼▼ 新增：管理员入金处理函数 ▼▼▼
  const handleDeposit = async () => {
    if (!depositAddress || !hkdAmount || parseFloat(hkdAmount) <= 0) {
      setStatus({ type: 'error', message: 'Please enter valid address and amount' });
      return;
    }

    setIsDepositing(true);
    setStatus({ type: '', message: '' });

    try {
      const stablecoinContract = await getStablecoinContract();
      
      // 注意：这里我们传入的是整数的 HKD 数量，合约里会处理汇率
      // 如果合约里是 * 1，那么这里 parseEther 可以保证精度
      // 假设 1 HKD = 1 MPGA (1e18 wei)
      const amountWei = parseEther(hkdAmount); 

      // 调用新函数 transferToUser
      // 参数1: 用户地址, 参数2: 金额 (Wei)
      // 注意：因为合约里是 amount * RATE，如果 RATE=1，我们传入 Wei 进去就是 1:1
      const tx = await stablecoinContract.transferToUser(depositAddress, amountWei);
      
      setStatus({ type: 'info', message: 'Processing fiat deposit...' });
      await tx.wait();
      
      setStatus({ type: 'success', message: `Successfully transferred ${hkdAmount} MPGA to user!` });
      setDepositAddress('');
      setHkdAmount('');
      // 如果是给自己入金，刷新余额
      await loadData();
    } catch (error) {
      console.error('Deposit failed:', error);
      setStatus({ type: 'error', message: 'Deposit failed: ' + error.message });
    } finally {
      setIsDepositing(false);
    }
  };
  // ▲▲▲ 新增结束 ▲▲▲

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <Coins className="w-6 h-6 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Stablecoin Management</h1>
        </div>

        <div className="space-y-6">
          {/* Balance display */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-600 mb-1">Your Balance</p>
                <p className="text-3xl font-bold text-gray-900">{balance} MPGA</p>
              </div>
              <button
                onClick={loadData}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Allowance status */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Marketplace Allowance</h2>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-600 mb-1">Approved Amount</p>
                <p className="text-2xl font-bold text-gray-900">{allowance} MPGA</p>
              </div>
              {parseFloat(allowance) > 0 ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : (
                <XCircle className="w-8 h-8 text-red-500" />
              )}
            </div>
            <p className="text-sm text-gray-500">
              You need to approve the marketplace contract to use your tokens for trading
            </p>
          </div>

          {/* Approval actions */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Approve Marketplace Contract</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approval Amount (MPGA)
                </label>
                <input
                  type="number"
                  value={approveAmount}
                  onChange={(e) => setApproveAmount(e.target.value)}
                  placeholder="Enter approval amount"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  step="0.000001"
                  min="0"
                />
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={handleApprove}
                  disabled={isLoading || !approveAmount}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Approve'
                  )}
                </button>
                <button
                  onClick={handleApproveMax}
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Approve Max'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ▼▼▼ 新增：管理员入金操作区 (只对管理员显示) ▼▼▼ */}
          {isOwner && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mt-6">
              <h2 className="text-xl font-semibold text-yellow-800 mb-4 flex items-center">
                <Banknote className="w-6 h-6 mr-2" />
                Admin: Process Fiat Deposit
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-yellow-900 mb-2">
                    User Wallet Address
                  </label>
                  <input
                    type="text"
                    value={depositAddress}
                    onChange={(e) => setDepositAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-yellow-900 mb-2">
                    Fiat Amount Received (HKD)
                  </label>
                  <input
                    type="number"
                    value={hkdAmount}
                    onChange={(e) => setHkdAmount(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full px-4 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    min="0"
                  />
                </div>
                <button
                  onClick={handleDeposit}
                  disabled={isDepositing || !depositAddress || !hkdAmount}
                  className="w-full px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold"
                >
                  {isDepositing ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Processing Transfer...
                    </>
                  ) : (
                    'Confirm Deposit & Transfer MPGA'
                  )}
                </button>
                <p className="text-xs text-yellow-700 mt-2">
                  * This will transfer MPGA from your admin reserve to the user, based on the 1:1 exchange rate.
                </p>
              </div>
            </div>
          )}
          {/* ▲▲▲ 新增结束 ▲▲▲ */}

          {/* Status message */}
          {status.message && (
            <div
              className={`p-4 rounded-lg ${
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
        </div>
      </div>
    </div>
  );
}