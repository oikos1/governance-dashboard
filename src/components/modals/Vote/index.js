import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import ReactGA from 'react-ga';

import { add, subtract, formatRound } from '../../../utils/misc';
import Button from '../../Button';
import WithTally from '../../hocs/WithTally';
import { getActiveAccount } from '../../../reducers/accounts';
import { modalClose } from '../../../reducers/modal';
import {
  sendVote,
  withdrawVote,
  clear as voteClear
} from '../../../reducers/vote';
import {
  StyledTitle,
  StyledBlurb,
  StyledTop,
  MkrAmt,
  VoteImpact,
  VoteImpactHeading
} from '../shared/styles';
import TransactionModal from '../shared/InitiateTransaction';

const headingColor = '#212536';
const borderColor = '#DFE1E3';

class Vote extends Component {
  componentDidMount() {
    this.props.voteClear();
    ReactGA.modalview('vote');
  }

  // HANDLE ALL THE WAYS USERS COULD BE SILLY eg validate inputs
  render() {
    const {
      proposal,
      voteTxHash,
      voteTxStatus,
      activeAccount,
      modalClose
    } = this.props;
    const { proxy, votingFor } = activeAccount;

    const alreadyVotingFor = votingFor.includes(window.tronWeb.address.toHex(proposal.address).toLowerCase());
 
    return (
      <TransactionModal
        txHash={voteTxHash}
        txStatus={voteTxStatus}
        account={activeAccount}
        txPurpose={
          alreadyVotingFor
            ? 'This transaction is to withdraw your vote'
            : 'This transaction is to cast your vote'
        }
        onComplete={modalClose}
      >
        {onNext => {
          if (alreadyVotingFor) {
            return (
              <Fragment>
                <StyledTop>
                  <StyledTitle>Confirmation</StyledTitle>
                </StyledTop>
                <StyledBlurb>
                  You will be withdrawing your vote from{' '}
                  <strong style={{ color: headingColor }}>
                    {proposal.title}
                  </strong>{' '}
                  please confirm below.
                </StyledBlurb>
                <WithTally candidate={proposal.address}>
                  {({ approvals }) => (
                    <VoteImpact>
                      <div
                        style={{
                          width: '100%',
                          padding: '8px 30px'
                        }}
                      >
                        <VoteImpactHeading>Current vote</VoteImpactHeading>
                        <MkrAmt>{formatRound(approvals / 10 ** 18, 3)}</MkrAmt>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          padding: '8px 30px',
                          borderLeft: `1px solid ${borderColor}`
                        }}
                      >
                        <VoteImpactHeading>
                          After vote withdrawal
                        </VoteImpactHeading>
                        <MkrAmt>
                          {formatRound(
                            Number(subtract(approvals, proxy.votingPower)) < 0
                              ? 0
                              : subtract(approvals, proxy.votingPower),
                            3
                          )}
                        </MkrAmt>
                      </div>
                    </VoteImpact>
                  )}
                </WithTally>
                <div
                  style={{
                    marginLeft: 'auto',
                    marginTop: '18px'
                  }}
                >
                  <Button
                    slim
                    onClick={() => {
                      this.props.withdrawVote(proposal.address);
                      onNext();
                    }}
                  >
                    Confirm
                  </Button>
                </div>
              </Fragment>
            );
          } else {
            return (
              <Fragment>
                <StyledTop>
                  <StyledTitle>Confirmation</StyledTitle>
                </StyledTop>
                <StyledBlurb>
                  You will be voting for{' '}
                  <strong style={{ color: headingColor }}>
                    {proposal.title}
                  </strong>{' '}
                  please confirm vote below. Vote can be withdrawn at anytime
                </StyledBlurb>
                <WithTally candidate={proposal.address}>
                  {({ approvals }) => (
                    <VoteImpact>
                      <div
                        style={{
                          width: '100%',
                          maxWidth: '180px',
                          padding: '8px 18px'
                        }}
                      >
                        <VoteImpactHeading>
                          In secure contract
                        </VoteImpactHeading>
                        <MkrAmt>
                          {formatRound(Number(proxy.votingPower / 10 ** 18), 3)}
                        </MkrAmt>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          padding: '8px 30px',
                          maxWidth: '180px',
                          borderLeft: `1px solid ${borderColor}`
                        }}
                      >
                        <VoteImpactHeading>Current vote</VoteImpactHeading>
                        <MkrAmt>{formatRound(approvals / 10 ** 18, 3)}</MkrAmt>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          padding: '8px 30px',
                          maxWidth: '180px',
                          borderLeft: `1px solid ${borderColor}`
                        }}
                      >
                        <VoteImpactHeading>After vote cast</VoteImpactHeading>
                        <MkrAmt>
                          {formatRound(
                            Number(
                              add(approvals, proxy.votingPower) / 10 ** 18
                            ),
                            3
                          )}
                        </MkrAmt>
                      </div>
                    </VoteImpact>
                  )}
                </WithTally>
                <div
                  style={{
                    marginLeft: 'auto',
                    marginTop: '18px'
                  }}
                >
                  <Button
                    slim
                    onClick={() => {
                      this.props.sendVote(proposal.address);
                      onNext();
                    }}
                  >
                    Confirm
                  </Button>
                </div>
              </Fragment>
            );
          }
        }}
      </TransactionModal>
    );
  }
}

Vote.propTypes = {
  voteTxHash: PropTypes.string,
  voteTxStatus: PropTypes.string,
  sendVote: PropTypes.func,
  proposal: PropTypes.object
};

Vote.defaultProps = {
  voteTxHash: '',
  voteTxStatus: '',
  proposal: {}
};

export default connect(
  state => ({
    activeAccount: getActiveAccount(state),
    voteTxHash: state.vote.txHash,
    voteTxStatus: state.vote.txStatus
  }),
  { modalClose, sendVote, voteClear, withdrawVote }
)(Vote);
