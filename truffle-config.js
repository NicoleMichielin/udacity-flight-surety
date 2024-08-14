const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
  contracts_directory: "./contracts",

  networks: {
    development: {
      host: "127.0.0.1",     // Localhost (default: none)
      port: 9545,            // Standard Ethereum port (default: none)
      network_id: "5777",    // Ganache network id
      websockets: true
    },

    sepolia: {
      provider: () => new HDWalletProvider({
        mnemonic: "digital want thunder emerge trap banner siege weekend say search annual frame",
        providerOrUrl: `https://sepolia.infura.io/v3/f4c83644ae044a20bc2a56927e675663`,
        numberOfAddresses: 1,
        shareNonce: true,
      }),
      network_id: 11155111,  // Sepolia's id
      gas: 8000000,
      confirmations: 2,      // # of confirmations to wait between deployments
      timeoutBlocks: 500,    // # of blocks before a deployment times out
      skipDryRun: true,      // Skip dry run before migrations
      deploymentPollingInterval: 15000,
      networkCheckTimeout: 1000000
    }
  },

  compilers: {
    solc: {
      version: "0.8.20",    // Fetch exact version from solc-bin (default: truffle's version)
      settings: {           // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: "shanghai"
      }
    }
  }
};