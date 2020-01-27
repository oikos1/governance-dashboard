import React, { Fragment } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import mixpanel from 'mixpanel-browser';
import { getActiveAccount } from '../../reducers/accounts';
import { modalOpen, modalClose } from '../../reducers/modal';
import { cutMiddle, formatRound } from '../../utils/misc';
import { ethScanLink } from '../../utils/ethereum';
import Lock from './Lock';
import theme from '../../theme';
import Withdraw from './Withdraw';
import BreakLink from './BreakLink';
import AccountBox from '../AccountBox';
import {
  StyledTitle,
  MkrAmt,
  FlexContainer,
  VoteImpactHeading,
  EndButton,
  Skip,
  FlexRowEnd,
  BoxLeft,
  BoxRight
} from './shared/styles';

const PaddedFlexContainer = styled(FlexContainer)`
  padding-top: 24px;
`;

const JustifiedFlexContainer = styled(FlexContainer)`
  justify-content: space-between;
`;

const LineSpacer = styled(FlexContainer)`
  margin-top: 13px;
  color: ${theme.text.dim_grey};
  font-size: 18px;
  color: #939393;
`;

export const BoxMiddle = styled.span`
  background-color: #f2f5fa;
  height: 68px;
  width: 270px;
  border-top: 1px solid #dfe1e3;
  border-right: 1px solid #dfe1e3;
  border-bottom: 1px solid #dfe1e3;
  padding: 12px;
`;

const SecureVoting = ({ modalOpen, modalClose, activeAccount, network }) => {
  if (
    activeAccount !== undefined &&
    (activeAccount.hasProxy || activeAccount.singleWallet)
  ) {
    let { linkedAccount } = activeAccount.proxy;
    if (activeAccount.singleWallet) linkedAccount = activeAccount;
    const isColdWallet = activeAccount.proxyRole === 'cold';
    const coldWallet = isColdWallet ? activeAccount : linkedAccount;
    return (
      <Fragment>
        <JustifiedFlexContainer>
          <StyledTitle>Secure voting</StyledTitle>
          <AccountBox darkText={true} />
        </JustifiedFlexContainer>
        <PaddedFlexContainer>
          <BoxLeft>
            <VoteImpactHeading>Total MKR balance</VoteImpactHeading>
            <MkrAmt>
              {formatRound(
                (Number(coldWallet.mkrBalance) +
                  Number(activeAccount.proxy.votingPower)) /
                  10 ** 18,
                4
              )}
            </MkrAmt>
          </BoxLeft>
          <BoxMiddle>
            <VoteImpactHeading>In voting contract</VoteImpactHeading>
            <MkrAmt>{formatRound(activeAccount.proxy.votingPower, 4)}</MkrAmt>
          </BoxMiddle>
          <BoxRight>
            <VoteImpactHeading> Linked address </VoteImpactHeading>
            <FlexContainer>
              <MkrAmt noSuffix> {cutMiddle(linkedAccount.address)} </MkrAmt>
              <a
                target="_blank"
                rel="noopener noreferrer"
                href={ethScanLink(linkedAccount.address, network)}
              >
                Etherscan
              </a>
            </FlexContainer>
          </BoxRight>
        </PaddedFlexContainer>
        <EndButton
          slim
          disabled={!isColdWallet && !activeAccount.singleWallet}
          onClick={() => {
            mixpanel.track('btn-click', {
              id: 'top-up',
              product: 'governance-dashboard',
              page: 'SecureVoting',
              section: 'secure-voting-modal'
            });
            modalOpen(Lock);
          }}
        >
          Top-up voting contract
        </EndButton>
        <FlexRowEnd>
          {activeAccount.hasProxy && (
            <Fragment>
              <Skip
                mr={10}
                mt={13}
                onClick={() => {
                  mixpanel.track('btn-click', {
                    id: 'break-link-anchor',
                    product: 'governance-dashboard',
                    page: 'SecureVoting',
                    section: 'secure-voting-modal'
                  });
                  modalOpen(BreakLink, {}, true);
                }}
              >
                Break wallet link
              </Skip>
              <LineSpacer> | </LineSpacer>
            </Fragment>
          )}
          <Skip
            ml={10}
            mr={0}
            mt={13}
            onClick={() => {
              mixpanel.track('btn-click', {
                id: 'withdraw-anchor',
                product: 'governance-dashboard',
                page: 'SecureVoting',
                section: 'secure-voting-modal'
              });
              modalOpen(Withdraw);
            }}
          >
            Withdraw from voting contract
          </Skip>
        </FlexRowEnd>
      </Fragment>
    );
  }
};

export default connect(
  state => ({
    activeAccount: getActiveAccount(state),
    network: state.metamask.network
  }),
  { modalOpen, modalClose }
)(SecureVoting);
