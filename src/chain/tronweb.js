const TronWeb = require('tronweb');
const TronGrid = require('trongrid');

const HttpProvider = TronWeb.providers.HttpProvider;
// Full node http endpoint
const fullNode = new HttpProvider('http://192.168.0.102:9090');
// Solidity node http endpoint
const solidityNode = new HttpProvider('http://192.168.0.102:9090');
// Contract events http endpoint
const eventServer = 'http://192.168.0.102:9090';

// update with your private key here
const privateKey =
  '83b44bc40393db67d6de8103d20a0126273e791a820b667308933b9132c3964b';
const _address = 'TE8WpgPn3q1a3w2w9wt3LnKPPe1EkFYeZf';

const tronWeb = new TronWeb(fullNode, solidityNode, eventServer, privateKey);
const tronGrid = new TronGrid(tronWeb);

export { tronWeb, tronGrid };
