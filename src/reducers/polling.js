import matter from 'gray-matter';
import uniqBy from 'lodash.uniqby';
import { createReducer } from '../utils/redux';
import { formatRound, check } from '../utils/misc';
import { addToastWithTimeout, ToastTypes } from './toasts';
import { TransactionStatus } from '../utils/constants';
import { generateIPFSHash } from '../utils/ipfs';
import {
  GetAllWhitelistedPolls,
  getBlockNumber,
  test
} from '../services/GovQueryApi';
import {
  getMkrAmtVoted,
  getPercentageMkrVoted,
  vote
} from '../services/GovPolling';

// Constants ----------------------------------------------

export const POLLS_REQUEST = 'polls/REQUEST';
export const POLLS_SUCCESS = 'polls/SUCCESS';
export const POLLS_FAILURE = 'polls/FAILURE';

export const LEGACY_POLLS_SUCCESS = 'polls/LEGACY_POLLS_SUCCESS';

export const POLL_VOTE_REQUEST = 'poll/VOTE_REQUEST';
export const POLL_VOTE_SENT = 'poll/VOTE_SENT';
export const POLL_VOTE_SUCCESS = 'poll/VOTE_SUCCESS';
export const POLL_VOTE_FAILURE = 'poll/VOTE_FAILURE';

export const POLLS_SET_OPTION_VOTING_FOR = 'polls/SET_OPTION_VOTING_FOR';
export const ADD_POLL = 'poll/ADD_POLL';
export const UPDATE_POLL = 'polls/UPDATE_POLL';

const mainnetAddresses = require('../chain/addresses/mainnet.json');

// Actions ----------------------------------------------

const handleTx = ({ prefix, dispatch, txObject }) =>
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
          dispatch({ type: `poll/${prefix}_SUCCESS` });
          resolve(true);
          //this.logTransactionConfirmed(r);
        } else {
          //this.logTransactionFailed(tx);
          resolve(false);
        }
      } else {
        //setTimeout(handleTx.bind(null, txObject), 3000);
        setTimeout(handleTx, 3000, {
          txObject: txObject,
          prefix: prefix,
          dispatch
        });
      }
      //resolve(false);
    });
  });

export const legacyPollsSuccess = polls => ({
  type: LEGACY_POLLS_SUCCESS,
  payload: polls
});
export const pollsRequest = () => ({
  type: POLLS_REQUEST
});
export const pollsSuccess = () => ({
  type: POLLS_SUCCESS
});
export const pollsFailure = () => ({
  type: POLLS_FAILURE
});

export const addPoll = poll => ({
  type: ADD_POLL,
  payload: poll
});

export const updatePoll = (pollId, pollDataUpdates) => ({
  type: UPDATE_POLL,
  payload: { pollId, pollDataUpdates }
});

export const setOptionVotingFor = (pollId, optionId) => ({
  type: POLLS_SET_OPTION_VOTING_FOR,
  payload: { pollId, optionId }
});

// Writes ---

export const voteForPoll = (pollId, optionId) => async dispatch => {
  dispatch({ type: POLL_VOTE_REQUEST });

  // increment the optionId to give the plugin the correct ID
  const optionIdToVoteFor = parseInt(optionId) + 1;
  const pollVote = await vote(pollId, optionIdToVoteFor);
  const success = await handleTx({
    txObject: pollVote,
    prefix: 'VOTE',
    dispatch
  });
  //console.log("success", success)
  //if (success) {
  dispatch(setOptionVotingFor(pollId, optionId));
  dispatch(updateVoteBreakdown(pollId));
  //}
  // dispatch(setOptionVotingFor(pollId, optionId));
  // dispatch(updateVoteBreakdown(pollId));
};

export const withdrawVoteForPoll = pollId => async dispatch => {
  dispatch({ type: POLL_VOTE_REQUEST });

  const pollVote = await vote(pollId, 0);
  const success = await handleTx({
    txObject: pollVote,
    prefix: 'VOTE',
    dispatch
  });

  //if (success) {
  dispatch(setOptionVotingFor(pollId, null));
  dispatch(updateVoteBreakdown(pollId));
  //}
};

// Reads ---

/*const _getAllWhiteListedPolls = async () => {
  const pollsList =  await GetAllWhitelistedPolls();

  const uniqPolls = uniqBy(pollsList, p => p.multiHash);
  // Don't process polls where startDate is in the future
  const polls = uniqPolls.filter(poll => poll.startDate <= new Date());

  console.log("SHOWING POLLS ========>", pollsList.length, pollsList[0])

  return Promise.all(pollsList);
};*/

export const getOptionVotingFor = (address, pollId) => async dispatch => {
  let optionId = await test(address, pollId);

  // Option "0" from the plugin is "abstain", but the FE doesn't use "abstain".
  if (optionId === 0) optionId = null;
  else optionId = parseInt(optionId) - 1;
  dispatch(setOptionVotingFor(pollId, optionId));
};

const fetchPollFromUrl = async url => {
  const res = await fetch(url);
  await check(res);
  const contentType = res.headers.get('content-type');
  if (!contentType) return null;
  if (contentType.indexOf('application/json') !== -1) {
    const json = await res.json();
    if (!json.about || typeof json.about !== 'string') return null;
    return json;
  } else if (contentType.indexOf('text/plain') !== -1) {
    return res.text();
  } else return null;
};

const formatOptions = options => {
  const optionVals = Object.values(options);
  // Remove option 0: abstain
  optionVals.shift();
  return optionVals;
};

const formatYamlToJson = async data => {
  const json = data.about ? matter(data.about) : matter(data);
  if (!json.data.title || !json.data.options)
    throw new Error(
      'Invalid poll document: no options or title field found in front matter'
    );
  const { content } = json;
  const { title, summary, options, discussion_link } = json.data;
  return {
    voteId: data.voteId
      ? data.voteId
      : await generateIPFSHash(data.replace(/(\r\n|\n|\r)/gm, '\n'), {
          encoding: 'ascii'
        }),
    title,
    summary,
    options: formatOptions(options),
    discussion_link,
    content,
    rawData: data.about || data
  };
};

const isPollActive = (startDate, endDate) => {
  return true;
  const now = new Date();
  return startDate <= now && endDate > now ? true : false;
};

export const updateVoteBreakdown = pollId => (dispatch, getState) => {
  const poll = getState().polling.polls.find(poll => poll.pollId === pollId);
  if (!poll) return;
  const { options, endDate } = poll;

  async function checkForVoteBreakdownUpdates(triesRemaining) {
    if (triesRemaining === 0) return;
    const voteBreakdown = await getVoteBreakdown(pollId, options, endDate);
    const totalVotes = await getTotalVotes(pollId);
    const participation = await getParticipation(pollId);
    const numUniqueVoters = await getNumUniqueVoters(pollId);
    dispatch(
      updatePoll(pollId, {
        voteBreakdown,
        totalVotes,
        participation,
        numUniqueVoters
      })
    );
    setTimeout(() => checkForVoteBreakdownUpdates(triesRemaining - 1), 1000);
  }

  const NUM_TRIES = 6;
  checkForVoteBreakdownUpdates(NUM_TRIES);
};

export const getVoteBreakdown = async (pollId, options, endDate) => {
  // returns either the block on which this poll ended,
  // or, if the poll hasn't ended, the current block
  const pollEndBlock = await getBlockNumber(
    Math.floor(new Date(endDate).getTime())
  );

  const mkrSupport = 0; //await window.maker
  //.service('govQueryApi')
  //.getMkrSupport(pollId, pollEndBlock);

  /*const voteBreakdown = options.reduce((result, val, index) => {
    // correct for option 0: abstain here:
    const matchingOption = mkrSupport.find(
      x => parseInt(x.optionId) - 1 === index
    );
    const value = matchingOption
      ? `${formatRound(matchingOption.mkrSupport, 2)} MKR (${formatRound(
          matchingOption.percentage
        )}%)`
      : '0 MKR (0.00%)';

    const mkrSupportData = matchingOption
      ? {
          mkrSupport: matchingOption.mkrSupport,
          percentage: formatRound(matchingOption.percentage)
        }
      : { mkrSupport: '0', percentage: '0' };
    const breakdown = {
      name: val,
      optionId: index,
      value,
      ...mkrSupportData
    };
    result.push(breakdown);
    return result;
  }, []);

  voteBreakdown.sort((a, b) => a.optionId - b.optionId);*/

  return 0; //voteBreakdown;
};

export const getTotalVotes = async pollId => {
  const totalVotes = await getMkrAmtVoted(pollId);
  console.log('getTotalVotes', totalVotes);
  return totalVotes; //.toNumber();
};

export const getParticipation = async pollId => {
  const participation = await getPercentageMkrVoted(pollId);
  return participation;
};

export const getNumUniqueVoters = async pollId => {
  //const numUniqueVoters = await window.maker
  //  .service('govPolling')
  //  .getNumUniqueVoters(pollId);
  return 0;
};

export const getWinningProposal = async pollId => {
  //const winningProposal = window.maker
  //  .service('govPolling')
  //  .getWinningProposal(pollId);
  return null;
};

export const pollsInit = () => async dispatch => {
  dispatch(pollsRequest());

  try {
    const polls = GetAllWhitelistedPolls().then(res => {
      let pollsRemaining = res.activePolls.nodes.length;
      //let o = new Object(res);
      //console.log("casted to ", JSON.stringify(res))

      //for (var i=0;i<pollsRemaining;i++){
      //  let x = polls.activePolls.nodes[i]
      //  pollsArr.push(x);
      //}

      //res.activePolls.nodes.forEach(element => console.log("element", element));

      //for (const poll of pollsArr) {
      res.activePolls.nodes.forEach(poll => {
        console.log('checking poll', poll.pollId);

        function onPollFetchAttempt() {
          pollsRemaining--;
          console.log('pollsRemaining', pollsRemaining);
          if (pollsRemaining === 0) dispatch(pollsSuccess());
        }
        //fetchPollFromUrl("http://test.dummy/url") //poll.url
        //  .then(async pollDocument => {
        //if (pollDocument === null)
        //  throw new Error(
        //    `Error fetching data for poll with ID ${poll.pollId}`
        //  );

        try {
          const documentData = {
            voteId: 'testVoteIdHashed',
            title: 'test',
            summary: 'Test summary Lorem ipsum dixit',
            options: [1, 2],
            discussion_link: 'http://reddit.com/r/oikos/testlink',
            content:
              'Test content fill me with Lorem ipsum dixit Lorem ipsum dixit'
          }; //await formatYamlToJson(pollDocument);
          const pollData = { ...poll, ...documentData };
          pollData.active = isPollActive(
            pollData.startBlock,
            pollData.endBlock
          );
          pollData.startDate = pollData.startBlock;
          pollData.endDate = pollData.endBlock;

          pollData.source = mainnetAddresses['POLLING'];
          dispatch(addPoll(pollData));
        } catch (e) {
          throw e;
        }
        //})
        //.catch(e => console.error(e))
        //.finally(onPollFetchAttempt);
        onPollFetchAttempt();
      });
    });
  } catch (error) {
    console.error(error);
    dispatch(pollsFailure());
  }
};

export const pollDataInit = poll => dispatch => {
  if (!poll) return;
  console.log('pollDataInit', poll);

  const { pollId, options, endDate, active } = poll;
  getTotalVotes(pollId).then(totalVotes =>
    dispatch(updatePoll(pollId, { totalVotes }))
  );
  getParticipation(pollId).then(participation =>
    dispatch(updatePoll(pollId, { participation }))
  );
  getNumUniqueVoters(pollId).then(numUniqueVoters =>
    dispatch(updatePoll(pollId, { numUniqueVoters }))
  );
  getWinningProposal(pollId).then(proposalId => {
    const winningProposal = proposalId === 0 ? null : parseInt(proposalId) - 1;
    if (!active && winningProposal !== null)
      dispatch(updatePoll(pollId, { winningProposal }));
  });

  dispatch(updatePoll(pollId, { voteBreakdownFetching: true }));
  getVoteBreakdown(pollId, options, endDate).then(voteBreakdown =>
    dispatch(
      updatePoll(pollId, { voteBreakdown, voteBreakdownFetching: false })
    )
  );
};

export const formatHistoricalPolls = topics => async dispatch => {
  console.log('formatHistoricalPolls', topics);
  const govTopics = topics.filter(t => t.govVote === true);
  const allPolls = govTopics.reduce(
    (result, { end_timestamp, date, topic_blurb, topic, key, proposals }) => {
      const options = proposals.map(p => p.title);
      const totalVotes = proposals.reduce(
        (acc, proposal) => acc + proposal.end_approvals,
        0
      );

      const poll = {
        legacyPoll: true,
        active: false,
        content: proposals[0] ? proposals[0].about : topic_blurb,
        endDate: new Date(end_timestamp),
        options: options,
        source:
          proposals[0] && proposals[0].source
            ? proposals[0].source
            : mainnetAddresses['POLLING'],
        startDate: new Date(date),
        summary: topic_blurb,
        title: topic,
        totalVotes: formatRound(totalVotes, 2),
        pollId: key,
        voteId: key,
        topicKey: key
      };

      result.push(poll);
      return result;
    },
    []
  );
  dispatch(legacyPollsSuccess(allPolls));
};

// Reducer ------------------------------------------------

const initialState = {
  polls: [],
  voteTxHash: '',
  voteTxStatus: TransactionStatus.NOT_STARTED
};

export default createReducer(initialState, {
  [LEGACY_POLLS_SUCCESS]: (state, { payload }) => ({
    ...state,
    polls: [...state.polls, ...payload]
  }),
  [POLLS_REQUEST]: state => ({
    ...state,
    pollsFetching: true
  }),
  [POLLS_SUCCESS]: state => ({
    ...state,
    pollsFetching: false
  }),
  [POLLS_FAILURE]: state => ({
    ...state,
    pollsFetching: false
  }),
  [POLL_VOTE_REQUEST]: state => ({
    ...state,
    voteTxHash: '',
    voteTxStatus: TransactionStatus.NOT_STARTED
  }),
  [ADD_POLL]: (state, { payload }) => ({
    ...state,
    polls: [...state.polls, payload]
  }),
  [UPDATE_POLL]: (state, { payload }) => ({
    ...state,
    polls: state.polls.map(poll =>
      poll.pollId === payload.pollId
        ? { ...poll, ...payload.pollDataUpdates }
        : poll
    )
  }),
  [POLL_VOTE_SENT]: (state, { payload }) => ({
    ...state,
    voteTxHash: payload.txHash,
    voteTxStatus: TransactionStatus.PENDING
  }),
  [POLL_VOTE_SUCCESS]: state => ({
    ...state,
    voteTxStatus: TransactionStatus.MINED
  }),
  [POLL_VOTE_FAILURE]: state => ({
    ...state,
    voteTxStatus: TransactionStatus.ERROR
  }),
  [POLLS_SET_OPTION_VOTING_FOR]: (state, { payload }) => {
    return {
      ...state,
      polls: state.polls.map(poll => {
        if (poll.pollId === payload.pollId) {
          return {
            ...poll,
            optionVotingFor: payload.optionId
          };
        }
        return poll;
      })
    };
  }
});
