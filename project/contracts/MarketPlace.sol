// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Context.sol";

/**
 * @title COMP5521 Marketplace Contract
 * @author (Your Name Here)
 * @notice 这是 COMP5521 项目的核心市场合约.
 * 它实现了直接销售 (list, buy, cancel)
 * 和一个密封投标式暗拍 (Sealed-Bid Auction) 作为奖励功能.
 */
contract Marketplace is ReentrancyGuard, Context { // ReentrancyGuard 已经继承了 Context
    //-------------------------------------------------------------
    // 状态变量
    //-------------------------------------------------------------

    // 市场使用的稳定币 (例如 COMP5521 Dollar)
    IERC20 public immutable i_stablecoin;

    /**
     * @notice 核心功能：常规上架
     * @dev 映射: NFT 合约地址 => Token ID => 上架信息
     */
    struct Listing {
        address seller;
        uint256 price;
    }
    mapping(address => mapping(uint256 => Listing)) private s_listings;

    /**
     * @notice 奖励功能：暗拍
     * @dev 映射: NFT 合约地址 => Token ID => 拍卖信息
     */
    struct Auction {
        address seller;
        uint256 endTime; // 投标阶段结束时间
        uint256 revealEndTime; // 揭标阶段结束时间
        bool finalized; // 拍卖是否已结算
        address highestBidder;
        uint256 highestBid;
        uint256 secondHighestBid;
    }
    mapping(address => mapping(uint256 => Auction)) private s_auctions;

    // 存储投标人的哈希出价: auctionKey => bidder => hashedBid
    mapping(bytes32 => mapping(address => bytes32)) private s_hashedBids;
    // 存储投标人的押金: auctionKey => bidder => depositAmount
    mapping(bytes32 => mapping(address => uint256)) private s_deposits;
    // 存储已揭示的出价: auctionKey => bidder => revealedBidValue
    mapping(bytes32 => mapping(address => uint256)) private s_revealedBids;

    //-------------------------------------------------------------
    // 事件
    //-------------------------------------------------------------

    // 核心功能事件
    event Listed(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );
    event Sold(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 price
    );
    event Cancelled(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed seller
    );

    // 拍卖事件
    event AuctionStarted(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 revealEndTime
    );
    event BidPlaced(
        bytes32 indexed auctionKey,
        address indexed bidder,
        bytes32 hashedBid,
        uint256 depositAmount
    );
    event BidRevealed(
        bytes32 indexed auctionKey,
        address indexed bidder,
        uint256 revealedValue
    );
    event AuctionEnded(
        bytes32 indexed auctionKey,
        address winner,
        uint256 winningPrice
    );
    event AuctionRefundWithdrawn(bytes32 indexed auctionKey, address indexed bidder, uint256 amount);

    //-------------------------------------------------------------
    // 错误
    //-------------------------------------------------------------
    error Marketplace__PriceMustBeAboveZero();
    error Marketplace__NotTheOwner();
    error Marketplace__AlreadyListed();
    error Marketplace__NotListed();
    error Marketplace__CannotBuyOwnItem();
    error Marketplace__AuctionBiddingPhaseOver();
    error Marketplace__AuctionRevealPhaseNotStarted();
    error Marketplace__AuctionRevealPhaseOver();
    error Marketplace__AuctionAlreadyFinalized();
    error Marketplace__AuctionNotFinalized();
    error Marketplace__AlreadyBid();
    error Marketplace__NoBidPlaced();
    error Marketplace__AlreadyRevealed();
    error Marketplace__HashMismatch();
    error Marketplace__DepositTooLow();
    error Marketplace__WinnerCannotWithdraw();
    error Marketplace__NoRefundAvailable();
    error Marketplace__InvalidTimes();

    //-------------------------------------------------------------
    // 修饰符
    //-------------------------------------------------------------

    modifier notListed(address nftContract, uint256 tokenId) {
        if (s_listings[nftContract][tokenId].seller != address(0)) {
            revert Marketplace__AlreadyListed();
        }
        if (s_auctions[nftContract][tokenId].seller != address(0)) {
            revert Marketplace__AlreadyListed();
        }
        _;
    }

    modifier isListed(address nftContract, uint256 tokenId) {
        if (s_listings[nftContract][tokenId].seller == address(0)) {
            revert Marketplace__NotListed();
        }
        _;
    }

    modifier isOwner(address nftContract, uint256 tokenId) {
        if (IERC721(nftContract).ownerOf(tokenId) != _msgSender()) {
            revert Marketplace__NotTheOwner();
        }
        _;
    }

    //-------------------------------------------------------------
    // 构造函数
    //-------------------------------------------------------------

    constructor(address stablecoinAddress) {
        i_stablecoin = IERC20(stablecoinAddress);
    }

    //-------------------------------------------------------------
    // 核心功能：直接销售
    //-------------------------------------------------------------

    /**
     * @notice 上架一个 NFT 进行直接销售
     * @param nftContract NFT 合约地址
     * @param tokenId NFT 的 Token ID
     * @param price 销售价格 (使用稳定币)
     */
    function listNFT(
        address nftContract,
        uint256 tokenId,
        uint256 price
    )
        external
        notListed(nftContract, tokenId)
        isOwner(nftContract, tokenId)
    {
        if (price == 0) {
            revert Marketplace__PriceMustBeAboveZero();
        }

        // 1. 获取 NFT 托管权
        IERC721(nftContract).transferFrom(_msgSender(), address(this), tokenId);

        // 2. 存储上架信息
        s_listings[nftContract][tokenId] = Listing(_msgSender(), price);

        // 3. 发出事件
        emit Listed(nftContract, tokenId, _msgSender(), price);
    }

    /**
     * @notice 购买一个已上架的 NFT
     * @param nftContract NFT 合约地址
     * @param tokenId NFT 的 Token ID
     */
    function buyNFT(
        address nftContract,
        uint256 tokenId
    ) external nonReentrant isListed(nftContract, tokenId) {
        Listing memory listing = s_listings[nftContract][tokenId];
        if (listing.seller == _msgSender()) {
            revert Marketplace__CannotBuyOwnItem();
        }

        // 1. 原子交换：拉取 ERC20 代币 (从买家 -> 卖家)
        // 这要求买家必须已提前 approve 市场合约
        i_stablecoin.transferFrom(_msgSender(), listing.seller, listing.price);

        // 2. 删除上架
        delete s_listings[nftContract][tokenId];

        // 3. 原子交换：转移 NFT (从市场 -> 买家)
        IERC721(nftContract).safeTransferFrom(address(this), _msgSender(), tokenId);

        // 4. 发出事件
        emit Sold(nftContract, tokenId, _msgSender(), listing.price);
    }

    /**
     * @notice 取消一个上架
     * @param nftContract NFT 合约地址
     * @param tokenId NFT 的 Token ID
     */
    function cancelListing(
        address nftContract,
        uint256 tokenId
    ) external isListed(nftContract, tokenId) {
        Listing memory listing = s_listings[nftContract][tokenId];
        if (listing.seller != _msgSender()) {
            revert Marketplace__NotTheOwner();
        }

        // 1. 删除上架
        delete s_listings[nftContract][tokenId];

        // 2. 归还 NFT
        IERC721(nftContract).safeTransferFrom(address(this), _msgSender(), tokenId);

        // 3. 发出事件
        emit Cancelled(nftContract, tokenId, _msgSender());
    }

    //-------------------------------------------------------------
    // 奖励功能：密封投标式暗拍 (Sealed-Bid Auction)
    //-------------------------------------------------------------

    /**
     * @notice 发起一个暗拍
     * @param nftContract NFT 合约地址
     * @param tokenId NFT 的 Token ID
     * @param biddingTime 投标阶段的持续时间 (秒)
     * @param revealTime 揭标阶段的持续时间 (秒)
     */
    function startAuction(
        address nftContract,
        uint256 tokenId,
        uint256 biddingTime,
        uint256 revealTime
    )
        external
        notListed(nftContract, tokenId)
        isOwner(nftContract, tokenId)
    {
        if (biddingTime == 0 || revealTime == 0) {
            revert Marketplace__InvalidTimes();
        }

        // 1. 获取 NFT 托管权
        IERC721(nftContract).transferFrom(_msgSender(), address(this), tokenId);

        // 2. 创建拍卖
        Auction storage auction = s_auctions[nftContract][tokenId];
        auction.seller = _msgSender();
        auction.endTime = block.timestamp + biddingTime;
        auction.revealEndTime = block.timestamp + biddingTime + revealTime;

        emit AuctionStarted(nftContract, tokenId, _msgSender(), auction.revealEndTime);
    }

    /**
     * @notice 提交一个哈希出价和 ERC20 押金 (投标阶段)
     * @param nftContract NFT 合约地址
     * @param tokenId NFT 的 Token ID
     * @param hashedBid keccak256(abi.encodePacked(bidValue, secretNonce))
     * @param depositAmount 你愿意锁定的最大 ERC20 数量 (必须 >= 你的出价)
     */
    function placeBid(
        address nftContract,
        uint256 tokenId,
        bytes32 hashedBid,
        uint256 depositAmount
    ) external {
        Auction storage auction = s_auctions[nftContract][tokenId];
        if (block.timestamp >= auction.endTime) {
            revert Marketplace__AuctionBiddingPhaseOver();
        }
        bytes32 auctionKey = _getAuctionKey(nftContract, tokenId);
        if (s_hashedBids[auctionKey][_msgSender()] != bytes32(0)) {
            revert Marketplace__AlreadyBid();
        }

        // 1. 拉取 ERC20 押金 (托管在合约)
        i_stablecoin.transferFrom(_msgSender(), address(this), depositAmount);

        // 2. 存储出价哈希和押金
        s_hashedBids[auctionKey][_msgSender()] = hashedBid;
        s_deposits[auctionKey][_msgSender()] = depositAmount;

        emit BidPlaced(auctionKey, _msgSender(), hashedBid, depositAmount);
    }

    /**
     * @notice 揭示你的出价 (揭标阶段)
     * @param nftContract NFT 合约地址
     * @param tokenId NFT 的 Token ID
     * @param bidValue 你的真实出价
     * @param secretNonce 你用于哈希的盐
     */
    function revealBid(
        address nftContract,
        uint256 tokenId,
        uint256 bidValue,
        bytes32 secretNonce
    ) external {
        Auction storage auction = s_auctions[nftContract][tokenId];
        if (block.timestamp < auction.endTime) {
            revert Marketplace__AuctionRevealPhaseNotStarted();
        }
        if (block.timestamp >= auction.revealEndTime) {
            revert Marketplace__AuctionRevealPhaseOver();
        }

        bytes32 auctionKey = _getAuctionKey(nftContract, tokenId);
        if (s_hashedBids[auctionKey][_msgSender()] == bytes32(0)) {
            revert Marketplace__NoBidPlaced();
        }
        if (s_revealedBids[auctionKey][_msgSender()] != 0) {
            revert Marketplace__AlreadyRevealed();
        }

        // 1. 验证哈希
        bytes32 revealedHash = keccak256(abi.encodePacked(bidValue, secretNonce));
        if (s_hashedBids[auctionKey][_msgSender()] != revealedHash) {
            revert Marketplace__HashMismatch();
        }

        // 2. 验证押金
        if (s_deposits[auctionKey][_msgSender()] < bidValue) {
            revert Marketplace__DepositTooLow();
        }

        // 3. 存储揭示的出价
        s_revealedBids[auctionKey][_msgSender()] = bidValue;

        // 4. 更新最高/次高出价
        if (bidValue > auction.highestBid) {
            auction.secondHighestBid = auction.highestBid;
            auction.highestBid = bidValue;
            auction.highestBidder = _msgSender();
        } else if (bidValue > auction.secondHighestBid) {
            auction.secondHighestBid = bidValue;
        }

        emit BidRevealed(auctionKey, _msgSender(), bidValue);
    }

    /**
     * @notice 结算拍卖 (揭标阶段结束后)
     * @param nftContract NFT 合约地址
     * @param tokenId NFT 的 Token ID
     */
    function endAuction(
        address nftContract,
        uint256 tokenId
    ) external nonReentrant {
        Auction storage auction = s_auctions[nftContract][tokenId];
        if (block.timestamp < auction.revealEndTime) {
            revert Marketplace__AuctionRevealPhaseOver();
        }
        if (auction.finalized) {
            revert Marketplace__AuctionAlreadyFinalized();
        }

        auction.finalized = true;
        bytes32 auctionKey = _getAuctionKey(nftContract, tokenId);

        if (auction.highestBidder != address(0)) {
            // --- 有赢家 ---
            // Vickrey 拍卖：赢家支付第二高的出价
            uint256 priceToPay = auction.secondHighestBid;
            if (priceToPay == 0) {
                priceToPay = auction.highestBid;
            }
            uint256 winnerDeposit = s_deposits[auctionKey][auction.highestBidder];
            uint256 refundAmount = winnerDeposit - priceToPay;

            // 1. 将款项 (priceToPay) 转给卖家
            i_stablecoin.transfer(auction.seller, priceToPay);

            // 2. 将多余的押金退还给赢家
            if (refundAmount > 0) {
                i_stablecoin.transfer(auction.highestBidder, refundAmount);
            }

            // 3. 将 NFT 转给赢家
            IERC721(nftContract).safeTransferFrom(
                address(this),
                auction.highestBidder,
                tokenId
            );

            // 赢家的押金记录清零，防止重复提款
            s_deposits[auctionKey][auction.highestBidder] = 0;

            emit AuctionEnded(auctionKey, auction.highestBidder, priceToPay);
        } else {
            // --- 没有赢家 ---
            // 将 NFT 归还给卖家
            IERC721(nftContract).safeTransferFrom(
                address(this),
                auction.seller,
                tokenId
            );
            emit AuctionEnded(auctionKey, address(0), 0);
        }
    }

    /**
     * @notice 允许未中标者/未揭标者取回他们的押金
     * @param nftContract NFT 合约地址
     * @param tokenId NFT 的 Token ID
     */
    function withdrawRefund(
        address nftContract,
        uint256 tokenId
    ) external nonReentrant {
        Auction storage auction = s_auctions[nftContract][tokenId];
        if (!auction.finalized) {
            revert Marketplace__AuctionNotFinalized();
        }

        // 赢家已在 endAuction 中结算
        if (_msgSender() == auction.highestBidder) {
            revert Marketplace__WinnerCannotWithdraw();
        }

        bytes32 auctionKey = _getAuctionKey(nftContract, tokenId);
        uint256 amount = s_deposits[auctionKey][_msgSender()];

        if (amount == 0) {
            revert Marketplace__NoRefundAvailable();
        }

        // 将押金记录清零，然后转账
        s_deposits[auctionKey][_msgSender()] = 0;
        i_stablecoin.transfer(_msgSender(), amount);

        emit AuctionRefundWithdrawn(auctionKey, _msgSender(), amount);
    }

    //-------------------------------------------------------------
    // 视图/Getter 函数
    //-------------------------------------------------------------

    /**
     * @notice 获取常规上架信息
     */
    function getListing(
        address nftContract,
        uint256 tokenId
    ) external view returns (Listing memory) {
        return s_listings[nftContract][tokenId];
    }

    /**
     * @notice 获取拍卖信息
     */
    function getAuction(
        address nftContract,
        uint256 tokenId
    ) external view returns (Auction memory) {
        return s_auctions[nftContract][tokenId];
    }

    /**
     * @notice 获取某个拍卖中某个投标人的押金
     */
    function getDeposit(
        address nftContract,
        uint256 tokenId,
        address bidder
    ) external view returns (uint256) {
        return s_deposits[_getAuctionKey(nftContract, tokenId)][bidder];
    }

    /**
     * @notice 获取某个拍卖中某个投标人的哈希出价
     */
    function getHashedBid(
        address nftContract,
        uint256 tokenId,
        address bidder
    ) external view returns (bytes32) {
        return s_hashedBids[_getAuctionKey(nftContract, tokenId)][bidder];
    }

    /**
     * @notice 获取某个拍卖中某个投标人的已揭示出价
     */
    function getRevealedBid(
        address nftContract,
        uint256 tokenId,
        address bidder
    ) external view returns (uint256) {
        return s_revealedBids[_getAuctionKey(nftContract, tokenId)][bidder];
    }

    //-------------------------------------------------------------
    // 内部/私有函数
    //-------------------------------------------------------------

    /**
     * @notice 为拍卖相关的映射生成一个唯一的 key
     */
    function _getAuctionKey(
        address nftContract,
        uint256 tokenId
    ) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(nftContract, tokenId));
    }
}