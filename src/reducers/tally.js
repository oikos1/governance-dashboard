import { createReducer } from '../utils/redux';
import { promiseRetry } from '../utils/misc';
import { getVoteTally } from '../services/Chief';
// Constants ----------------------------------------------

export const TALLY_REQUEST = 'voteTally/TALLY_REQUEST';
export const TALLY_SUCCESS = 'voteTally/TALLY_SUCCESS';
export const TALLY_FAILURE = 'voteTally/TALLY_FAILURE';
export const TALLY_UPDATE = 'voteTally/TALLY_UPDATE';

// Actions ------------------------------------------------

export const voteTallyInit = () => dispatch => {
  //const service = window.maker.service('chief');
  //console.log("got chief", service)
  dispatch({ type: TALLY_REQUEST });
  return (
    promiseRetry({
      times: 1,
      fn: getVoteTally,
      delay: 500
    })
      .then(tally => {
        console.log('got tally', tally);
        dispatch({ type: TALLY_SUCCESS, payload: { tally } });
      })
      // sometimes this fails when we're reading event logs
      .catch(error => {
        // TODO: notify user or throw to a fallback component
        dispatch({ type: TALLY_FAILURE });
      })
  );
};

// Reducer ------------------------------------------------

const initialState = {
  fetching: true,
  tally: {}
};

const tally = createReducer(initialState, {
  [TALLY_REQUEST]: _ => ({
    ...initialState,
    fetching: true
  }),
  [TALLY_SUCCESS]: (_, { payload }) => ({
    fetching: false,
    tally: payload.tally
  }),
  [TALLY_FAILURE]: state => ({
    ...state,
    fetching: false
  })
});

export default tally;
