import { loadContract } from '../utils/ethereum';
import {
  MKR,
  CHIEF,
  VOTE_PROXY_FACTORY,
  ZERO_ADDRESS
} from '../utils/constants';
import { getCurrency } from '@makerdao/currency';
import { getVotedSlate, getSlateAddresses } from './Chief';
import VoteProxy from '../components/VoteProxy';

const mainnetAddresses = require('../chain/addresses/mainnet.json');

// Writes -----------------------------------------------

const lock = (proxyAddress, amt, unit = MKR) => {
  const mkrAmt = getCurrency(amt, unit).toFixed('wei');
  return this._proxyContract(proxyAddress).lock(mkrAmt);
};

const free = (proxyAddress, amt, unit = MKR) => {
  const mkrAmt = getCurrency(amt, unit).toFixed('wei');
  return this._proxyContract(proxyAddress).free(mkrAmt);
};

const freeAll = proxyAddress => {
  return this._proxyContract(proxyAddress).freeAll();
};

const voteExec = (proxyAddress, picks) => {
  if (Array.isArray(picks))
    //  return this._proxyContract(proxyAddress)['vote(address[])'](picks);
    //return this._proxyContract(proxyAddress)['vote(bytes32)'](picks);
    return;
};

// Reads ------------------------------------------------

export const getVotedProposalAddresses = async proxyAddress => {
  //const x = await loadContract(mainnetAddresses['CHIEF']);
  //console.log("got x", x)

  const _slate = await getVotedSlate(proxyAddress);

  console.log('got slate', _slate);
  console.log('getting addresses for slate', await getSlateAddresses(_slate));
  return await getSlateAddresses(_slate);
};

export const getVoteProxy = async addressToCheck => {
  const {
    hasProxy,
    role,
    address: proxyAddress,
    proxy
  } = await _getProxyStatus(addressToCheck);

  console.log('getVoteProxy got', hasProxy, role, proxyAddress, proxy);

  if (!hasProxy) return { hasProxy, voteProxy: null };

  const otherRole = role === 'hot' ? 'cold' : 'hot';
  const otherAddress = await _getAddressOfRole(proxy, otherRole);
  let proxyObj = {
    hasProxy,
    voteProxy: new VoteProxy({
      proxy,
      [`${role}Address`]: proxy,
      [`${otherRole}Address`]: otherAddress
    })
  };
  console.log('Created proxyObj', JSON.stringify(proxyObj));
  return proxyObj;
};

// Internal --------------------------------------------

const _proxyContract = address => {
  return this.get('smartContract').getContractByAddressAndAbi(
    address,
    null //voteProxyAbi
  );
};

const _proxyFactoryContract = () => {
  return this.get('smartContract').getContractByName(VOTE_PROXY_FACTORY);
};

const _getProxyStatus = async address => {
  const x = await loadContract(mainnetAddresses['VOTE_PROXY_FACTORY']);

  const [proxyAddressCold, proxyAddressHot, proxyAddress] = await Promise.all([
    x.coldMap(address).call(),
    x.hotMap(address).call(),
    x.registry(address).call()
  ]);

  console.log(
    'got hot address',
    proxyAddressHot,
    'cold address',
    proxyAddressCold,
    'proxyAddress',
    proxyAddress
  );

  if (proxyAddressCold !== ZERO_ADDRESS)
    return {
      role: 'cold',
      address: proxyAddressCold,
      hasProxy: true,
      proxy: proxyAddress
    };
  if (proxyAddressHot !== ZERO_ADDRESS)
    return {
      role: 'hot',
      address: proxyAddressHot,
      hasProxy: true,
      proxy: proxyAddress
    };
  return { role: null, address: '', hasProxy: false, proxy: '' };
};

const _getAddressOfRole = async (proxyAddress, role) => {
  const x = await loadContract(proxyAddress);
  console.log('got X', x);
  if (role === 'hot') return x.hot().call();
  else if (role === 'cold') return x.cold().call();
  return null;
};

export const getColdAddress = async proxyAddress => {
  const x = await loadContract(proxyAddress);
  return x.cold().call();
};

export const getHotAddress = async proxyAddress => {
  const x = await loadContract(proxyAddress);
  return x.hot().call();
};
