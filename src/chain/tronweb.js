const TronWeb = require('tronweb');
const TronGrid = require('trongrid');

const HttpProvider = TronWeb.providers.HttpProvider;
// Full node http endpoint
const fullNode = new HttpProvider('http://192.168.0.108:9090');
// Solidity node http endpoint
const solidityNode = new HttpProvider('http://192.168.0.108:9090');
// Contract events http endpoint
const eventServer = 'http://192.168.0.108:9090';

// update with your private key here
const privateKey =
  '3f2cdb5f5d5c8618b1aeb6b32ca4f32c9254c01150161962898eab4c089bc554';
const _address = 'TJzcZvmyrztfHhvCD8s6zi2AVYoscgWqtJ';

const tronWeb = new TronWeb(fullNode, solidityNode, eventServer, privateKey);
const tronGrid = new TronGrid(tronWeb);

export { tronWeb, tronGrid };
