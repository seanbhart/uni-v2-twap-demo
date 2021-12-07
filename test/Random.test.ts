import {
  ContractFactory,
  Contract,
  ContractReceipt,
  ContractTransaction,
  Event,
} from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Bytes } from "ethers";
import { ethers } from "hardhat";
import * as OracleSdk from "@keydonix/uniswap-oracle-sdk";
// import * as OracleSdk from "/Users/seanhart/Documents/Ethereum/uniswap-oracle/sdk/source";
import { getStorageAt, getProof, getBlockByNumber } from "../scripts/twap";

import IERC20 from "../artifacts/contracts/interfaces/IERC20.sol/IERC20.json";
import TESTERC20 from "../artifacts/contracts/TESTERC20.sol/TESTERC20.json";
import UniswapV2Router02 from "../artifacts/contracts/libraries/Uniswap/periphery/contracts/UniswapV2Router02.sol/UniswapV2Router02.json";

describe("Fund setup", function () {
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addrs: SignerWithAddress[];

  let tokenFactoryFactory: ContractFactory;
  let tokenFactory: Contract;
  let weth: Contract;
  let wethAddress: string;

  let uniFactoryFactory: ContractFactory;
  let uniFactory: Contract;
  let uniRouterFactory: ContractFactory;
  let uniRouter: Contract;
  let routerAddress: string = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

  let fundFactoryFactory: ContractFactory;
  let fundFactory: Contract;
  let fundAddress: string;

  var account2 = ethers.Wallet.createRandom();
  console.log("Fund contracts test");

  before(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    console.log("owner address: ", owner.address);

    // Deploy the test ERC20s and Uniswap Exchange w/ Pools
    // Deploy the test ERC20 tokens
    tokenFactoryFactory = await ethers.getContractFactory("TESTERC20Factory");
    tokenFactory = await tokenFactoryFactory.deploy();
    console.log("tokenFactory Address: ", tokenFactory.address);

    // Deploy the Uniswap Pair Factory
    uniFactoryFactory = await ethers.getContractFactory("UniswapV2Factory");
    uniFactory = await uniFactoryFactory.deploy(owner.address);
    console.log("uniFactory: ", uniFactory.address);
    let initCodeHash: Bytes = await uniFactory.INIT_CODE_PAIR_HASH();
    console.log("uniFactory INIT_CODE_PAIR_HASH: ", initCodeHash);
    console.log(
      "uniFactory number of pairs: ",
      BigNumber.from(await uniFactory.allPairsLength()).toString()
    );

    // Deploy WETH
    let transaction = await tokenFactory.createToken(
      "Wrapped ETH",
      "WETH",
      90000000
    );
    await transaction.wait();
    wethAddress = await tokenFactory.getToken("WETH");
    weth = new ethers.Contract(wethAddress, TESTERC20.abi, owner);
    console.log("Deployed WETH: ", wethAddress);

    // Deploy the Uniswap Router
    console.log("Deploying Uni Router: ", uniFactory.address, " ", wethAddress);
    uniRouterFactory = await ethers.getContractFactory("UniswapV2Router01");
    uniRouter = await uniRouterFactory.deploy(uniFactory.address, wethAddress);
    routerAddress = uniRouter.address;
    console.log("Deployed Uni Router: ", routerAddress);
    console.log(await uniRouter.factory());
  });
});
