import { ethers } from "hardhat";
import { BigNumber, Bytes } from "ethers";
// import FaucetERC20Factory from "../artifacts/contracts/FaucetERC20Factory.sol/FaucetERC20Factory.json";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // -------------------------------------
  /* Deploy the token factory contracts
   */
  const faucetERC20FactoryFactory = await ethers.getContractFactory(
    "FaucetERC20Factory"
  );
  const faucetERC20Factory = await faucetERC20FactoryFactory.deploy();
  await new Promise((f) => setTimeout(f, 1000));
  console.log("Deployed tokenTestFactory: ", faucetERC20Factory.address);

  // -------------------------------------
  /* Deploy the required tokens
   */
  const faucetERC20ConstructFactory = await ethers.getContractFactory(
    "FaucetERC20Construct"
  );

  // FLASH is required for FlashV3 deployment
  const tokenFLASH = await faucetERC20ConstructFactory.deploy(
    "FLASH V3",
    "FLASH",
    deployer.address,
    "1000000000000000000000000"
  );
  await new Promise((f) => setTimeout(f, 1000));
  // const tokenFLASHFactory = await ethers.getContractFactory("FLASH21");
  // const tokenFLASH = await tokenFLASHFactory.deploy(
  //   deployer.address,
  //   1000000000
  // );
  faucetERC20Factory.addToken(tokenFLASH.address, "FLASH");
  console.log("Deployed tokenFLASH: ", tokenFLASH.address);

  // WETH is required for UniV2
  const tokenWETH = await faucetERC20ConstructFactory.deploy(
    "Wrapped ETH",
    "WETH",
    deployer.address,
    "1000000000000000000000000"
  );
  await new Promise((f) => setTimeout(f, 1000));
  // const wethTokenContractFactory = await ethers.getContractFactory("WETH9");
  // const wethToken = await wethTokenContractFactory.deploy();
  faucetERC20Factory.addToken(tokenWETH.address, "WETH");
  console.log("Deployed tokenWETH: ", tokenWETH.address);

  // console.log(
  //   "check token factory for FLASH: ",
  //   await faucetERC20Factory.tokenList("FLASH")
  // );
  // console.log(
  //   "check token factory for WETH: ",
  //   await faucetERC20Factory.tokenList("WETH")
  // );

  // -------------------------------------
  /* Deploy the Flash Protocol Contracts
   */
  const flashFactoryFactory = await ethers.getContractFactory("FlashV3Factory");
  const flashFactory = await flashFactoryFactory.deploy(
    deployer.address,
    tokenFLASH.address
  );
  await new Promise((f) => setTimeout(f, 1000));
  console.log("FlashV3Factory address:", flashFactory.address);

  let initCodeHash: Bytes = await flashFactory.INIT_CODE_PAIR_HASH();
  console.log("FlashV3Pair INIT_CODE_PAIR_HASH: ", initCodeHash);

  const routerContractFactory = await ethers.getContractFactory(
    "FlashV3Router"
  );
  const routerFactory = await routerContractFactory.deploy(
    flashFactory.address,
    tokenWETH.address,
    tokenFLASH.address
  );
  await new Promise((f) => setTimeout(f, 1000));
  console.log("routerFactory address:", routerFactory.address);
  // -------------------------------------

  // const pairContractFactory = await ethers.getContractFactory("FlashV3Pair");
  // const pair = await pairContractFactory.deploy();
  // console.log("FlashV3Pair address: ", pair.address);

  // // Deploy the test ERC20 token
  // const tokenFactory = await ethers.getContractFactory("FaucetERC20");
  // const token1 = await tokenFactory.deploy(
  //   "BASH token",
  //   "BASH",
  //   deployer.address,
  //   50000000
  // );
  // const token2 = await tokenFactory.deploy(
  //   "CASH token",
  //   "CASH",
  //   deployer.address,
  //   50000000
  // );
  // const token3 = await tokenFactory.deploy(
  //   "DASH token",
  //   "DASH",
  //   deployer.address,
  //   50000000
  // );
  // console.log(
  //   "Deployed tokens: ",
  //   token1.address,
  //   token2.address,
  //   token3.address
  // );
  // console.log(
  //   "token1 supply: ",
  //   ethers.BigNumber.from(await token1.totalSupply()).toString()
  // );

  // const pairContractFactory = await ethers.getContractFactory("FlashV3Factory");
  // const factoryFactory = await pairContractFactory.deploy(
  //   token1.address,
  //   token2.address,
  //   token3.address
  // );
  // console.log("factoryFactory address:", factoryFactory.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
