/**
 * @type import('hardhat/config').HardhatUserConfig
 */
import { HardhatUserConfig, task } from "hardhat/config";
import "@openzeppelin/hardhat-upgrades";
import "@nomiclabs/hardhat-waffle";
import "hardhat-gas-reporter";
import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/.env" });

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.address);
  }
});

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      // {
      //   version: "0.8.9",
      //   settings: {
      //     optimizer: {
      //       enabled: true,
      //       runs: 200,
      //     },
      //   },
      // },
      // {
      //   version: "0.8.6",
      //   settings: {
      //     optimizer: {
      //       enabled: true,
      //       runs: 200,
      //     },
      //   },
      // },
      // {
      //   version: "0.7.6",
      //   settings: {
      //     optimizer: {
      //       enabled: true,
      //       runs: 200,
      //     },
      //   },
      // },
      // {
      //   version: "0.6.12",
      //   settings: {
      //     optimizer: {
      //       enabled: true,
      //       runs: 200,
      //     },
      //   },
      // },
      {
        version: "0.6.8",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  mocha: {
    timeout: 60000,
  },
  networks: {
    hardhat: {
      forking: {
        url: `${process.env.NETWORK_FORK}`, //https://hardhat.org/hardhat-network/guides/mainnet-forking.html
        // blockNumber: 13728676,
      },
      mining: {
        auto: true,
        // interval: [3000, 6000]
      },
    },
    local: {
      url: `${process.env.NETWORK_LOCAL}`,
      // chainId: 31337,
      accounts: [`0x${process.env.ACCOUNT_KEY_PRIV_LOCAL}`],
      forking: {
        url: `${process.env.NETWORK_FORK}`,
      },
    },
    kovan: {
      url: `${process.env.NETWORK_KOVAN}`,
      accounts: [`0x${process.env.ACCOUNT_KEY_PRIV_KOVAN}`],
      // gas: 12000000,
      // blockGasLimit: 0x1fffffffffffff,
      // allowUnlimitedContractSize: true,
      // timeout: 1800000,
    },
    rinkeby: {
      url: `${process.env.NETWORK_RINKEBY}`,
      accounts: [`0x${process.env.ACCOUNT_KEY_PRIV_RINKEBY}`],
      // gas: 12000000,
      // blockGasLimit: 0x1fffffffffffff,
      // allowUnlimitedContractSize: true,
      // timeout: 1800000,
    },
  },
  gasReporter: {
    enabled: true,
    coinmarketcap: `${process.env.COIN_MARKET_CAP}`,
    currency: "USD",
    gasPrice: 90,
  },
};

export default config;
