// SPDX-License-Identifier: MIT
pragma solidity >=0.6.8;
pragma experimental ABIEncoderV2;

import "@uniswap/lib/contracts/libraries/FixedPoint.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
// import "@keydonix/uniswap-oracle-contracts/source/UniswapOracle.sol";
import "./libraries/SushiOracle/SushiOracle.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "hardhat/console.sol";

contract TWAP is SushiOracle {
    using FixedPoint for *;
    using SafeMath for uint;
    using UQ112x112 for uint224;

    address public wETH;
    address public pairsFactoryAddress;
    address public routerAddress;
    uint8 public minBlocksBack = uint8(0);
    uint8 public maxBlocksBack = uint8(256);

    IUniswapV2Router02 internal router;

    uint private unlocked = 1;
    modifier lock() {
        require(unlocked == 1, "TWAP: LOCKED");
        unlocked = 0;
        _;
        unlocked = 1;
    }

    constructor(
        address _routerAddress
    ) public {
        routerAddress = _routerAddress;
        router = IUniswapV2Router02(_routerAddress);
        pairsFactoryAddress = router.factory();
        wETH = router.WETH();
    }

    function updateExchangeCriteria(
        address _wETH,
        address _pairsFactoryAddress,
        address _routerAddress
    ) external lock {
        wETH = _wETH;
        pairsFactoryAddress = _pairsFactoryAddress;
        routerAddress = _routerAddress;
    }

    // function updateBlockCriteria(
    //     uint8 _minBlocksBack,
    //     uint8 _maxBlocksBack
    // ) external lock {
    //     minBlocksBack = _minBlocksBack;
    //     maxBlocksBack = _maxBlocksBack;
    // }

    function getOracleAmountOut(
        uint _amountIn,
        address _tokenAddress,
        bytes32 _blockHash,
        ProofData memory _proofData
    ) public view returns (uint256 price) {
        // Ensure the token has a token/ETH exchange pool available
        address pairAddress = getPairForToken(_tokenAddress);
        IUniswapV2Pair pair = IUniswapV2Pair(pairAddress);
        console.log("TWAP-getOracleAmountOut-pairAddress: ", pairAddress);

        bool denominationTokenIs0 = true;
		if (pair.token0() == _tokenAddress) {
			denominationTokenIs0 = true;
		} else if (pair.token1() == _tokenAddress) {
			denominationTokenIs0 = false;
		} else {
			revert("TWAP: denominationToken invalid");
		}

        // Get the oracle price and ensure a price was received
        // DO NOT USE getPrice() method - the blockhash(blockNum) output does not match the correct block hash
        uint256 priceRaw;
        uint256 blockNumber;
        // (priceRaw, blockNumber) = getPriceRaw(pair, denominationTokenIs0, minBlocksBack, maxBlocksBack, _proofData);
        (priceRaw, blockNumber) = getPriceRaw(pair, denominationTokenIs0, _proofData, _blockHash);
        console.log("TWAP-getOracleAmountOut-priceRaw: ", priceRaw);
        price = _computeAmountOut(priceRaw, _amountIn);
        require(price > 0, "TWAP: ORACLE_FAILURE");
    }

    function computeAmountOut(
        uint _priceCumulativeStart,
        uint _priceCumulativeEnd,
        uint _timeElapsed,
        uint _amountIn
    ) public pure returns (uint amountOut) {
        // overflow is desired.
        FixedPoint.uq112x112 memory priceAverage = FixedPoint.uq112x112(
            uint224((_priceCumulativeEnd - _priceCumulativeStart) / _timeElapsed)
        );
        amountOut = priceAverage.mul(_amountIn).decode144();
    }

    function _computeAmountOut(
        uint _priceRaw,
        uint _amountIn
    ) private pure returns (uint amountOut) {
        // overflow is desired.
        FixedPoint.uq112x112 memory priceAverage = FixedPoint.uq112x112(uint224(_priceRaw));
        amountOut = priceAverage.mul(_amountIn).decode144();
    }

    function getPairForToken(
        address _tokenAddress
    ) public view returns (address pair) {
        // Use the UniV2 Factory to find the token/ETH pair
        pair = IUniswapV2Factory(router.factory()).getPair(_tokenAddress, wETH);
        // The pair address might not exist as a pair contract - the address is merely deterministic
        require(IUniswapV2Pair(pair).token0() != address(0), "TWAP: PAIR_ZERO_ADDRESS");
    }
}