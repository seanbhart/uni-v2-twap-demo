import { ethers } from "hardhat";
import { BigNumber, Signer } from "ethers";
import {
  getStorageAt,
  getProof,
  getBlockByNumber,
  getBlockHashByNumber,
  BlockHash,
} from "../scripts/twap";
import * as OracleSdk from "@keydonix/uniswap-oracle-sdk";
// import * as OracleSdk from "/Users/seanhart/Documents/Ethereum/uniswap-oracle/sdk/source";
import IUniswapV2Pair from "../artifacts/@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol/IUniswapV2Pair.json";

describe("Token", function () {
  let accounts: Signer[];
  let sushiOracle;

  before(async function () {
    accounts = await ethers.getSigners();
    // const SushiOracle = await ethers.getContractFactory("SushiOracle");
    // sushiOracle = await SushiOracle.deploy();

    // await sushiOracle.deployed();
  });

  it("should do something right", async function () {
    // Do something with the accounts
    const JSON_RPC = `${process.env.NETWORK_FORK}`;
    const provider = new ethers.providers.JsonRpcProvider(JSON_RPC);

    const exchangeAddressHex = "0xbb2b8038a1640196fbe3e38816f3e67cba72d940";
    const exchangeAddress = BigInt(exchangeAddressHex);
    const denomTokenHex = "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599";
    const denomToken = BigInt(denomTokenHex);
    const blockNumber = BigInt("12680299");
    // const blockNumber = BigInt("13742907");
    const proof = await OracleSdk.getProof(
      getStorageAt,
      getProof,
      getBlockByNumber,
      exchangeAddress,
      denomToken,
      blockNumber
    );
    const block = await getBlockHashByNumber(blockNumber);

    if (!block) return;
    const factory = await getStorageAt(exchangeAddress, 5n, blockNumber);
    const token0 = await getStorageAt(exchangeAddress, 6n, blockNumber);
    const token1 = await getStorageAt(exchangeAddress, 7n, blockNumber);
    const resrvAndTime = await getStorageAt(exchangeAddress, 8n, blockNumber);
    const accumulator0 = await getStorageAt(exchangeAddress, 9n, blockNumber);
    const accumulator1 = await getStorageAt(exchangeAddress, 10n, blockNumber);
    const reserve0 = resrvAndTime & (2n ** 112n - 1n);
    const reserve1 = (resrvAndTime >> 112n) & (2n ** 112n - 1n);
    const blockTimestampLast = resrvAndTime >> (112n + 112n);
    console.log("factory:", ethers.utils.hexValue(factory));
    console.log("token0:", ethers.utils.hexValue(token0));
    console.log("token1:", ethers.utils.hexValue(token1));
    console.log("reservesAndTimestamp:", resrvAndTime);
    console.log("accumulator0:", accumulator0);
    console.log("accumulator1:", accumulator1);
    console.log("reserve0:", reserve0);
    console.log("reserve1:", reserve1);
    console.log("blockTimestampLast:", blockTimestampLast);

    let uniPair = new ethers.Contract(
      exchangeAddressHex,
      IUniswapV2Pair.abi,
      provider
    );
    let reserves = await uniPair.getReserves();
    console.log(
      "reserve0 latest:",
      ethers.utils.formatUnits(reserves.reserve0, 8)
    );
    console.log(
      "reserve1 latest:",
      ethers.utils.formatUnits(reserves.reserve1, 18)
    );
    console.log("blockTimestampLast latest:", reserves.blockTimestampLast);
    let price0CumulativeLast = await uniPair.price0CumulativeLast();
    let price1CumulativeLast = await uniPair.price1CumulativeLast();
    console.log("accumulator0 latest:", price0CumulativeLast.toString());
    console.log("accumulator1 latest:", price1CumulativeLast.toString());

    const timeElapsed = BigNumber.from(reserves.blockTimestampLast).sub(
      blockTimestampLast
    );
    if (timeElapsed.toNumber() === 0) return 0;

    const price0Average = BigNumber.from(price0CumulativeLast)
      .sub(accumulator0)
      .div(timeElapsed);
    console.log("price0Average ", price0Average.toString());
    const price1Average = BigNumber.from(price1CumulativeLast)
      .sub(accumulator1)
      .div(timeElapsed);
    console.log("price1Average ", price1Average.toString());

    const targetRate = ethers.utils.parseEther("1000000000000000000");
    const exchangeRate0 = price1Average
      .mul(targetRate)
      .div(ethers.BigNumber.from(2).pow(112));

    console.log("output ", ethers.utils.formatUnits(exchangeRate0, 8));
    console.log("output ", parseFloat(ethers.utils.formatEther(exchangeRate0)));

    //
    //
    const estimatedPrice = await OracleSdk.getPrice(
      getStorageAt,
      getBlockByNumber,
      exchangeAddress,
      denomToken,
      blockNumber
    );
    console.log("estimatedPrice:", estimatedPrice.toString());

    if (block) {
      const abi =
        '[{"inputs":[{"internalType":"address","name":"uniswapV2Pair","type":"address"},{"components":[{"internalType":"bytes","name":"block","type":"bytes"},{"internalType":"bytes","name":"accountProofNodesRlp","type":"bytes"},{"internalType":"bytes","name":"reserveAndTimestampProofNodesRlp","type":"bytes"},{"internalType":"bytes","name":"priceAccumulatorProofNodesRlp","type":"bytes"}],"internalType":"struct SushiOracle.ProofData","name":"proofData","type":"tuple"},{"internalType":"bytes32","name":"blockHash","type":"bytes32"}],"name":"getAccountStorageRoot","outputs":[{"internalType":"bytes32","name":"storageRootHash","type":"bytes32"},{"internalType":"uint256","name":"blockNumber","type":"uint256"},{"internalType":"uint256","name":"blockTimestamp","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"contract IUniswapV2Pair","name":"uniswapV2Pair","type":"address"},{"internalType":"bool","name":"denominationTokenIs0","type":"bool"}],"name":"getCurrentPriceCumulativeLast","outputs":[{"internalType":"uint256","name":"priceCumulativeLast","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"contract IUniswapV2Pair","name":"uniswapV2Pair","type":"address"},{"internalType":"address","name":"denominationToken","type":"address"},{"internalType":"uint256","name":"blockNum","type":"uint256"},{"components":[{"internalType":"bytes","name":"block","type":"bytes"},{"internalType":"bytes","name":"accountProofNodesRlp","type":"bytes"},{"internalType":"bytes","name":"reserveAndTimestampProofNodesRlp","type":"bytes"},{"internalType":"bytes","name":"priceAccumulatorProofNodesRlp","type":"bytes"}],"internalType":"struct SushiOracle.ProofData","name":"proofData","type":"tuple"}],"name":"getPrice","outputs":[{"internalType":"uint256","name":"price","type":"uint256"},{"internalType":"uint256","name":"blockNumber","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"contract IUniswapV2Pair","name":"uniswapV2Pair","type":"address"},{"internalType":"bool","name":"denominationTokenIs0","type":"bool"},{"components":[{"internalType":"bytes","name":"block","type":"bytes"},{"internalType":"bytes","name":"accountProofNodesRlp","type":"bytes"},{"internalType":"bytes","name":"reserveAndTimestampProofNodesRlp","type":"bytes"},{"internalType":"bytes","name":"priceAccumulatorProofNodesRlp","type":"bytes"}],"internalType":"struct SushiOracle.ProofData","name":"proofData","type":"tuple"},{"internalType":"bytes32","name":"blockHash","type":"bytes32"}],"name":"getPriceRaw","outputs":[{"internalType":"uint256","name":"price","type":"uint256"},{"internalType":"uint256","name":"blockNumber","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"reserveTimestampSlotHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"token0Slot","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"token1Slot","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"contract IUniswapV2Pair","name":"uniswapV2Pair","type":"address"},{"internalType":"bytes32","name":"slotHash","type":"bytes32"},{"components":[{"internalType":"bytes","name":"block","type":"bytes"},{"internalType":"bytes","name":"accountProofNodesRlp","type":"bytes"},{"internalType":"bytes","name":"reserveAndTimestampProofNodesRlp","type":"bytes"},{"internalType":"bytes","name":"priceAccumulatorProofNodesRlp","type":"bytes"}],"internalType":"struct SushiOracle.ProofData","name":"proofData","type":"tuple"},{"internalType":"bytes32","name":"blockHash","type":"bytes32"}],"name":"verifyBlockAndExtractReserveData","outputs":[{"internalType":"uint256","name":"blockTimestamp","type":"uint256"},{"internalType":"uint256","name":"blockNumber","type":"uint256"},{"internalType":"uint256","name":"priceCumulativeLast","type":"uint256"},{"internalType":"uint112","name":"reserve0","type":"uint112"},{"internalType":"uint112","name":"reserve1","type":"uint112"},{"internalType":"uint256","name":"reserveTimestamp","type":"uint256"}],"stateMutability":"view","type":"function"}]';
      const sushiOracle = new ethers.Contract(
        "0x941842953733145bEF4f6EEFa20d5B1A68c3545B",
        abi,
        provider
      );

      // const result = await sushiOracle.getPrice(
      //   ethers.utils.hexValue(exchangeAddress),
      //   denomTokenHex,
      //   12680299,
      //   proof
      // );
      const result = await sushiOracle.getPriceRaw(
        ethers.utils.hexValue(exchangeAddress),
        true,
        proof,
        ethers.utils.hexValue(block.hash)
      );
      // console.log(result);
      console.log(BigNumber.from(result.price).toString());
      console.log(BigNumber.from(result.blockNumber).toString());
    }
  });
});
