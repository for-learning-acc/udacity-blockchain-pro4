const HDWalletProvider = require('@truffle/hdwallet-provider');
const infuraKey = "28f03ef809dc4f36a7fdf094d52f14f8";

const fs = require('fs');
// const mnemonic = fs.readFileSync(".secret").toString().trim();
const mnemonic = "hen reunion useful energy weird gaze fatal drama increase black lizard supply";

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",     // Localhost (default: none)
      port: 8545,            // Standard Ethereum port (default: none)
      network_id: "*"       // Any network (default: none)
    },

    rinkeby: {
      provider: () => new HDWalletProvider(mnemonic, `https://rinkeby.infura.io/v3/${infuraKey}`),
      network_id: 4,       // rinkeby's id
      gas: 4500000,        // rinkeby has a lower block limit than mainnet
      gasPrice: 10000000,
      skipDryRun: true
    },
  },
  compilers: {
    solc: {
      version: "^0.8.0", 
    }
  }
};