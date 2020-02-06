import uniqWith from 'ramda/src/uniqWith';
import concat from 'ramda/src/concat';
import pipe from 'ramda/src/pipe';
import differenceWith from 'ramda/src/differenceWith';

import { createReducer } from '../utils/redux';
import { AccountTypes, CHIEF, ZERO_ADDRESS } from '../utils/constants';
import { loadContract } from '../utils/ethereum';

import {
  getNumDeposits,
  getVotedSlate,
  getSlateAddresses
} from '../services/Chief';
import {
  getVoteProxy,
  getColdAddress,
  getHotAddress,
  getVotedProposalAddresses
} from '../services/VoteProxy';
import {
  add,
  eq,
  subtract,
  toNum,
  promiseRetry,
  promisedProperties,
  addMkrAndEthBalance
} from '../utils/misc';
import {
  SEND_MKR_TO_PROXY_SUCCESS,
  WITHDRAW_MKR_SUCCESS,
  WITHDRAW_ALL_MKR_SUCCESS,
  MKR_APPROVE_SUCCESS,
  IOU_APPROVE_SUCCESS
} from './sharedProxyConstants';
import { MAX_UINT_ETH_BN } from '../utils/ethereum';
import { MKR } from '../chain/maker';

// Constants ----------------------------------------------
const mainnetAddresses = require('../chain/addresses/mainnet.json');

// the Ledger subprovider interprets these paths to mean that the last digit is
// the one that should be incremented.
// i.e. the second path for Live is "44'/60'/1'/0/0"
// and the second path for Legacy is "44'/60'/0'/0/1"
const LEDGER_LIVE_PATH = "44'/60'/0'";
const LEDGER_LEGACY_PATH = "44'/60'/0'/0";
const DEFAULT_ACCOUNTS_PER_PAGE = 5;

const REMOVE_ACCOUNTS = 'accounts/REMOVE_ACCOUNTS';
export const SET_ACTIVE_ACCOUNT = 'accounts/SET_ACTIVE_ACCOUNT';
export const FETCHING_ACCOUNT_DATA = 'accounts/FETCHING_ACCOUNT_DATA';
export const UPDATE_ACCOUNT = 'accounts/UPDATE_ACCOUNT';
export const ADD_ACCOUNT = 'accounts/ADD_ACCOUNT';
const SET_UNLOCKED_MKR = 'accounts/SET_UNLOCKED_MKR';
export const NO_METAMASK_ACCOUNTS = 'accounts/NO_METAMASK_ACCOUNTS';

export const HARDWARE_ACCOUNTS_CONNECTING =
  'accounts/HARDWARE_ACCOUNTS_CONNECTING';
export const HARDWARE_ACCOUNTS_CONNECTED =
  'accounts/HARDWARE_ACCOUNTS_CONNECTED';
export const HARDWARE_ACCOUNTS_ERROR = 'accounts/HARDWARE_ACCOUNTS_ERROR';

export const HARDWARE_ACCOUNT_CONNECTED = 'accounts/HARDWARE_ACCOUNT_CONNECTED';
export const HARDWARE_ACCOUNT_ERROR = 'accounts/HARDWARE_ACCOUNT_ERROR';

// Selectors ----------------------------------------------

export function getAccount(state, address) {
  console.log('got state', state);
  return state.accounts.allAccounts.find(a => eq(a.address, address));
}

export function getActiveAccount(state) {
  return getAccount(state, state.accounts.activeAccount);
}

export function getActiveVotingFor(state) {
  const activeAccount = getActiveAccount(state);
  if (
    !activeAccount ||
    (!activeAccount.hasProxy && !activeAccount.singleWallet) ||
    !(activeAccount.proxy.votingPower > 0)
  )
    return [];
  return activeAccount.votingFor;
}

export function activeCanVote(state) {
  const activeAccount = getActiveAccount(state);
  return (
    activeAccount &&
    (activeAccount.hasProxy || activeAccount.singleWallet) &&
    parseFloat(activeAccount.proxy.votingPower) > 0
  );
}

// Actions ------------------------------------------------

export const addAccounts = accounts => async dispatch => {
  dispatch({ type: FETCHING_ACCOUNT_DATA, payload: true });
  console.log('got accounts', accounts);
  for (let account of accounts) {
    const mkrToken = await loadContract(mainnetAddresses['GOV']); //window.maker.getToken(MKR);
    const iouToken = await loadContract(mainnetAddresses['IOU']); //window.maker.getToken('IOU');

    const { hasProxy, voteProxy } = await getVoteProxy(account.address);

    console.log(
      'found proxy',
      hasProxy,
      'address',
      voteProxy.getProxyAddress()
    );

    const proxyRole = hasProxy
      ? voteProxy.getColdAddress() === account.address
        ? 'cold'
        : 'hot'
      : '';

    let currProposal = Promise.resolve([]);

    let mkrLockedChiefHot = 0;
    let mkrLockedChiefCold = 0;

    if (hasProxy) {
      //const chiefService = window.maker.service('chief');

      currProposal = currProposal
        .then(() =>
          promiseRetry({
            fn: () => getVotedProposalAddresses(voteProxy.getProxyAddress())
          })
        )
        .then(addresses =>
          (addresses || []).map(address => address.toLowerCase())
        );

      if (
        voteProxy.getHotAddress() != null ||
        voteProxy.getHotAddress() != ZERO_ADDRESS
      )
        mkrLockedChiefHot = (
          await getNumDeposits(voteProxy.getHotAddress())
        ).toNumber();

      if (
        voteProxy.getColdAddress() != null &&
        voteProxy.getColdAddress() != ZERO_ADDRESS
      )
        mkrLockedChiefCold = (
          await getNumDeposits(voteProxy.getColdAddress())
        ).toNumber();
    }

    const chiefAddress = mainnetAddresses['CHIEF'];

    const linkedAccountData = async () => {
      const otherRole = proxyRole === 'hot' ? 'cold' : 'hot';
      const linkedAddress =
        otherRole === 'hot'
          ? voteProxy.getHotAddress()
          : voteProxy.getColdAddress();
      console.log(
        'linkedAddress',
        otherRole,
        linkedAddress,
        voteProxy.getHotAddress(),
        voteProxy.getColdAddress()
      );
      if (linkedAddress)
        return {
          proxyRole: otherRole,
          address: linkedAddress,
          mkrBalance: await mkrToken.balanceOf(linkedAddress).call()
        };
      else
        return {
          proxyRole: otherRole,
          address: '',
          mkrBalance: 0
        };
    };

    const _payload = {
      ...account,
      address: account.address,
      mkrInEsm: 0,
      //window.maker
      //.service('esm')
      //getTotalStakedByAddress(account.address),
      mkrBalance: promiseRetry({
        fn: async () => await mkrToken.balanceOf(account.address).call()
      }),
      hasProxy,
      proxyRole: proxyRole,
      votingFor: currProposal,
      hasInfMkrApproval:
        (await mkrToken.allowance(account.address, chiefAddress).call()) >
        MAX_UINT_ETH_BN,
      //mkrToken
      //.allowance(account.address, chiefAddress)
      //.then(val => val.eq(MAX_UINT_ETH_BN)),
      hasInfIouApproval:
        (await iouToken.allowance(account.address, chiefAddress).call()) >
        MAX_UINT_ETH_BN,
      //iouToken
      //.allowance(account.address, chiefAddress)
      //.then(val => val.eq(MAX_UINT_ETH_BN)),
      proxy: hasProxy
        ? promisedProperties({
            address: voteProxy.getProxyAddress(),
            votingPower: getNumDeposits(voteProxy.getProxyAddress()),
            hasInfMkrApproval:
              (await mkrToken
                .allowance(account.address, voteProxy.getProxyAddress())
                .call()) > MAX_UINT_ETH_BN,
            //mkrToken
            //.allowance(account.address, voteProxy.getProxyAddress())
            //.then(val => val.eq(MAX_UINT_ETH_BN)),
            linkedAccount: linkedAccountData()
          })
        : {
            address: '',
            votingPower: 0,
            hasInfIouApproval: false,
            hasInfMkrApproval: false,
            linkedAccount: {}
          },
      mkrLockedChiefHot,
      mkrLockedChiefCold
    };

    try {
      const payload = await promisedProperties(_payload);
      console.log('got account payload', payload);
      setActiveAccount(account.address);

      dispatch({ type: ADD_ACCOUNT, payload });
    } catch (e) {
      console.error('failed to add account', e);
    }
  }

  dispatch({ type: FETCHING_ACCOUNT_DATA, payload: false });
};

export const addSingleWalletAccount = account => async dispatch => {
  dispatch({ type: FETCHING_ACCOUNT_DATA, payload: true });

  const chiefAddress = mainnetAddresses['CHIEF'];
  //window.maker
  //.service('smartContract')
  //.getContractAddressByName(CHIEF);
  const mkrToken = await loadContract(mainnetAddresses['GOV']); //window.maker.getToken(MKR);
  const iouToken = await loadContract(mainnetAddresses['IOU']); //window.maker.getToken('IOU');
  let currProposal = [];
  //const chiefService = window.maker.service('chief');

  const votingPower = (await getNumDeposits(account.address)).toNumber();

  const hasInfMkrApproval =
    (await mkrToken.allowance(account.address, chiefAddress).call()) >
    MAX_UINT_ETH_BN;

  const hasInfIouApproval =
    (await iouToken.allowance(account.address, chiefAddress).call()) >
    MAX_UINT_ETH_BN;

  const { hasProxy, voteProxy } = await getVoteProxy(account.address);

  let proxy = {
    address: '',
    votingPower: 0,
    hasInfIouApproval: false,
    hasInfMkrApproval: false,
    linkedAccount: {}
  };

  let singleWallet = true;

  if (hasProxy) {
    currProposal = await (async () => {
      const _slate = await getVotedSlate(account.defaultProxy);
      console.log('get voted slate', _slate);
      const slateAddresses = await getSlateAddresses(_slate);
      return (slateAddresses || []).map(address => address.toLowerCase());
    })();

    console.log('loaded current Proposal ', currProposal);

    //console.log('dumping two var ----------->', hasProxy, voteProxy);
    const votingPowerProxy = await mkrToken
      .allowance(account.address, voteProxy._hotAddress)
      .call();
    proxy = {
      address: voteProxy._hotAddress,
      votingPower: await getNumDeposits(voteProxy._hotAddress),
      hasInfMkrApproval: votingPowerProxy, //> MAX_UINT_ETH_BN,
      hasInfIouApproval: hasInfIouApproval,
      //mkrToken
      //.allowance(account.address, voteProxy.getProxyAddress())
      //.then(val => val.eq(MAX_UINT_ETH_BN)),
      linkedAccount: '' // linkedAccountData()
    };
    //singleWallet = true;
  }
  /*{
            address: '',
            votingPower: 0,
            hasInfIouApproval: false,
            hasInfMkrApproval: false,
            linkedAccount: {}
          }*/

  const _payload = {
    ...account,
    address: account.address,
    mkrBalance: promiseRetry({
      fn: async () => await mkrToken.balanceOf(account.address).call()
    }),
    hasProxy: hasProxy,
    singleWallet: singleWallet,
    proxyRole: '',
    votingFor: currProposal,
    hasInfMkrApproval,
    hasInfIouApproval,
    proxy: proxy,
    defaultProxy: account.defaultProxy
  };

  try {
    const payload = await promisedProperties(_payload);
    console.log('got payload', payload);
    setActiveAccount(account.address);
    dispatch({ type: ADD_ACCOUNT, payload });
  } catch (e) {
    console.error('failed to add account', e);
  }

  dispatch({ type: FETCHING_ACCOUNT_DATA, payload: false });
};

export const addAccount = account => async dispatch => {
  const { hasProxy } = getVoteProxy(account.address);

  const numDeposits = await getNumDeposits(account.address);

  // if we don't have a vote proxy, but we have locked MKR, we must be voting with a single wallet
  //if (!hasProxy && numDeposits.toNumber() > 0) {
  return await dispatch(addSingleWalletAccount(account));
  //} else {
  //return await dispatch(addAccounts([account]));
  //}
};

export const removeAccounts = accounts => ({
  type: REMOVE_ACCOUNTS,
  payload: accounts
});

export const updateAccount = account => ({
  type: UPDATE_ACCOUNT,
  payload: account
});

export const addMetamaskAccount = (address, proxy) => async (
  dispatch,
  getState
) => {
  // Only add new accounts that we haven't seen before
  if (getAccount(getState(), address)) return;

  try {
    //await window.maker
    //  .service('accounts')
    //  .addAccount({ type: AccountTypes.METAMASK });
    return dispatch(
      addAccount({ address, type: AccountTypes.METAMASK, defaultProxy: proxy })
    );
  } catch (error) {
    dispatch({ type: NO_METAMASK_ACCOUNTS });
  }
};

export const setActiveAccount = address => async (dispatch, getState) => {
  const state = getState();
  //console.log("setActiveAccount dumping state", JSON.stringify(state), "account", getAccount(state, address));

  try {
    //window.maker.useAccountWithAddress(address);
    return dispatch({
      type: SET_ACTIVE_ACCOUNT,
      payload: {
        newAccount: getAccount(state, address),
        // unfortunately the only way I can think of (short of redoing the whole proxy store data design)
        // to make sure the proxy store retains transaction information when you're only toggling between
        // hot and cold accounts. This is so they can resume onboarding without any issues.
        onboardingHotAddress:
          state.onboarding.hotWallet && state.onboarding.hotWallet.address,
        onboardingColdAddress:
          state.onboarding.coldWallet && state.onboarding.coldWallet.address
      }
    });
  } catch (err) {
    // Do nothing.
  }
};

export const connectHardwareAccounts = (
  accountType,
  options = {}
) => dispatch => {
  dispatch({
    type: HARDWARE_ACCOUNTS_CONNECTING
  });

  let path;
  if (accountType === AccountTypes.LEDGER && options.live) {
    path = LEDGER_LIVE_PATH;
  } else if (accountType === AccountTypes.LEDGER && !options.live) {
    path = LEDGER_LEGACY_PATH;
  }

  return new Promise((resolve, reject) => {
    const onChoose = async (addresses, callback) => {
      const accountsWithType = await Promise.all(
        addresses.map(address =>
          addMkrAndEthBalance({
            address,
            type: accountType
          })
        )
      );

      dispatch({
        type: HARDWARE_ACCOUNTS_CONNECTED,
        payload: {
          onAccountChosen: callback
        }
      });

      resolve(accountsWithType);
    };

    window.maker
      .addAccount({
        type: accountType,
        path: path,
        accountsOffset: options.offset || 0,
        accountsLength: options.accountsPerPage || DEFAULT_ACCOUNTS_PER_PAGE,
        choose: onChoose
      })
      .catch(err => {
        dispatch({
          type: HARDWARE_ACCOUNTS_ERROR
        });
        reject(err);
      });
  });
};

export const addHardwareAccount = (address, accountType) => async (
  dispatch,
  getState
) => {
  try {
    const {
      accounts: { onHardwareAccountChosen }
    } = getState();

    await onHardwareAccountChosen(null, address);

    // add hardware account to maker object
    await dispatch(
      addAccount({
        address,
        type: accountType
      })
    );

    return dispatch({
      type: HARDWARE_ACCOUNT_CONNECTED
    });
  } catch (err) {
    return dispatch({
      type: HARDWARE_ACCOUNT_ERROR
    });
  }
};

// Reducer ------------------------------------------------

// Reducer helpers
const uniqByAddress = uniqWith((a, b) => a.address === b.address);
const uniqConcat = pipe(concat, uniqByAddress);
const addressCmp = (x, y) => x.address === y.address;
const withUpdatedAccount = (accounts, updatedAccount) => {
  return accounts.map(account =>
    account.address === updatedAccount.address &&
    account.type === updatedAccount.type
      ? {
          ...account,
          ...updatedAccount
        }
      : account
  );
};

const initialState = {
  activeAccount: '',
  activeAccountType: '',
  fetching: true,
  allAccounts: [],
  onHardwareAccountChosen: () => {}
};

const updateProxyBalance = adding => (state, { payload: amount }) => {
  let account = getActiveAccount({ accounts: state });
  if (!adding) {
    if (typeof amount === 'number') amount = -1 * amount;
    if (typeof amount === 'string') amount = '-' + amount;
  }

  account = {
    ...account,
    mkrBalance: subtract(account.mkrBalance, amount),
    proxy: {
      ...account.proxy,
      linkedAccount: {
        ...account.proxy.linkedAccount,
        mkrBalance:
          account.proxyRole === 'hot'
            ? subtract(account.proxy.linkedAccount.mkrBalance, amount)
            : account.proxy.linkedAccount.mkrBalance
      },
      votingPower: add(account.proxy.votingPower, amount)
    }
  };

  let allAccounts = withUpdatedAccount(state.allAccounts, account);

  let linkedAccount = getAccount(
    { accounts: state },
    account.proxy.linkedAccount.address
  );
  if (linkedAccount) {
    linkedAccount = {
      ...linkedAccount,
      proxy: {
        ...linkedAccount.proxy,
        linkedAccount: {
          ...linkedAccount.proxy.linkedAccount, // TODO: maybe just refresh  account data via fetches, this is slightly confusing
          mkrBalance:
            linkedAccount.proxyRole === 'cold'
              ? subtract(account.mkrBalance, amount)
              : account.mkrBalance
        },
        votingPower: add(linkedAccount.proxy.votingPower, amount)
      }
    };
    allAccounts = withUpdatedAccount(allAccounts, linkedAccount);
  }

  return { ...state, allAccounts };
};

const accounts = createReducer(initialState, {
  [REMOVE_ACCOUNTS]: (state, { payload: accounts }) => ({
    ...state,
    allAccounts: differenceWith(addressCmp, state.allAccounts, accounts)
  }),
  [UPDATE_ACCOUNT]: (state, { payload: updatedAccount }) => ({
    ...state,
    allAccounts: withUpdatedAccount(state.allAccounts, updatedAccount)
  }),
  [ADD_ACCOUNT]: (state, { payload: account }) => {
    if (!Object.values(AccountTypes).includes(account.type)) {
      throw new Error(`Unrecognized account type: "${account.type}"`);
    }
    console.log('adding account to state', [account], state.allAccounts);
    return {
      ...state,
      allAccounts: uniqConcat([account], state.allAccounts)
    };
  },
  [SET_ACTIVE_ACCOUNT]: (state, { payload: { newAccount } }) => ({
    ...state,
    allAccounts: state.allAccounts,
    activeAccount: newAccount.address,
    activeAccountType: newAccount.type
  }),
  [SET_UNLOCKED_MKR]: (state, { payload }) => ({
    ...state,
    activeAccountUnlockedMkr: payload.mkr
  }),
  [FETCHING_ACCOUNT_DATA]: (state, { payload }) => ({
    ...state,
    fetching: payload
  }),
  [NO_METAMASK_ACCOUNTS]: state => ({
    ...state,
    fetching: false
  }),
  [MKR_APPROVE_SUCCESS]: (state, { payload }) => {
    const account = getAccount(
      { accounts: state },
      window.tronWeb.defaultAddress.hex
    );

    const updatedAccount =
      payload === 'single-wallet'
        ? {
            ...account,
            hasInfMkrApproval: true
          }
        : {
            ...account,
            proxy: { ...account.proxy, hasInfMkrApproval: true }
          };

    return {
      ...state,
      allAccounts: withUpdatedAccount(state.allAccounts, updatedAccount)
    };
  },
  [IOU_APPROVE_SUCCESS]: state => {
    const account = getAccount(
      { accounts: state },
      window.tronWeb.defaultAddress.hex
    );
    const updatedAccount = {
      ...account,
      hasInfIouApproval: true
    };
    return {
      ...state,
      allAccounts: withUpdatedAccount(state.allAccounts, updatedAccount)
    };
  },
  [SEND_MKR_TO_PROXY_SUCCESS]: updateProxyBalance(true),
  [WITHDRAW_MKR_SUCCESS]: updateProxyBalance(false),
  [WITHDRAW_ALL_MKR_SUCCESS]: updateProxyBalance(false),
  [HARDWARE_ACCOUNTS_CONNECTING]: (state, { payload }) => {
    return {
      ...state,
      onHardwareAccountChosen: () => {}
    };
  },
  [HARDWARE_ACCOUNTS_CONNECTED]: (state, { payload }) => {
    return {
      ...state,
      onHardwareAccountChosen: payload.onAccountChosen
    };
  },
  [HARDWARE_ACCOUNTS_ERROR]: state => {
    return state;
  },
  [HARDWARE_ACCOUNT_CONNECTED]: (state, { payload }) => {
    return {
      ...state,
      onHardwareAccountChosen: () => {}
    };
  },
  [HARDWARE_ACCOUNT_ERROR]: state => {
    return state;
  }
});

export default accounts;
