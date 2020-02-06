import ReactGA from 'react-ga';

import { createReducer } from '../utils/redux';
import { parseError } from '../utils/misc';
import { sortBytesArray } from '../utils/ethereum';
import { getAccount, UPDATE_ACCOUNT } from './accounts';
import { addToastWithTimeout, ToastTypes } from './toasts';
import { voteTallyInit } from './tally';
import { initApprovalsFetch } from './approvals';
import { hatInit } from './hat';
import { TransactionStatus } from '../utils/constants';
import { Vote } from '../services/Chief';

// Constants ----------------------------------------------

export const VOTE_REQUEST = 'vote/VOTE_REQUEST';
export const VOTE_SENT = 'vote/VOTE_SENT';
export const VOTE_SUCCESS = 'vote/VOTE_SUCCESS';
export const VOTE_FAILURE = 'vote/VOTE_FAILURE';

export const WITHDRAW_REQUEST = 'vote/WITHDRAW_REQUEST';
export const WITHDRAW_SENT = 'vote/WITHDRAW_SENT';
export const WITHDRAW_SUCCESS = 'vote/WITHDRAW_SUCCESS';
export const WITHDRAW_FAILURE = 'vote/WITHDRAW_FAILURE';

const CLEAR = 'vote/CLEAR';

// Actions ------------------------------------------------

export const clear = () => ({
  type: CLEAR
});

const handleTx = ({
  prefix,
  dispatch,
  getState,
  txObject,
  acctType,
  activeAccount,
  proposalAddresses = []
}) =>
  new Promise(resolve => {
    //const txMgr = window.maker.service('transactionManager');
    /*txMgr.listen(txObject, {
      pending: tx => {
        dispatch({
          type: `poll/${prefix}_SENT`,
          payload: { txHash: tx.hash }
        });
      },
      mined: _ => {
        dispatch({ type: `poll/${prefix}_SUCCESS` });
        resolve(true);
      },
      error: (_, err) => {
        dispatch({ type: `poll/${prefix}_FAILURE`, payload: err });
        dispatch(addToastWithTimeout(ToastTypes.ERROR, err));
        resolve(false);
      }
    });*/

    console.log('checking txObject', txObject);

    let ret = window.tronWeb.trx.getTransaction(txObject).then(r => {
      console.log('got ret', r['ret'], r);
      if (r.ret != null || r['ret'] != null) {
        if (r.ret[0].contractRet == 'SUCCESS') {
          console.log('SUCCESS!!!', r);
          dispatch({ type: `vote/${prefix}_SUCCESS` });

          // give infura time to catch up
          setTimeout(
            () => {
              dispatch(voteTallyInit());
              dispatch(hatInit());
              dispatch(initApprovalsFetch());
            },
            acctType === 'ledger' || acctType === 'trezor' ? 5000 : 2000
          ); // there is no science here

          updateVotingFor(
            dispatch,
            getState,
            activeAccount,
            proposalAddresses.map(address => address.toLowerCase())
          );
          resolve();
          //this.logTransactionConfirmed(r);
        } else {
          dispatch({ type: `vote/${prefix}_FAILURE`, payload: 'err' });
          dispatch(addToastWithTimeout(ToastTypes.ERROR, 'err'));

          resolve();
        }
      } else {
        //setTimeout(handleTx.bind(null, txObject), 3000);
        setTimeout(handleTx, 3000, {
          prefix,
          dispatch,
          getState,
          txObject,
          acctType,
          activeAccount,
          proposalAddresses
        });
      }
      //resolve(false);
    });
  });

const updateVotingFor = (
  dispatch,
  getState,
  activeAccount,
  proposalAddresses
) => {
  // update accounts in our store w/ newly voted proposal
  const updatedActiveAcc = {
    ...activeAccount,
    votingFor: proposalAddresses
  };
  dispatch({ type: UPDATE_ACCOUNT, payload: updatedActiveAcc });
  console.log('got state', getState);
  const linkedAccount = getAccount(
    getState,
    activeAccount.proxy.linkedAccount.address
  );
  if (!linkedAccount) return;
  const updatedLinkedAcc = {
    ...linkedAccount,
    votingFor: proposalAddresses
  };
  dispatch({ type: UPDATE_ACCOUNT, payload: updatedLinkedAcc });
};

export const sendVote = proposalAddress => async (dispatch, getState) => {
  console.log('sendVote', proposalAddress);
  const activeAccount = getAccount(
    getState(),
    window.tronWeb.defaultAddress.hex
  );
  if (
    !activeAccount ||
    (!activeAccount.hasProxy && !activeAccount.singleWallet)
  )
    throw new Error('must have account active');

  dispatch({ type: VOTE_REQUEST, payload: { address: proposalAddress } });

  const { hat, proposals } = getState();

  const governancePollAddresses = proposals
    .filter(({ govVote }) => govVote)
    .map(({ source }) => source);

  const hatAddress = hat.address;
  const currentlyVotingForHat = activeAccount.votingFor.includes(
    hatAddress.toLowerCase()
  );
  const castingVoteInGovernancePoll = governancePollAddresses
    .map(address => address.toLowerCase())
    .includes(proposalAddress.toLowerCase());
  const castingVoteForHat =
    hatAddress.toLowerCase() === proposalAddress.toLowerCase();

  const slate = [];
  if (
    currentlyVotingForHat &&
    castingVoteInGovernancePoll &&
    !castingVoteForHat
  )
    slate.push(hatAddress);

  slate.push(proposalAddress);

  let voteExec;
  //if (activeAccount.singleWallet) {
  console.log(
    'voteExec',
    sortBytesArray(slate),
    slate,
    'proxy address',
    activeAccount.proxy.address,
    activeAccount
  );

  voteExec = await Vote(activeAccount.proxy.address, sortBytesArray(slate));
  //} else {
  //voteExec = window.maker
  //  .service('voteProxy')
  //  .voteExec(activeAccount.proxy.address, sortBytesArray(slate));
  //}

  const { accounts } = getState();
  console.log('got Tx object', voteExec, 'getState accounts', accounts);

  return handleTx({
    prefix: 'VOTE',
    dispatch,
    getState: getState(),
    txObject: voteExec,
    acctType: activeAccount.type,
    activeAccount,
    proposalAddresses: slate
  });
};

export const withdrawVote = proposalAddress => async (dispatch, getState) => {
  const activeAccount = getAccount(
    getState(),
    window.tronWeb.defaultAddress.hex
  );
  if (
    !activeAccount ||
    (!activeAccount.hasProxy && !activeAccount.singleWallet)
  )
    throw new Error('must have account active');

  dispatch({ type: WITHDRAW_REQUEST });

  const filteredSlate = activeAccount.votingFor.filter(
    address => address.toLowerCase() !== proposalAddress.toLowerCase()
  );

  let voteExec;
  //if (activeAccount.singleWallet) {
  voteExec = await Vote(
    activeAccount.proxy.address,
    sortBytesArray(filteredSlate)
  );
  //} else {
  //  voteExec = window.maker
  //    .service('voteProxy')
  //    .voteExec(activeAccount.proxy.address, sortBytesArray(filteredSlate));
  //}

  return handleTx({
    prefix: 'WITHDRAW',
    dispatch,
    getState: getState(),
    txObject: voteExec,
    acctType: activeAccount.type,
    activeAccount,
    proposalAddresses: filteredSlate
  });
};

// Reducer ------------------------------------------------

const initialState = {
  proposalAddress: '',
  txStatus: '',
  confirming: false,
  voteProgress: 'confirm',
  txHash: ''
};

const vote = createReducer(initialState, {
  [VOTE_REQUEST]: (state, { payload }) => ({
    ...state,
    proposalAddress: payload.address,
    txStatus: TransactionStatus.NOT_STARTED,
    txHash: ''
  }),
  [VOTE_SENT]: (state, { payload }) => ({
    ...state,
    txStatus: TransactionStatus.PENDING,
    txHash: payload.txHash
  }),
  [VOTE_SUCCESS]: state => ({
    ...state,
    proposalAddress: '',
    txStatus: TransactionStatus.MINED
  }),
  [VOTE_FAILURE]: state => ({
    ...state,
    proposalAddress: '',
    txStatus: TransactionStatus.ERROR
  }),
  [WITHDRAW_REQUEST]: state => ({
    ...state,
    txHash: '',
    txStatus: TransactionStatus.NOT_STARTED
  }),
  [WITHDRAW_SENT]: (state, { payload }) => ({
    ...state,
    txStatus: TransactionStatus.PENDING,
    txHash: payload.txHash
  }),
  [WITHDRAW_SUCCESS]: state => ({
    ...state,
    txStatus: TransactionStatus.MINED
  }),
  [WITHDRAW_FAILURE]: state => ({
    ...state,
    txStatus: TransactionStatus.ERROR
  }),
  [CLEAR]: () => ({
    ...initialState
  })
});

export default vote;
