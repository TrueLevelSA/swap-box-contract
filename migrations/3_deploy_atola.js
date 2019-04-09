const Atola = artifacts.require('Atola')
const config = (process.env.NODE_ENV === 'production')
  ? require('../config/ropsten.json')
  : require('../config/local.json')

if (!config) { throw new Error('Missing config file') }

const baseToken = config.BASE_TOKEN
const baseExchange = config.UNISWAP_EXCAHNGE

module.exports = function(deployer) {
  deployer.deploy(Atola, baseToken, baseExchange);
};
