import { ethers } from "hardhat";
import { BigNumber, Bytes } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
// import * as OracleSdk from "@keydonix/uniswap-oracle-sdk";
import * as OracleSdk from "/Users/seanhart/Documents/Ethereum/uniswap-oracle/sdk/source";
import * as OracleSdkAdapter from "@keydonix/uniswap-oracle-ethers-sdk-adapter";
import {
  getStorageAt,
  getProof,
  getBlockByNumber,
  getBlockHashByNumber,
  BlockHash,
} from "../scripts/twap";
import IUniswapV2Pair from "../artifacts/@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol/IUniswapV2Pair.json";

let owner: SignerWithAddress;
let addr1: SignerWithAddress;
let addr2: SignerWithAddress;
let addrs: SignerWithAddress[];

const JSON_RPC = `http://127.0.0.1:8545/`;
// const JSON_RPC = `${process.env.NETWORK_FORK}`;
const provider = new ethers.providers.JsonRpcProvider(JSON_RPC);

before(async function () {
  [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
  console.log("owner address: ", owner.address);

  const block = await provider.send("eth_getBlockByNumber", ["latest", false]);
  console.log("block number: ", block.number);
});

describe("TWAP tests", function () {
  describe("Pair Update", function () {
    it("Should have values in the accumulator", async function () {
      console.log("current time: ", Date.now());
      let block = await provider.send("eth_getBlockByNumber", [
        "latest",
        false,
      ]);
      console.log("block number: ", BigNumber.from(block.number).toString());

      const pair12Contract = new ethers.Contract(
        "0xcDbb67BCB869c7f4b4e791F9f9d9B6164dDade33",
        IUniswapV2Pair.abi,
        owner
      );
      console.log("pair12Contract: ", pair12Contract.address);
      console.log("pair12Contract-token0: ", await pair12Contract.token0());
      console.log("pair12Contract-token1: ", await pair12Contract.token1());
      await pair12Contract.sync();
      console.log(
        "pair12token0oracle: ",
        BigNumber.from(await pair12Contract.price0CumulativeLast()).toString()
      );
      console.log(
        "pair12token1oracle: ",
        BigNumber.from(await pair12Contract.price1CumulativeLast()).toString()
      );
      console.log(
        "kLast: ",
        BigNumber.from(await pair12Contract.kLast()).toString()
      );
      const pair12Reserves = await pair12Contract.getReserves();
      console.log(
        "reserve0: ",
        BigNumber.from(await pair12Reserves.reserve0).toString()
      );
      console.log(
        "reserve1: ",
        BigNumber.from(await pair12Reserves.reserve1).toString()
      );
      console.log("blockTimestampLast: ", pair12Reserves.blockTimestampLast);

      const pair23Contract = new ethers.Contract(
        "0xE5eefFB9275DD86068a7C2b6c4D67c138303F62b",
        IUniswapV2Pair.abi,
        owner
      );
      console.log("pair23Contract: ", pair23Contract.address);
      console.log("pair23Contract-token0: ", await pair23Contract.token0());
      console.log("pair23Contract-token1: ", await pair23Contract.token1());
      await pair23Contract.sync();
      console.log(
        "pair23token0oracle: ",
        BigNumber.from(await pair23Contract.price0CumulativeLast()).toString()
      );
      console.log(
        "pair23token1oracle: ",
        BigNumber.from(await pair23Contract.price1CumulativeLast()).toString()
      );
      console.log(
        "kLast: ",
        BigNumber.from(await pair23Contract.kLast()).toString()
      );
      const pair23Reserves = await pair23Contract.getReserves();
      console.log(
        "reserve0: ",
        BigNumber.from(await pair23Reserves.reserve0).toString()
      );
      console.log(
        "reserve1: ",
        BigNumber.from(await pair23Reserves.reserve1).toString()
      );
      console.log("blockTimestampLast: ", pair23Reserves.blockTimestampLast);

      block = await provider.send("eth_getBlockByNumber", ["latest", false]);
      console.log("block number: ", BigNumber.from(block.number).toString());
      console.log("current time: ", Date.now());
    });
  });

  describe("TWAP", function () {
    it("Should have a block proof", async function () {
      const pairAddressHex = "0xcDbb67BCB869c7f4b4e791F9f9d9B6164dDade33";
      const pairAddress = BigInt(pairAddressHex);
      const denomTokenHex = "0xb3F234d341624e26f3E73A54106b52Ecc918af53";
      const denomToken = BigInt(denomTokenHex);
      console.log("pairAddress: ", pairAddressHex);
      console.log("pairAddress: ", pairAddress);
      console.log("denomToken: ", denomTokenHex);
      console.log("denomToken: ", denomToken);

      const block = await getBlockByNumber("latest");
      let blockNumber = BigInt("13742296");

      if (!block) return;
      // blockNumber = block.number;
      console.log("blockNumber: ", blockNumber);
      const factory = await getStorageAt(pairAddress, 6n, blockNumber);
      const token0 = await getStorageAt(pairAddress, 7n, blockNumber);
      const token1 = await getStorageAt(pairAddress, 8n, blockNumber);
      const resrvAndTime = await getStorageAt(pairAddress, 9n, blockNumber);
      const accumulator0 = await getStorageAt(pairAddress, 10n, blockNumber);
      const accumulator1 = await getStorageAt(pairAddress, 11n, blockNumber);

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

      const estimatedPrice = await OracleSdk.getPrice(
        getStorageAt,
        getBlockByNumber,
        pairAddress,
        BigInt(denomToken),
        blockNumber
      );
      console.log("estimatedPrice:", estimatedPrice);

      const proof = await OracleSdk.getProof(
        getStorageAt,
        getProof,
        getBlockByNumber,
        pairAddress,
        BigInt(denomToken),
        blockNumber
      );
      console.log("proof", proof);
    });
  });
});
