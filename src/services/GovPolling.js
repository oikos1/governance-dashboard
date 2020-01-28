import { POLLING } from '../utils/constants';
import { MKR } from '../utils/constants';
import { GetAllWhitelistedPolls } from './GovQueryApi';
import { loadContract } from '../utils/ethereum';

const POSTGRES_MAX_INT = 2147483647;
const mainnetAddresses = require('../chain/addresses/mainnet.json');

const createPoll = async (startDate, endDate, multiHash, url) => {
  const txo = await this._pollingContract().createPoll(
    startDate,
    endDate,
    multiHash,
    url
  );
  const pollId = parseInt(txo.receipt.logs[0].topics[2]);
  return pollId;
};

const withdrawPoll = pollId => {
  return this._pollingContract().withdrawPoll(pollId);
};

const vote = (pollId, optionId) => {
  return this._pollingContract().vote(pollId, optionId);
};

const _pollingContract = () => {
  return this.get('smartContract').getContractByName(POLLING);
};

//--- cache queries

const getPoll = async multiHash => {
  const polls = await this.getAllWhitelistedPolls();
  const filtered = polls.filter(p => p.multiHash === multiHash);
  let lowest = Infinity;
  let lowestPoll;
  for (let i = 0; i < filtered.length; i++) {
    if (filtered[i].pollId < lowest) {
      lowest = filtered[i].pollId;
      lowestPoll = filtered[i];
    }
  }
  return lowestPoll;
};

const _getPoll = async pollId => {
  const polls = await getAllWhitelistedPolls();
  console.log('_getPoll', polls.activePolls.nodes);
  return polls.activePolls.nodes.find(
    p => parseInt(p.pollId) === parseInt(pollId)
  );
};

export const getAllWhitelistedPolls = async () => {
  //if (polls) return polls;
  let polls = await GetAllWhitelistedPolls();
  console.log('getAllWhitelistedPolls', polls);
  return polls;
};

export const getMkrAmtVoted = async pollId => {
  const { endBlock } = await _getPoll(pollId);
  let d = new Date(endBlock);
  const endUnix = Math.floor(d.getTime() / 1000);

  console.log('got endDate', endBlock, 'endUnix', endUnix);

  //const endBlock = await this.get('govQueryApi').getBlockNumber(endUnix);
  //const weights = await this.get('govQueryApi').getMkrSupport(
  //  pollId,
  //  endBlock
  //);
  //return MKR(weights.reduce((acc, cur) => acc + cur.mkrSupport, 0));
  return 0;
};

export const getPercentageMkrVoted = async pollId => {
  let c = await loadContract(mainnetAddresses['GOV']);
  console.log('got c', c);
  const [voted, total] = await Promise.all([
    getMkrAmtVoted(pollId),
    await c.totalSupply().call()
  ]);
  return (voted / total) * 100;
  //.toNumber();
};

export const getWinningProposal = async pollId => {
  const { endDate } = await _getPoll(pollId);
  const endUnix = Math.floor(endDate / 1000);
  const endBlock = await this.get('govQueryApi').getBlockNumber(endUnix);
  const currentVotes = await this.get('govQueryApi').getMkrSupport(
    pollId,
    endBlock
  );
  let max = currentVotes[0];
  for (let i = 1; i < currentVotes.length; i++) {
    if (currentVotes[i].mkrSupport > max.mkrSupport) {
      max = currentVotes[i];
    }
  }
  return max ? max.optionId : 0;
};

const refresh = () => {
  this.polls = null;
};
/*
  async getOptionVotingFor(address, pollId) {
    return this.get('govQueryApi').getOptionVotingFor(
      address.toLowerCase(),
      pollId
    );
  }

  async getNumUniqueVoters(pollId) {
    return this.get('govQueryApi').getNumUniqueVoters(pollId);
  }

  async getMkrWeight(address) {
    const weight = await this.get('govQueryApi').getMkrWeight(
      address.toLowerCase(),
      POSTGRES_MAX_INT
    );
    return MKR(weight);
  }

  async getMkrAmtVoted(pollId) {
    const { endDate } = await this._getPoll(pollId);
    const endUnix = Math.floor(endDate / 1000);
    const endBlock = await this.get('govQueryApi').getBlockNumber(endUnix);
    const weights = await this.get('govQueryApi').getMkrSupport(
      pollId,
      endBlock
    );
    return MKR(weights.reduce((acc, cur) => acc + cur.mkrSupport, 0));
  }

  async getPercentageMkrVoted(pollId) {
    const [voted, total] = await Promise.all([
      this.getMkrAmtVoted(pollId),
      this.get('token')
        .getToken(MKR)
        .totalSupply()
    ]);
    return voted
      .div(total)
      .times(100)
      .toNumber();
  }



  async getVoteHistory(pollId, numPlots) {
    const { startDate, endDate } = await this._getPoll(pollId);
    const startUnix = Math.floor(startDate / 1000);
    const endUnix = Math.floor(endDate / 1000);
    const [startBlock, endBlock] = await Promise.all([
      this.get('govQueryApi').getBlockNumber(startUnix),
      this.get('govQueryApi').getBlockNumber(endUnix) //should return current block number if endDate hasn't happened yet
    ]);

    const voteHistory = [];
    const interval = Math.round((endBlock - startBlock) / numPlots);
    if (interval === 0) {
      const mkrSupport = await this.get('govQueryApi').getMkrSupport(
        pollId,
        endBlock
      );
      voteHistory.push([
        {
          time: mkrSupport[0].blockTimestamp,
          options: mkrSupport
        }
      ]);
    } else {
      for (let i = endBlock; i >= startBlock; i -= interval) {
        const mkrSupport = await this.get('govQueryApi').getMkrSupport(
          pollId,
          i
        );
        const time = mkrSupport.length > 0 ? mkrSupport[0].blockTimestamp : 0;
        voteHistory.push({
          time,
          options: mkrSupport
        });
      }
    }
    return voteHistory;
  }

*/
