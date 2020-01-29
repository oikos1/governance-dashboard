/*export const getFromService = (network, query) => {
    console.log('getFromService', query)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.timeout = settings.chain[network].serviceTimeout;
    xhr.open("POST", settings.chain[network].service, true);
    xhr.setRequestHeader("Content-type", "application/graphql");
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4 && xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        resolve(response);
      } else if (xhr.readyState === 4 && xhr.status !== 200) {
        reject(xhr.status);
      }
    }
    // xhr.send();
    xhr.send(`query ${query}`);
  });
}

export const getCupsFromService = (network, lad) => {
    console.log('getCupsFromService')
    lad = window.tronWeb.address.toHex(lad);
  return new Promise((resolve, reject) => {
    getFromService(network, `{ allCups( condition: { lad: "${lad}" } ) { nodes { id, block } } }`)
    .then(r => resolve(r.data.allCups.nodes), e => reject(e))
  });
}

export const getCupHistoryFromService = (network, cupId) => {
    console.log('getCupHistoryFromService')

  return new Promise((resolve, reject) => {
    getFromService(network, `{ getCup(id: ${cupId}) { actions { nodes { act arg guy tx time ink art per pip } } } }`)
    .then(r => resolve(r.data.getCup ? r.data.getCup.actions.nodes : null), e => reject(e))
  });
}
*/

export const getQueryResponse = async (serverUrl, query) => {
  const resp = await fetch(serverUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/graphql',
      'Content-type': 'application/graphql'
    },
    body: query
  });
  const { data } = await resp.json();
  //assert(data, `error fetching data from ${serverUrl}`);
  return data;
};

export const getBlockNumber = async unixTime => {
  let date = new Date(unixTime);
  if (date.getTime() >= new Date().getTime())
    console.log('getBlockNumber', { currentBlock: 'lastBlock' });
  return { currentBlock: 'lastBlock' };

  const query = `{
      dateBlock(argUnix: ${date})
    }`;
  const response = await getQueryResponse('http://localhost:31337/v1', query);
  return response.timeToBlockNumber.nodes[0];
};

export const GetAllWhitelistedPolls = async () => {
  const query = `{ activePolls { nodes { creator pollId startBlock endBlock} } }`;

  const response = await getQueryResponse('http://localhost:31337/v1', query);

  //return response.activePolls.nodes.map(async (p) => {
  //p.startDate = new Date(p.startBlock );
  //p.endDate = new Date(p.endBlock );
  //  console.log("mapped", JSON.stringify(response.activePolls.nodes))
  //  return response.activePolls.nodes;
  //});
  console.log('mapped', JSON.stringify(response));
  return response;
};

export const test = async (address, pollId) => {
  console.log('querying for address', address, 'pollId', pollId);
  const query = `{ currentVote(address: "${address}", pollid: ${pollId}) }`;
  const response = await getQueryResponse('http://localhost:31337/v1', query);
  console.log('got response from currentVote', JSON.stringify(response));
  //if (!response.currentVote.nodes[0]) return null;
  return response.currentVote;
};
/*
  export getNumUniqueVoters = (pollId) => {
    const query = `{uniqueVoters(argPollId:${pollId}){
      nodes
    }
    }`;

    const response = await this.getQueryResponse(this.serverUrl, query);
    return parseInt(response.uniqueVoters.nodes[0]);
  }

  async getMkrWeight(address, blockNumber) {
    const query = `{totalMkrWeightProxyAndNoProxyByAddress(argAddress: "${address}", argBlockNumber: ${blockNumber}){
      nodes {
        address
        weight
      }
    }
    }`;
    const response = await this.getQueryResponse(this.serverUrl, query);
    if (!response.totalMkrWeightProxyAndNoProxyByAddress.nodes[0]) return 0;
    return response.totalMkrWeightProxyAndNoProxyByAddress.nodes[0].weight;
  }

  async getOptionVotingFor(address, pollId) {
    const query = `{
      currentVote(argAddress: "${address}", argPollId: ${pollId}){
        nodes{
          optionId
        }
      }
    }`;
    const response = await this.getQueryResponse(this.serverUrl, query);
    if (!response.currentVote.nodes[0]) return null;
    return response.currentVote.nodes[0].optionId;
  }

  async getBlockNumber(unixTime) {
    const query = `{
      timeToBlockNumber(argUnix: ${unixTime}){
      nodes
    }
    }`;
    const response = await this.getQueryResponseMemoized(this.serverUrl, query);
    return response.timeToBlockNumber.nodes[0];
  }

  async getMkrSupport(pollId, blockNumber) {
    const query = `{voteOptionMkrWeights(argPollId: ${pollId}, argBlockNumber: ${blockNumber}){
    nodes{
      optionId
      mkrSupport
    }
  }
  }`;
    const response = await this.getQueryResponseMemoized(this.serverUrl, query);
    let weights = response.voteOptionMkrWeights.nodes;
    // We don't want to calculate votes for 0:abstain
    weights = weights.filter(o => o.optionId !== 0);
    const totalWeight = weights.reduce((acc, cur) => {
      const mkrSupport = isNaN(parseFloat(cur.mkrSupport))
        ? 0
        : parseFloat(cur.mkrSupport);
      return acc + mkrSupport;
    }, 0);
    return weights.map(o => {
      const mkrSupport = isNaN(parseFloat(o.mkrSupport))
        ? 0
        : parseFloat(o.mkrSupport);
      o.mkrSupport = mkrSupport;
      o.percentage = (100 * mkrSupport) / totalWeight;
      o.blockTimestamp = new Date(o.blockTimestamp);
      return o;
    });
  }

  async getEsmJoins() {
    const query = `{allEsmJoins {
      nodes {
        txFrom
        txHash
        joinAmount
        blockTimestamp
      }
  }
  }`;
    const response = await this.getQueryResponse(this.serverUrl, query);
    const joins = response.allEsmJoins.nodes;
    return joins;
  }
*/
