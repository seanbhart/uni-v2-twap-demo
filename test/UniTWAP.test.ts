import { ContractFactory, Contract, ContractReceipt, ContractTransaction, Event } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Address } from "cluster";
import { BigNumber, Bytes } from "ethers";
import { ethers } from "hardhat";
// import * as OracleSdk from "@keydonix/uniswap-oracle-sdk";
import * as OracleSdk from "/Users/seanhart/Documents/Ethereum/uniswap-oracle/sdk/source";
import * as OracleSdkAdapter from "@keydonix/uniswap-oracle-ethers-sdk-adapter";
import { getStorageAt, getProof, getBlockByNumber, getBlockHashByNumber, BlockHash } from "../scripts/twap";
import IUniswapV2Pair from "../artifacts/@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol/IUniswapV2Pair.json";
import TESTERC20 from "../artifacts/contracts/TESTERC20.sol/TESTERC20.json";

const JSON_RPC = `${process.env.NETWORK_LOCAL}`;
// const JSON_RPC = `${process.env.NETWORK_FORK}`;
const provider = new ethers.providers.JsonRpcProvider(JSON_RPC);

describe("Uni setup", function () {
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addrs: SignerWithAddress[];

  let tokenFactoryFactory: ContractFactory;
  let tokenFactory: Contract;
  let token1: Contract;
  let token1Address: string;
  let token2: Contract;
  let token2Address: string;
  let token3: Contract;
  let token3Address: string;
  // let uniWethFactory: ContractFactory;
  let uniWeth: Contract;
  let uniWethAddress: string;
  let uniFactoryFactory: ContractFactory;
  let uniFactory: Contract;
  let uniPair1Factory: ContractFactory;
  let uniPair1: Contract;
  let accum1_0_before: Number;
  let accum1_0_after: Number;
  let accum1_reserves: any;
  let uniPair2Factory: ContractFactory;
  let uniPair2: Contract;
  let accum2_0_before: Number;
  let accum2_0_after: Number;
  let uniPair3Factory: ContractFactory;
  let uniPair3: Contract;
  let accum3_0_before: Number;
  let accum3_0_after: Number;
  let uniRouterFactory: ContractFactory;
  let uniRouter: Contract;

  let twapFactory: ContractFactory;
  let twap: Contract;

  var account2 = ethers.Wallet.createRandom();
  console.log("Uni contracts test");

  before(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    console.log("owner address: ", owner.address);

    // Deploy the test ERC20 tokens
    tokenFactoryFactory = await ethers.getContractFactory("TESTERC20Factory");
    tokenFactory = await tokenFactoryFactory.deploy();
    console.log("tokenFactory Address: ", tokenFactory.address);

    var transaction = await tokenFactory.createToken("CASH Token", "CASH", 50000000);
    await transaction.wait();
    token1Address = await tokenFactory.getToken("CASH");
    token1 = new ethers.Contract(token1Address, TESTERC20.abi, owner);

    transaction = await tokenFactory.createToken("LMAO Token", "LMAO", 50000000);
    await transaction.wait();
    token2Address = await tokenFactory.getToken("LMAO");
    token2 = new ethers.Contract(token2Address, TESTERC20.abi, owner);

    transaction = await tokenFactory.createToken("MEME Token", "MEME", 50000000);
    await transaction.wait();
    token3Address = await tokenFactory.getToken("MEME");
    token3 = new ethers.Contract(token3Address, TESTERC20.abi, owner);

    console.log("Deployed tokens: ", token1.address, token2.address, token3.address);

    // // Deploy WETH
    transaction = await tokenFactory.createToken("Wrapped ETH", "WETH", 70000000);
    await transaction.wait();
    uniWethAddress = await tokenFactory.getToken("WETH");
    uniWeth = new ethers.Contract(uniWethAddress, TESTERC20.abi, owner);
    // uniWethFactory = await ethers.getContractFactory("WETH9");
    // uniWeth = await uniWethFactory.deploy();
    // console.log("Deployed WETH: ", uniWeth.address);

    // Deploy the Uniswap Pair Factory
    uniFactoryFactory = await ethers.getContractFactory("UniswapV2Factory");
    uniFactory = await uniFactoryFactory.deploy(owner.address);
    console.log("uniFactory: ", uniFactory.address);
    let initCodeHash: Bytes = await uniFactory.INIT_CODE_PAIR_HASH();
    console.log("uniFactory INIT_CODE_PAIR_HASH: ", initCodeHash);

    // Create the token pairs
    await uniFactory.createPair(token1.address, uniWeth.address);
    let uniPair1Address = await uniFactory.getPair(token1.address, uniWeth.address);
    console.log("uniFactory uniPair1Address: ", uniPair1Address);
    uniPair1 = new ethers.Contract(uniPair1Address, IUniswapV2Pair.abi, owner);

    await uniFactory.createPair(token2.address, uniWeth.address);
    let uniPair2Address = await uniFactory.getPair(token2.address, uniWeth.address);
    console.log("uniFactory uniPair2Address: ", uniPair2Address);
    uniPair2 = new ethers.Contract(uniPair2Address, IUniswapV2Pair.abi, owner);

    await uniFactory.createPair(token3.address, uniWeth.address);
    let uniPair3Address = await uniFactory.getPair(token3.address, uniWeth.address);
    console.log("uniFactory uniPair3Address: ", uniPair3Address);
    uniPair3 = new ethers.Contract(uniPair3Address, IUniswapV2Pair.abi, owner);

    // Deploy the Uniswap Router
    console.log("Deploying Uni Router: ", uniFactory.address, " ", uniWeth.address);
    uniRouterFactory = await ethers.getContractFactory("UniswapV2Router02");
    uniRouter = await uniRouterFactory.deploy(uniFactory.address, uniWeth.address);
    console.log("Deployed Uni Router");
    console.log(await uniRouter.factory());

    twapFactory = await ethers.getContractFactory("TWAP");
    twap = await twapFactory.deploy(uniRouter.address, uniFactory.address, uniWeth.address);
    console.log("twap Address: ", twap.address);
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
    it("Should have 20000000 of tokens in each Uni pair", async function () {
      accum1_0_before = await uniPair1.price0CumulativeLast();
      console.log("accum1_0_before: ", accum1_0_before.toString());
      accum1_reserves = await uniPair1.getReserves();
      console.log("accum1_0_reserves: ", accum1_reserves.reserve0.toString(), accum1_reserves.reserve1.toString());
      let block = await getBlockByNumber("latest");
      if (block) {
        console.log("block number, timestamp: ", block.number, block.timestamp);
      }

      await token1.approve(uniRouter.address, 20000000);
      await token2.approve(uniRouter.address, 20000000);
      await token3.approve(uniRouter.address, 20000000);
      await uniWeth.approve(uniRouter.address, 60000000);
      for (let i = 0; i < 2; i++) {
        await uniRouter.addLiquidity(
          token1.address,
          uniWeth.address,
          10000000,
          10000000,
          0,
          0,
          owner.address,
          Math.round(Date.now() / 1000) + 10000,
        );

        await uniRouter.addLiquidity(
          token2.address,
          uniWeth.address,
          10000000,
          10000000,
          0,
          0,
          owner.address,
          Math.round(Date.now() / 1000) + 10000,
        );

        await uniRouter.addLiquidity(
          token3.address,
          uniWeth.address,
          10000000,
          10000000,
          0,
          0,
          owner.address,
          Math.round(Date.now() / 1000) + 10000,
        );
      }

      const [reserve1_0, reserve1_1, timestamp1] = await uniPair1.getReserves();
      expect(reserve1_0).to.equal(20000000);
      expect(reserve1_1).to.equal(20000000);

      const [reserve2_0, reserve2_1, timestamp2] = await uniPair2.getReserves();
      expect(reserve2_0).to.equal(20000000);
      expect(reserve2_1).to.equal(20000000);

      const [reserve3_0, reserve3_1, timestamp3] = await uniPair3.getReserves();
      expect(reserve3_0).to.equal(20000000);
      expect(reserve3_1).to.equal(20000000);
    });

    it("Should have token balance of 20000000 for pair1 on token1", async function () {
      const bal1_1 = await token1.balanceOf(uniPair1.address);
      expect(bal1_1).to.equal(20000000);
    });
    it("Should have token balance of 20000000 for pair2 on token2", async function () {
      const bal2_2 = await token2.balanceOf(uniPair2.address);
      expect(bal2_2).to.equal(20000000);
    });
    it("Should have token balance of 20000000 for pair3 on token3", async function () {
      const bal3_3 = await token3.balanceOf(uniPair3.address);
      expect(bal3_3).to.equal(20000000);
    });

    it("Should have updated accumulators after block mining", async function () {
      // Mine pending transactions to create an historical record for the TWAP oracle
      await provider.send("evm_mine", []);

      accum1_0_after = await uniPair1.price0CumulativeLast();
      let block = await getBlockByNumber("latest");
      console.log("accum12_0_after: ", accum1_0_after.toString());
      accum1_reserves = await uniPair1.getReserves();
      console.log("accum1_0_reserves: ", accum1_reserves.reserve0.toString(), accum1_reserves.reserve1.toString());
      if (block) {
        console.log("block number, timestamp: ", block.number, block.timestamp);
      }
      expect(accum1_0_after).to.not.equal(accum1_0_before);
    });
  });

  describe("Balance", function () {
    it("Should have LP token1 balance of 19999000 for sender", async function () {
      const lpBalance1 = await uniPair1.balanceOf(owner.address);
      expect(lpBalance1).to.equal(19999000);
    });
    it("Should have LP token2 balance of 19999000 for sender", async function () {
      const lpBalance2 = await uniPair2.balanceOf(owner.address);
      expect(lpBalance2).to.equal(19999000);
    });

    it("Should have token balance of 30000000 for sender on token1", async function () {
      const bal1 = await token1.balanceOf(owner.address);
      expect(bal1).to.equal(30000000);
    });
    it("Should have token balance of 30000000 for sender on token2", async function () {
      const bal2 = await token2.balanceOf(owner.address);
      expect(bal2).to.equal(30000000);
    });
    it("Should have token balance of 30000000 for sender on token3", async function () {
      const bal3 = await token3.balanceOf(owner.address);
      expect(bal3).to.equal(30000000);
    });
  });

  describe("Swap", function () {
    it("Should have swapped 5000 token1 for 5000 token2 for sender", async function () {
      accum1_0_before = await uniPair1.price0CumulativeLast();
      let block = await getBlockByNumber("latest");
      console.log("accum1_0_before: ", accum1_0_before.toString());
      accum1_reserves = await uniPair1.getReserves();
      console.log("accum1_0_reserves: ", accum1_reserves.reserve0.toString(), accum1_reserves.reserve1.toString());
      if (block) {
        console.log("block number, timestamp: ", block.number, block.timestamp);
      }

      await token1.approve(uniRouter.address, 5000);
      for (let i = 0; i < 5; i++) {
        await uniRouter.swapExactTokensForTokens(
          1000,
          0,
          [token1.address, uniWeth.address],
          owner.address,
          Math.round(Date.now() / 1000) + 10000,
        );
      }

      const bal1 = await token1.balanceOf(owner.address);
      const bal2 = await uniWeth.balanceOf(owner.address);
      expect(bal1).to.equal(29995000);
      expect(bal2).to.equal(10004980);
    });

    it("Should have updated accumulators after block mining", async function () {
      // Mine pending transactions to create an historical record for the TWAP oracle
      await provider.send("evm_mine", []);

      accum1_0_after = await uniPair1.price0CumulativeLast();
      let block = await getBlockByNumber("latest");
      console.log("accum12_0_after: ", accum1_0_after.toString());
      accum1_reserves = await uniPair1.getReserves();
      console.log("accum1_0_reserves: ", accum1_reserves.reserve0.toString(), accum1_reserves.reserve1.toString());
      if (block) {
        console.log("block number, timestamp: ", block.number, block.timestamp);
      }
      expect(accum1_0_after).to.not.equal(accum1_0_before);
    });

    it("Should have swapped 5000 token1 for 5000 token3 through token2 for sender", async function () {
      await token1.approve(uniRouter.address, 5000);
      for (let i = 0; i < 5; i++) {
        await uniRouter.swapExactTokensForTokens(
          1000,
          0,
          [token1.address, uniWeth.address, token3.address],
          owner.address,
          Math.round(Date.now() / 1000) + 10000,
        );
      }

      const bal1 = await token1.balanceOf(owner.address);
      const bal2 = await uniWeth.balanceOf(owner.address);
      const bal3 = await token3.balanceOf(owner.address);
      expect(bal1).to.equal(29990000);
      expect(bal2).to.equal(10004980);
      expect(bal3).to.equal(30004960);
    });
  });

  describe("Remove Liquidity", function () {
    it("Should have removed 10000000 liquidity from pair token1", async function () {
      accum1_0_before = await uniPair1.price0CumulativeLast();
      let block = await getBlockByNumber("latest");
      console.log("accum1_0_before: ", accum1_0_before.toString());
      accum1_reserves = await uniPair1.getReserves();
      console.log("accum1_0_reserves: ", accum1_reserves.reserve0.toString(), accum1_reserves.reserve1.toString());
      if (block) {
        console.log("block number, timestamp: ", block.number, block.timestamp);
      }

      await uniPair1.sync();
      await uniPair1.approve(uniRouter.address, 10000000);
      // await uniPair23.approve(uniRouter.address, 10000000);
      for (let i = 0; i < 10; i++) {
        await uniRouter.removeLiquidity(
          token1.address,
          uniWeth.address,
          1000000,
          0,
          0,
          owner.address,
          Math.round(Date.now() / 1000) + 10000,
        );
      }

      const [reserve1_0, reserve1_1, timestamp1] = await uniPair1.getReserves();
      expect(reserve1_0).to.equal(10005000); //10005000
      expect(reserve1_1).to.equal(9995020); //9995020
    });

    it("Should have updated accumulators after block mining", async function () {
      // Mine pending transactions to create an historical record for the TWAP oracle
      await provider.send("evm_mine", []);

      accum1_0_after = await uniPair1.price0CumulativeLast();
      let block = await getBlockByNumber("latest");
      console.log("accum1_0_after: ", accum1_0_after.toString());
      accum1_reserves = await uniPair1.getReserves();
      console.log("accum1_0_reserves: ", accum1_reserves.reserve0.toString(), accum1_reserves.reserve1.toString());
      if (block) {
        console.log("block number, timestamp: ", block.number, block.timestamp);
      }
      expect(accum1_0_after).to.not.equal(accum1_0_before);
    });

    it("Should have removed 10000000 liquidity from pair token2", async function () {
      await uniPair2.sync();
      await uniPair2.approve(uniRouter.address, 10000000);
      for (let i = 0; i < 10; i++) {
        await uniRouter.removeLiquidity(
          token2.address,
          uniWeth.address,
          1000000,
          0,
          0,
          owner.address,
          Math.round(Date.now() / 1000) + 10000,
        );
      }

      const [reserve2_0, reserve2_1, timestamp2] = await uniPair2.getReserves();
      expect(reserve2_0).to.equal(10000000); //10002490
      expect(reserve2_1).to.equal(10000000); //9997520
    });
  });

  describe("Balance", function () {
    it("Should have LP token1 balance of 9999000 for sender", async function () {
      const lpBalance1 = await uniPair1.balanceOf(owner.address);
      expect(lpBalance1).to.equal(9999000);
    });
    it("Should have LP token2 balance of 9999000 for sender", async function () {
      const lpBalance2 = await uniPair2.balanceOf(owner.address);
      expect(lpBalance2).to.equal(9999000);
    });

    it("Should have token balance of 39995000 for sender on token1", async function () {
      const bal1 = await token1.balanceOf(owner.address);
      expect(bal1).to.equal(39995000);
    });
    it("Should have token balance of 40000000 for sender on token2", async function () {
      const bal2 = await token2.balanceOf(owner.address);
      expect(bal2).to.equal(40000000);
    });
    it("Should have token balance of 30004960 for sender on token3", async function () {
      const bal3 = await token3.balanceOf(owner.address);
      expect(bal3).to.equal(30004960);
    });
  });

  describe("Pair Update", function () {
    it("Should have values in the accumulator", async function () {
      console.log("current time: ", Date.now());
      let block = await provider.send("eth_getBlockByNumber", ["latest", false]);

      console.log("block number: ", BigNumber.from(block.number).toString());
      console.log("pair1Contract: ", uniPair1.address);
      console.log("pair1Contract-token0: ", await uniPair1.token0());
      console.log("pair1Contract-token1: ", await uniPair1.token1());
      await uniPair1.sync();
      console.log("pair1price0CumulativeLast: ", BigNumber.from(await uniPair1.price0CumulativeLast()).toString());
      console.log("pair1price1CumulativeLast: ", BigNumber.from(await uniPair1.price1CumulativeLast()).toString());
      console.log("kLast: ", BigNumber.from(await uniPair1.kLast()).toString());
      const pair1Reserves = await uniPair1.getReserves();
      console.log("reserve0: ", BigNumber.from(await pair1Reserves.reserve0).toString());
      console.log("reserve1: ", BigNumber.from(await pair1Reserves.reserve1).toString());
      console.log("blockTimestampLast: ", pair1Reserves.blockTimestampLast);

      console.log("pair2Contract: ", uniPair2.address);
      console.log("pair2Contract-token0: ", await uniPair2.token0());
      console.log("pair2Contract-token1: ", await uniPair2.token1());
      await uniPair2.sync();
      console.log("pair2token0oracle: ", BigNumber.from(await uniPair2.price0CumulativeLast()).toString());
      console.log("pair2token1oracle: ", BigNumber.from(await uniPair2.price1CumulativeLast()).toString());
      console.log("kLast: ", BigNumber.from(await uniPair2.kLast()).toString());
      const pair2Reserves = await uniPair2.getReserves();
      console.log("reserve0: ", BigNumber.from(await pair2Reserves.reserve0).toString());
      console.log("reserve1: ", BigNumber.from(await pair2Reserves.reserve1).toString());
      console.log("blockTimestampLast: ", pair2Reserves.blockTimestampLast);

      block = await provider.send("eth_getBlockByNumber", ["latest", false]);
      console.log("block number: ", BigNumber.from(block.number).toString());
      console.log("current time: ", Date.now());
    });
  });

  describe("TWAP", function () {
    it("Should have a block proof", async function () {
      const pairAddressHex = uniPair1.address;
      const pairAddress = BigInt(pairAddressHex);
      const denomTokenHex = token1Address;
      const denomToken = BigInt(denomTokenHex);
      console.log("pairAddressHex: ", pairAddressHex);
      console.log("pairAddress: ", pairAddress);
      console.log("denomTokenHex: ", denomTokenHex);
      console.log("denomToken: ", denomToken);

      let latestBlock = await getBlockByNumber("latest");
      // let blockNumber = BigInt("13742296");

      if (!latestBlock) return;
      let historicBlock = await getBlockByNumber(latestBlock.number - 5n);
      if (!historicBlock) return;
      // const accumNew = await getAccumulators(pairAddress, block.number);
      // const accumOld = await getAccumulators(pairAddress, block.number - 5n);

      // Do the TWAP calc
      // const timeElapsed = BigNumber.from(1638832368).sub(
      //   BigNumber.from(1638832354)
      // );
      // const price0Average = BigNumber.from(
      //   150485965185568216262226290365025191n
      // )
      //   .sub(BigNumber.from(88240554754392476719539775917671143n))
      //   .div(timeElapsed);

      // const timeElapsed = accumNew[2] - accumOld[2];
      // const price0Average = accumNew[0] - accumOld[0];
      // const price1Average = accumNew[1] - accumOld[1];
      // console.log(ethers.utils.parseEther("1"));
      // const exchangeRate0 =
      //   (price0Average * 1000000000000000000000n) / (2n ^ 112n);

      const latestAccumulator = await getAccumulatorValue(
        pairAddress,
        denomToken,
        latestBlock.number,
        latestBlock.timestamp,
      );
      const historicAccumulator = await getAccumulatorValue(
        pairAddress,
        denomToken,
        historicBlock.number,
        historicBlock.timestamp,
      );
      const accumulatorDelta = latestAccumulator - historicAccumulator;
      console.log("accumulatorDelta:", accumulatorDelta);
      const timeDelta = latestBlock.timestamp - historicBlock.timestamp;
      console.log("timeDelta:", timeDelta);
      console.log("TWAP OUTPUT", accumulatorDelta / timeDelta);

      let amountIn: number = 1000000;
      let amountOut = await twap.computeAmountOut(historicAccumulator, latestAccumulator, timeDelta, amountIn);
      let price: number = amountOut.toNumber() / amountIn;
      console.log("amountOut:", amountOut.toNumber());
      console.log("price:", price);

      // // Shifting the base to match the right numbers
      // // Adjust the number of 0s as necessary.
      // const targetRate = ethers.utils.parseEther("1000");
      // const exchangeRate0 = price0Average
      //   .mul(targetRate)
      //   .div(ethers.BigNumber.from(2).pow(112));

      // Returnthe Float of the TWAP
      // console.log(
      //   "TWAP OUTPUT: ",
      //   parseFloat(ethers.utils.formatEther(exchangeRate0))
      // );

      // // Mine pending transactions to ensure that the historical block is
      // // different from the "current" block when calculating the TWAP price
      // await provider.send("evm_mine", []);
      // const estimatedPrice = await OracleSdk.getPrice(
      //   getStorageAt,
      //   getBlockByNumber,
      //   pairAddress,
      //   BigInt(denomToken),
      //   blockNumber
      // );
      // console.log("estimatedPrice:", estimatedPrice);

      // const proof = await OracleSdk.getProof(
      //   getStorageAt,
      //   getProof,
      //   getBlockByNumber,
      //   pairAddress,
      //   denomToken,
      //   latestBlock.number
      // );
      // console.log("proof", proof);

      // let oraclePrice = await twap.getOraclePrice(denomTokenHex, amountIn);
      // console.log("oraclePrice:", oraclePrice.toString());
    });
  });
});

async function getAccumulatorValue(
  pairAddress: bigint,
  denominationToken: bigint,
  blockNumber: bigint,
  timestamp: bigint,
) {
  const factory = await getStorageAt(pairAddress, 6n, blockNumber);
  const token0 = await getStorageAt(pairAddress, 7n, blockNumber);
  const token1 = await getStorageAt(pairAddress, 8n, blockNumber);
  const reservesAndTimestamp = await getStorageAt(pairAddress, 9n, blockNumber);
  const accumulator0 = await getStorageAt(pairAddress, 10n, blockNumber);
  const accumulator1 = await getStorageAt(pairAddress, 11n, blockNumber);
  const blockTimestampLast = reservesAndTimestamp >> (112n + 112n);
  const reserve1 = (reservesAndTimestamp >> 112n) & (2n ** 112n - 1n);
  const reserve0 = reservesAndTimestamp & (2n ** 112n - 1n);
  console.log("factory:", ethers.utils.hexValue(factory));
  console.log("token0:", ethers.utils.hexValue(token0));
  console.log("token1:", ethers.utils.hexValue(token1));
  console.log("reservesAndTimestamp:", reservesAndTimestamp);
  console.log("accumulator0:", accumulator0);
  console.log("accumulator1:", accumulator1);
  console.log("reserve0:", reserve0);
  console.log("reserve1:", reserve1);
  console.log("blockTimestampLast:", blockTimestampLast);
  if (token0 !== denominationToken && token1 !== denominationToken)
    throw new Error(`Denomination token ${denominationToken} is not one of the tokens for exchange ${pairAddress}`);
  if (reserve0 === 0n) throw new Error(`Exchange ${pairAddress} does not have any reserves for token0.`);
  if (reserve1 === 0n) throw new Error(`Exchange ${pairAddress} does not have any reserves for token1.`);
  if (blockTimestampLast === 0n)
    throw new Error(`Exchange ${pairAddress} has not had its first accumulator update (or it is year 2106).`);
  if (accumulator0 === 0n)
    throw new Error(
      `Exchange ${pairAddress} has not had its first accumulator update (or it is 136 years since launch).`,
    );
  if (accumulator1 === 0n)
    throw new Error(
      `Exchange ${pairAddress} has not had its first accumulator update (or it is 136 years since launch).`,
    );
  const numeratorReserve = token0 === denominationToken ? reserve0 : reserve1;
  const denominatorReserve = token0 === denominationToken ? reserve1 : reserve0;
  const accumulator = token0 === denominationToken ? accumulator1 : accumulator0;
  const timeElapsedSinceLastAccumulatorUpdate = timestamp - blockTimestampLast;
  const priceNow = (numeratorReserve * 2n ** 112n) / denominatorReserve;
  console.log("accumulator", accumulator);
  console.log("timeElapsedSinceLastAccumulatorUpdate", timeElapsedSinceLastAccumulatorUpdate);
  console.log("priceNow", priceNow);
  return accumulator + timeElapsedSinceLastAccumulatorUpdate * priceNow;
}

async function getAccumulators(
  pairAddress: bigint,
  blockNumber: bigint,
): Promise<[bigint, bigint, bigint, bigint, bigint]> {
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

  return [accumulator0, accumulator1, blockTimestampLast, reserve0, reserve1];
}
