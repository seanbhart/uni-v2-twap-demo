import {
  ContractFactory,
  Contract,
  ContractReceipt,
  ContractTransaction,
  Event,
} from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Address } from "cluster";
import { BigNumber, Bytes } from "ethers";
import { ethers } from "hardhat";
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
import TESTERC20 from "../artifacts/contracts/TESTERC20.sol/TESTERC20.json";

describe("Uni setup", function () {
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addrs: SignerWithAddress[];

  let tokenFactoryFactory: ContractFactory;
  let tokenFactory: Contract;
  // let tokenFactory: ContractFactory;
  let token1: Contract;
  let token1Address: string;
  let token2: Contract;
  let token2Address: string;
  let token3: Contract;
  let token3Address: string;
  let uniFactoryFactory: ContractFactory;
  let uniFactory: Contract;
  // let uniPairAddress: Address;
  let uniPair12Factory: ContractFactory;
  let uniPair12: Contract;
  let uniPair23Factory: ContractFactory;
  let uniPair23: Contract;
  let uniWethFactory: ContractFactory;
  let uniWeth: Contract;
  let uniRouterFactory: ContractFactory;
  let uniRouter: Contract;

  var account2 = ethers.Wallet.createRandom();
  console.log("Uni contracts test");

  before(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    console.log("owner address: ", owner.address);

    // Deploy the test ERC20 tokens
    tokenFactoryFactory = await ethers.getContractFactory("TESTERC20Factory");
    tokenFactory = await tokenFactoryFactory.deploy();
    console.log("tokenFactory Address: ", tokenFactory.address);

    var transaction = await tokenFactory.createToken(
      "CASH Token",
      "CASH",
      50000000
    );
    await transaction.wait();
    token1Address = await tokenFactory.getToken("CASH");
    token1 = new ethers.Contract(token1Address, TESTERC20.abi, owner);

    transaction = await tokenFactory.createToken(
      "LMAO Token",
      "LMAO",
      50000000
    );
    await transaction.wait();
    token2Address = await tokenFactory.getToken("LMAO");
    token2 = new ethers.Contract(token2Address, TESTERC20.abi, owner);

    transaction = await tokenFactory.createToken(
      "MEME Token",
      "MEME",
      50000000
    );
    await transaction.wait();
    token3Address = await tokenFactory.getToken("MEME");
    token3 = new ethers.Contract(token3Address, TESTERC20.abi, owner);

    // tokenFactory = await ethers.getContractFactory("TESTERC20");
    // token1 = await tokenFactory.deploy(
    //   "CASH token",
    //   "CASH",
    //   owner.address,
    //   50000000
    // );
    // token2 = await tokenFactory.deploy(
    //   "LMAO token",
    //   "LMAO",
    //   owner.address,
    //   50000000
    // );
    // token3 = await tokenFactory.deploy(
    //   "MEME token",
    //   "MEME",
    //   owner.address,
    //   50000000
    // );
    console.log(
      "Deployed tokens: ",
      token1.address,
      token2.address,
      token3.address
    );

    // Deploy the Uniswap Pair Factory
    uniFactoryFactory = await ethers.getContractFactory("UniswapV2Factory");
    uniFactory = await uniFactoryFactory.deploy(owner.address);
    console.log("uniFactory: ", uniFactory.address);
    let initCodeHash: Bytes = await uniFactory.INIT_CODE_PAIR_HASH();
    console.log("uniFactory INIT_CODE_PAIR_HASH: ", initCodeHash);

    // Create the token pairs
    await uniFactory.createPair(token1.address, token2.address);
    let uniPair12Address = await uniFactory.getPair(
      token1.address,
      token2.address
    );
    // uniPair12Factory = await ethers.getContractFactory("UniswapV2Pair");
    // uniPair12 = uniPair12Factory.attach(uniPair12Address.toString());
    console.log("uniFactory uniPair12Address: ", uniPair12Address);
    uniPair12 = new ethers.Contract(
      uniPair12Address,
      IUniswapV2Pair.abi,
      owner
    );

    await uniFactory.createPair(token2.address, token3.address);
    let uniPair23Address = await uniFactory.getPair(
      token2.address,
      token3.address
    );
    // uniPair23Factory = await ethers.getContractFactory("UniswapV2Pair");
    // uniPair23 = uniPair23Factory.attach(uniPair23Address.toString());
    console.log("uniFactory uniPair23Address: ", uniPair23Address);
    uniPair23 = new ethers.Contract(
      uniPair23Address,
      IUniswapV2Pair.abi,
      owner
    );

    // Deploy WETH
    uniWethFactory = await ethers.getContractFactory("WETH9");
    uniWeth = await uniWethFactory.deploy();
    console.log("Deployed WETH: ", uniWeth.address);

    // Deploy the Uniswap Router
    console.log(
      "Deploying Uni Router: ",
      uniFactory.address,
      " ",
      uniWeth.address
    );
    uniRouterFactory = await ethers.getContractFactory("UniswapV2Router01");
    uniRouter = await uniRouterFactory.deploy(
      uniFactory.address,
      uniWeth.address
    );
    console.log("Deployed Uni Router");
    console.log(await uniRouter.factory());
  });

  describe("Deployment", function () {
    it("Should have set the right token1 symbol", async function () {
      expect(await token1.symbol()).to.equal("CASH");
    });
    it("Should have set the right token2 symbol", async function () {
      expect(await token2.symbol()).to.equal("LMAO");
    });
    it("Should have set the right token3 symbol", async function () {
      expect(await token3.symbol()).to.equal("MEME");
    });
  });

  describe("Add Liquidity", function () {
    it("Should have 20000000 of tokens 1&3 (40000000 of token 2) in Uni pair", async function () {
      await token1.approve(uniRouter.address, 20000000);
      await token2.approve(uniRouter.address, 40000000);
      await token3.approve(uniRouter.address, 20000000);
      for (let i = 0; i < 2; i++) {
        await uniRouter.addLiquidity(
          token1.address,
          token2.address,
          10000000,
          10000000,
          0,
          0,
          owner.address,
          Math.round(Date.now() / 1000) + 10000
        );

        await uniRouter.addLiquidity(
          token2.address,
          token3.address,
          10000000,
          10000000,
          0,
          0,
          owner.address,
          Math.round(Date.now() / 1000) + 10000
        );
      }

      const [reserve12_0, reserve12_1, timestamp12] =
        await uniPair12.getReserves();
      expect(reserve12_0).to.equal(20000000);
      expect(reserve12_1).to.equal(20000000);

      const [reserve23_0, reserve23_1, timestamp23] =
        await uniPair23.getReserves();
      expect(reserve23_0).to.equal(20000000);
      expect(reserve23_1).to.equal(20000000);
    });

    it("Should have token balance of 20000000 for pair1-2 on token1", async function () {
      const bal12_1 = await token1.balanceOf(uniPair12.address);
      expect(bal12_1).to.equal(20000000);
    });
    it("Should have token balance of 20000000 for pair1-2 on token2", async function () {
      const bal12_2 = await token2.balanceOf(uniPair12.address);
      expect(bal12_2).to.equal(20000000);
    });
    it("Should have token balance of 20000000 for pair2-3 on token2", async function () {
      const bal23_1 = await token2.balanceOf(uniPair23.address);
      expect(bal23_1).to.equal(20000000);
    });
    it("Should have token balance of 20000000 for pair2-3 on token3", async function () {
      const bal23_2 = await token3.balanceOf(uniPair23.address);
      expect(bal23_2).to.equal(20000000);
    });
  });

  describe("Balance", function () {
    it("Should have LP token1-2 balance of 19999000 for sender", async function () {
      const lpBalance12 = await uniPair12.balanceOf(owner.address);
      expect(lpBalance12).to.equal(19999000);
    });
    it("Should have LP token2-3 balance of 19999000 for sender", async function () {
      const lpBalance23 = await uniPair23.balanceOf(owner.address);
      expect(lpBalance23).to.equal(19999000);
    });

    it("Should have token balance of 30000000 for sender on token1", async function () {
      const bal1 = await token1.balanceOf(owner.address);
      expect(bal1).to.equal(30000000);
    });
    it("Should have token balance of 10000000 for sender on token2", async function () {
      const bal2 = await token2.balanceOf(owner.address);
      expect(bal2).to.equal(10000000);
    });
    it("Should have token balance of 30000000 for sender on token3", async function () {
      const bal3 = await token3.balanceOf(owner.address);
      expect(bal3).to.equal(30000000);
    });
  });

  describe("Swap", function () {
    it("Should have swapped 5000 token1 for 5000 token2 for sender", async function () {
      await token1.approve(uniRouter.address, 5000);
      for (let i = 0; i < 5; i++) {
        await uniRouter.swapExactTokensForTokens(
          1000,
          0,
          [token1.address, token2.address],
          owner.address,
          Math.round(Date.now() / 1000) + 10000
        );
      }

      const bal1 = await token1.balanceOf(owner.address);
      const bal2 = await token2.balanceOf(owner.address);
      expect(bal1).to.equal(29995000);
      expect(bal2).to.equal(10004980);
    });

    it("Should have swapped 5000 token1 for 5000 token3 through token2 for sender", async function () {
      await token1.approve(uniRouter.address, 5000);
      for (let i = 0; i < 5; i++) {
        await uniRouter.swapExactTokensForTokens(
          1000,
          0,
          [token1.address, token2.address, token3.address],
          owner.address,
          Math.round(Date.now() / 1000) + 10000
        );
      }

      const bal1 = await token1.balanceOf(owner.address);
      const bal2 = await token2.balanceOf(owner.address);
      const bal3 = await token3.balanceOf(owner.address);
      expect(bal1).to.equal(29990000);
      expect(bal2).to.equal(10004980);
      expect(bal3).to.equal(30004960);
    });
  });

  describe("Remove Liquidity", function () {
    it("Should have removed 10000000 liquidity from pair token1-token2", async function () {
      await uniPair12.sync();
      await uniPair23.sync();

      await uniPair12.approve(uniRouter.address, 10000000);
      await uniPair23.approve(uniRouter.address, 10000000);
      for (let i = 0; i < 10; i++) {
        await uniRouter.removeLiquidity(
          token1.address,
          token2.address,
          1000000,
          0,
          0,
          owner.address,
          Math.round(Date.now() / 1000) + 10000
        );

        // const [reserve12_0, reserve12_1, timestamp12] =
        //   await uniPair12.getReserves();
        // console.log(
        //   "pair12 reserves: ",
        //   i,
        //   BigNumber.from(reserve12_0).toString(),
        //   BigNumber.from(reserve12_1).toString()
        // );

        // const bal1 = await token1.balanceOf(owner.address);
        // const bal2 = await token2.balanceOf(owner.address);
        // console.log(
        //   "token 1 & 2 balances: ",
        //   BigNumber.from(bal1).toString(),
        //   BigNumber.from(bal2).toString()
        // );
      }

      const [reserve12_0, reserve12_1, timestamp12] =
        await uniPair12.getReserves();
      expect(reserve12_0).to.equal(10005000); //10005000
      expect(reserve12_1).to.equal(9995020); //9995020
    });

    it("Should have removed 10000000 liquidity from pair token2-token3", async function () {
      await uniPair23.approve(uniRouter.address, 10000000);
      for (let i = 0; i < 10; i++) {
        await uniRouter.removeLiquidity(
          token2.address,
          token3.address,
          1000000,
          0,
          0,
          owner.address,
          Math.round(Date.now() / 1000) + 10000
        );
      }

      const [reserve23_0, reserve23_1, timestamp23] =
        await uniPair23.getReserves();
      expect(reserve23_0).to.equal(10002490); //10002490
      expect(reserve23_1).to.equal(9997520); //9997520
    });
  });

  describe("Balance", function () {
    it("Should have LP token1-2 balance of 9000 for sender", async function () {
      const lpBalance12 = await uniPair12.balanceOf(owner.address);
      expect(lpBalance12).to.equal(9999000);
    });
    it("Should have LP token2-3 balance of 9000 for sender", async function () {
      const lpBalance23 = await uniPair23.balanceOf(owner.address);
      expect(lpBalance23).to.equal(9999000);
    });

    it("Should have token balance of 35000 for sender on token1", async function () {
      const bal1 = await token1.balanceOf(owner.address);
      expect(bal1).to.equal(39995000);
    });
    it("Should have token balance of 31990 for sender on token2", async function () {
      const bal2 = await token2.balanceOf(owner.address);
      expect(bal2).to.equal(30002490);
    });
    it("Should have token balance of 41169 for sender on token3", async function () {
      const bal3 = await token3.balanceOf(owner.address);
      expect(bal3).to.equal(40002480);
    });
  });

  describe("TWAP", function () {
    it("Should have a block proof", async function () {
      // const pairAddressHex = "0xcDbb67BCB869c7f4b4e791F9f9d9B6164dDade33";
      // const denomTokenHex = "0xb3F234d341624e26f3E73A54106b52Ecc918af53";
      const pairAddress = BigInt(uniPair12.address);
      const denomToken = BigInt(token1Address);
      console.log("pairAddressHex: ", uniPair12.address);
      console.log("pairAddress: ", pairAddress);
      console.log("denomTokenHex: ", token1Address);
      console.log("denomToken: ", denomToken);

      let block = await getBlockByNumber("latest");
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

      // // Mine pending transactions to ensure that the historical block is
      // // different from the "current" block when calculating the TWAP price
      // await ethers.provider.send("evm_mine", []);
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
