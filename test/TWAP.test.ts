import { ethers } from "hardhat";
import { ContractFactory, Contract } from "@ethersproject/contracts";
import { BigNumber, Bytes } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import * as OracleSdk from "@keydonix/uniswap-oracle-sdk";
import { getStorageAt, getProof, getBlockByNumber, getBlockHashByNumber, BlockHash } from "../scripts/twap";
import { expect } from "chai";
import SushiOracle from "../artifacts/contracts/libraries/SushiOracle/SushiOracle.sol/SushiOracle.json";

let owner: SignerWithAddress;
let addr1: SignerWithAddress;
let addr2: SignerWithAddress;
let addrs: SignerWithAddress[];

let twapFactory: ContractFactory;
let twap: Contract;

// const tokenAddress = "0xb3F234d341624e26f3E73A54106b52Ecc918af53";
const tokenAddress = "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599";
const uniRouterAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

const JSON_RPC = `${process.env.NETWORK_FORK}`;
const JSON_RPC_LOCAL = `${process.env.NETWORK_LOCAL}`;
const providerLocal = new ethers.providers.JsonRpcProvider(JSON_RPC_LOCAL);
const provider = new ethers.providers.JsonRpcProvider(JSON_RPC);

let blockNumber = BigInt("12680299");
let pairAddress = "0x000";
let proof: OracleSdk.Proof;
let block: any;

describe("TWAP tests", function () {
  before(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    console.log("owner address: ", owner.address);

    block = await provider.send("eth_getBlockByNumber", ["latest", false]);
    console.log("block number: ", block.number);

    twapFactory = await ethers.getContractFactory("TWAP");
    twap = await twapFactory.deploy(uniRouterAddress);
    console.log("twap Address: ", twap.address);
  });

  describe("Testnet - Block Data", function () {
    it("Should have a block", async function () {
      console.log("current time: ", Date.now());
      // blockNumber = BigInt(block.number) - 5n;
      block = await provider.send("eth_getBlockByNumber", [ethers.utils.hexValue(blockNumber), false]);
      console.log("block number: ", blockNumber.toString());
      expect(blockNumber).to.equal(BigInt(block.number));
    });

    it("Should have the token/WETH pair address", async function () {
      pairAddress = await twap.getPairForToken(tokenAddress);
      console.log("pairAddress: ", pairAddress);
      expect(pairAddress).to.not.equal("0x000");
    });

    it("Should have a block proof", async function () {
      // const exchangeAddressHex = "0xbb2b8038a1640196fbe3e38816f3e67cba72d940";
      // const exchangeAddress = BigInt(exchangeAddressHex);
      // const denomTokenHex = "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599";
      // const denomToken = BigInt(denomTokenHex);
      // const blockNum = BigInt("12680299");
      // // const blockNumber = BigInt("13742907");
      // const prf = await OracleSdk.getProof(
      //   getStorageAt,
      //   getProof,
      //   getBlockByNumber,
      //   exchangeAddress,
      //   denomToken,
      //   blockNum,
      // );
      // console.log(prf);

      proof = await OracleSdk.getProof(
        getStorageAt,
        getProof,
        getBlockByNumber,
        BigInt(pairAddress),
        BigInt(tokenAddress),
        blockNumber,
        // BigInt("12680299"),
      );
      console.log("proof", proof.block);
      expect(proof.block).to.not.empty;
    });
  });

  describe("Hardhat Local - TWAP Contract", function () {
    it("Should get price from oracle", async function () {
      console.log("block number: ", BigInt(block.number).toString());
      console.log("blockNumber: ", blockNumber);
      const price = await twap.getOracleAmountOut(
        "1000000000000000000",
        tokenAddress,
        ethers.utils.hexValue(block.hash),
        proof,
      );
      console.log("price: ", price);

      // block = await getBlockHashByNumber(blockNumber);
      // if (!block) return;
      // const result = await twap.getPriceRaw(
      //   ethers.utils.hexValue(pairAddress),
      //   true,
      //   proof,
      //   ethers.utils.hexValue(block.hash),
      // );
      // console.log(BigNumber.from(result.price).toString());
      // console.log(BigNumber.from(result.blockNumber).toString());
    });
  });
});
