// SPDX-License-Identifier: MIT
// pragma solidity =0.5.16;
pragma solidity >=0.6.8;
pragma experimental ABIEncoderV2;

import '@uniswap/lib/contracts/libraries/FixedPoint.sol';
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@keydonix/uniswap-oracle-contracts/source/UniswapOracle.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import 'hardhat/console.sol';

contract TWAP is UniswapOracle {
    using FixedPoint for *;
    using SafeMath for uint;
    using UQ112x112 for uint224;

    address public WETH;
    address public pairsFactoryAddress;
    address public routerAddress;
    uint8 public immutable minBlocksBack = uint8(200);
    uint8 public immutable maxBlocksBack = uint8(256);

    IUniswapV2Router02 internal router;

    uint private unlocked = 1;
    modifier lock() {
        require(unlocked == 1, 'TWAP: LOCKED');
        unlocked = 0;
        _;
        unlocked = 1;
    }

    constructor(address _routerAddress, address _pairsFactoryAddress, address _wethAddress) public {
        routerAddress = _routerAddress;
        router = IUniswapV2Router02(_routerAddress);
        pairsFactoryAddress = _pairsFactoryAddress;
        WETH = _wethAddress;
    }

    function getOraclePrice(address _tokenAddress, UniswapOracle.ProofData memory _proofData) internal view returns (uint256 price) {
        // Ensure the token has a token/ETH exchange pool available
        address pair = _getPairForToken(_tokenAddress);

        // Determine which token is the target token
        address token0Address = IUniswapV2Pair(pair).token0();
        address token1Address = IUniswapV2Pair(pair).token1();
        bool token0IsTarget = true;
        if (_tokenAddress == token1Address) {
            token0IsTarget = false;
        } else {
            require(_tokenAddress == token0Address, 'TWAP: WRONG_PAIR');
        }

        // Get the oracle price and ensure a price was received
        uint256 blockNumber;
        (price, blockNumber) = getPrice(IUniswapV2Pair(pair), _tokenAddress, minBlocksBack, maxBlocksBack, _proofData);
        console.log("TWAP-_getOraclePrice-price: ", price);
        // uint price0Last = IUniswapV2Pair(pair).price0CumulativeLast();
        // uint price1Last = IUniswapV2Pair(pair).price1CumulativeLast();
        // price = price0Last;
        // if (!token0IsTarget) { price = price1Last; }
        require(price > 0, 'TWAP: ORACLE_FAILURE');
    }

    function computeAmountOut(
        uint priceCumulativeStart, uint priceCumulativeEnd,
        uint timeElapsed, uint amountIn
    ) public pure returns (uint amountOut) {
        // overflow is desired.
        FixedPoint.uq112x112 memory priceAverage = FixedPoint.uq112x112(
            uint224((priceCumulativeEnd - priceCumulativeStart) / timeElapsed)
        );
        amountOut = priceAverage.mul(amountIn).decode144();
    }

    function _getPairForToken(address _tokenAddress) internal view returns (address pair) {
        // Use the UniV2 Factory to find the token/ETH pair
        pair = IUniswapV2Factory(router.factory()).getPair(_tokenAddress, WETH);
        // The pair address might not exist as a pair contract - the address is merely deterministic
        require(IUniswapV2Pair(pair).token0() != address(0), 'TWAP: PAIR_ZERO_ADDRESS');
    }
}