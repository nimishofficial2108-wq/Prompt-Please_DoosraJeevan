// Derived from the uploaded blockchain.zip; local Hardhat node is the default.
require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();
const { AMOY_RPC_URL, PRIVATE_KEY } = process.env;
module.exports = {
  solidity: { version: '0.8.24', settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: {
    localhost: { url: 'http://127.0.0.1:8545', chainId: 31337 },
    // Optional independent deployment, never implied by local mode.
    amoy: { url: AMOY_RPC_URL || 'http://127.0.0.1:8545', accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [], chainId: 80002 },
  },
};
