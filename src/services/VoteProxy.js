import { loadContract } from '../utils/ethereum';
import {
  MKR,
  CHIEF,
  VOTE_PROXY_FACTORY,
  ZERO_ADDRESS
} from '../utils/constants';
import { getCurrency } from '@makerdao/currency';
import { getVotedSlate, getSlateAddresses } from './Chief';

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
    return this._proxyContract(proxyAddress)['vote(address[])'](picks);
  return this._proxyContract(proxyAddress)['vote(bytes32)'](picks);
};

// Reads ------------------------------------------------

export const getVotedProposalAddresses = async proxyAddress => {
  const x = await loadContract(mainnetAddresses['CHIEF']);
  //console.log("got x", x)
  const _slate = await getVotedSlate(proxyAddress).call();

  return getSlateAddresses(_slate).call();
};

export const getVoteProxy = async addressToCheck => {
  const { hasProxy, role, address: proxyAddress } = await _getProxyStatus(
    addressToCheck
  );

  console.log('user has proxy :', hasProxy);

  if (!hasProxy) return { hasProxy, voteProxy: null };
  const otherRole = role === 'hot' ? 'cold' : 'hot';
  const otherAddress = await _getAddressOfRole(proxyAddress, otherRole);
  return {
    hasProxy,
    address: proxyAddress /*new VoteProxy({
        voteProxyService: this,
        proxyAddress,
        [`${role}Address`]: addressToCheck,
        [`${otherRole}Address`]: otherAddress
      })*/
  };
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

  const [proxyAddressCold, proxyAddressHot] = await Promise.all([
    x.coldMap(address).call(),
    x.hotMap(address).call()
  ]);

  console.log(
    'got hot address',
    proxyAddressHot,
    'cold address',
    proxyAddressCold
  );

  if (proxyAddressCold !== ZERO_ADDRESS)
    return { role: 'cold', address: proxyAddressCold, hasProxy: true };
  if (proxyAddressHot !== ZERO_ADDRESS)
    return { role: 'hot', address: proxyAddressHot, hasProxy: true };
  return { role: null, address: '', hasProxy: false };
};

const _getAddressOfRole = async (proxyAddress, role) => {
  const x = await loadContract(proxyAddress);
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
