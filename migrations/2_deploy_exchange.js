const fs = require('fs')
const path = require('path')
const utils = require('../scripts/utils.js')
const CONFIG = path.resolve(__dirname, '../config')
const LOCAL_CONFIG = path.join(CONFIG, 'local.json')

// Require the contract name and not the file name
// https://ethereum.stackexchange.com/a/48643/24916
const BaseToken = artifacts.require('ERC20')
const UniSwapExchangeTemplate = artifacts.require('uniswap_exchange')
const UniSwapFactory = artifacts.require('uniswap_factory')

module.exports = async (deployer) => {
  const ERC20Config = {
    name: 'Swiss Token',
    symbol: 'XCHF',
    decimals: 18,
    supply: 10000000000000000000,
  }
  // Create the ERC20 token
  const baseToken = await deployer.deploy(
    BaseToken,
    utils.stringToBytes32(ERC20Config.name),
    utils.stringToBytes32(ERC20Config.symbol),
    utils.numberToUint(ERC20Config.decimals),
    utils.numberToUint(ERC20Config.supply)
  )

  // Use the Factory to create the exchange
  const template = await deployer.deploy(UniSwapExchangeTemplate)

  // Create the UniSwap Factory
  const factory = await deployer.deploy(UniSwapFactory)

  // Set the template address
  await factory.initializeFactory(template.address)

  // Make a sanity check before moving forward. Since .createExchange() has mulitple
  // asserts and that truffles error messages are sparse, we ensure the required
  // values are defined before continuing.
  const factoryInitialisationCheck = await factory.exchangeTemplate.call()
  if (factoryInitialisationCheck === utils.zeroAddress) {
    throw new Error('Failed to set exchange template')
    process.exit(1)
  }

  // Now we can use the factory to generate a BaseToken Exchange
  let exchange;
  try {
    const createTx = await factory.createExchange(BaseToken.address, { gas: 4712388 })
    // Retrieve the created Exchange address from the logs
    exchange = createTx.receipt.logs[0].args.exchange
    console.debug('Created the Exchange', exchange)

  } catch (e) {
    console.log('Failed to deploy Exchange', e)
  } finally {
    if (!exchange) { return }

    // Since the exchange address is not saved by truffle we generate a seperate
    // config file.
    const settings = {
      BASE_TOKEN: BaseToken.address,
      UNISWAP_FACTORY: factory.address,
      UNISWAP_EXCHANGE_TEMPLATE: template.address,
      UNISWAP_EXCAHNGE: exchange,
    }

    console.debug(`Creating ${LOCAL_CONFIG} with:`)
    console.debug(JSON.stringify(settings, undefined, 2))
    fs.writeFileSync(
      LOCAL_CONFIG,
      JSON.stringify(settings, undefined, 2),
      'utf-8'
    )
  }

};
