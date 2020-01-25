import governancePlugin from '@makerdao/dai-plugin-governance';
import trezorPlugin from '@makerdao/dai-plugin-trezor-web';
import ledgerPlugin from '@makerdao/dai-plugin-ledger-web';
import Maker, { ETH, MKR } from '@makerdao/dai';
import configPlugin from '@makerdao/dai-plugin-config';
import { createCurrency } from '@makerdao/currency';

import { netToUri } from '../utils/ethereum';

export default async function createMaker(
  network = 'mainnet',
  useMcdKovanContracts,
  testchainConfigId,
  backendEnv
) {
  const config = {
    plugins: [trezorPlugin, ledgerPlugin, [governancePlugin, { network }]],
    autoAuthenticate: true,
    log: false,
    provider: {
      url: testchainConfigId ? '' : netToUri(network),
      type: 'HTTP'
    }
  };

  //if (useMcdKovanContracts) {
  const MKR = createCurrency('MKR');
  const IOU = createCurrency('IOU');

  const mainnetAddresses = require('./addresses/mainnet.json');
  const addContracts = Object.keys(mainnetAddresses).reduce((result, key) => {
    result[key] = { address: { mainnet: mainnetAddresses[key] } };
    return result;
  }, {});

  const token = {
    erc20: [
      {
        currency: MKR,
        symbol: MKR.symbol,
        address: mainnetAddresses.GOV
      },
      {
        currency: IOU,
        symbol: IOU.symbol,
        address: mainnetAddresses.IOU
      }
    ]
  };

  config.smartContract = { addContracts };
  config.token = token;
  //}

  // Use the config plugin, if we have a testchainConfigId
  if (testchainConfigId) {
    delete config.provider;
    config.plugins.push([
      configPlugin,
      { testchainId: testchainConfigId, backendEnv }
    ]);
  }

  return; //Maker.create('http', config);
}

export { ETH, MKR };
