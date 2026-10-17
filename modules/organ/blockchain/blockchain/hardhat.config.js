require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { AMOY_RPC_URL, PRIVATE_KEY } = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    // Free public testnet with real distributed consensus - no real money needed.
    amoy: {
      url: AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 80002,
    },
  },
};
