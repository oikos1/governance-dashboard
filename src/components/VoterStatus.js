import { connect } from 'react-redux';
import React, { Fragment } from 'react';
import styled, { keyframes } from 'styled-components';
import mixpanel from 'mixpanel-browser';
import { modalOpen } from '../reducers/modal';
import { onboardingOpen } from '../reducers/onboarding';
import { getActiveAccount } from '../reducers/accounts';
import theme from '../theme';
import DotSpacer from './DotSpacer';
import WithVote from './hocs/WithVote';
import {
  Flag,
  Banner,
  BannerHeader,
  BannerBody,
  BannerContent
} from './Banner';
import Button from './Button';
import Loader from './Loader';
import { cutMiddle, firstLetterCapital, formatRound, add } from '../utils/misc';
import { ethScanLink } from '../utils/ethereum';
import Lock from './modals/Lock';
import Withdraw from './modals/Withdraw';
import ExtendedLink from '../components/Onboarding/shared/ExtendedLink';

const fadeIn = keyframes`
0% {
  opacity: 0;
}
100% {
  opacity: 1;
}
`;

const FadeIn = styled.div`
  animation: ${fadeIn} 0.75s forwards;
`;

const SmallMediumText = styled.p`
  margin-top: 20px;
  margin-bottom: 50px;
  text-align: left;
  line-height: 2;
  font-size: 14px;
  color: ${theme.text.dim_grey};
`;

const Black = styled.span`
  color: ${theme.text.default};
`;

const Strong = styled(Black)`
  color: ${theme.text.default};
  font-weight: bold;
`;

const StyledLink = styled(ExtendedLink)`
  pointer-events: ${({ disabled }) => (disabled ? 'none' : 'auto')};
  color: ${({ disabled }) => (disabled ? 'black' : '')};
`;

const Content = styled.div`
  display: flex;
`;

const TextButton = styled.span`
  color: ${theme.text.blue_link};
  cursor: pointer;
`;

const WelcomeBanner = ({ onboardingOpen, activeAccount }) => {
  return (
    <Banner>
      <Content>
        <Flag mr={20} mt="-2" />
        <BannerBody whiteSpace="pre">
          <BannerHeader>
            Welcome to the governance voting dashboard
          </BannerHeader>
          <BannerContent>
            Before you can get started voting you will need to set up a voting
            contract
          </BannerContent>
        </BannerBody>
      </Content>
      <Button
        slim
        color={'grey'}
        hoverColor={'grey'}
        textColor={theme.text.darker_default}
        hoverTextColor={theme.text.darker_default}
        activeColor={'grey'}
        onClick={() => {
          mixpanel.track('btn-click', {
            id: 'onboarding-open',
            product: 'governance-dashboard',
            page: 'Home',
            section: 'welcome-banner'
          });
          onboardingOpen();
        }}
        disabled={!activeAccount}
      >
        Set up now
      </Button>
    </Banner>
  );
};

const Padding = styled.div`
  margin-top: 20px;
`;

const VoterStatus = ({
  account,
  network,
  onboardingOpen,
  modalOpen,
  fetching,
  signaling,
  onboardingState,
  legacy
}) => {
  if (fetching) {
    return (
      <Padding>
        <Loader mt={34} mb={34} color="header" background="background" />
      </Padding>
    );
  }
  if (
    !account ||
    (!account.hasProxy &&
      !account.singleWallet &&
      onboardingState !== 'finished')
  )
    return (
      <FadeIn>
        <WelcomeBanner
          activeAccount={account}
          onboardingOpen={onboardingOpen}
        />
      </FadeIn>
    );
  const { linkedAccount } = account.proxy;
  const isColdWallet = account.proxyRole === 'cold';
  const coldWallet =
    isColdWallet || account.singleWallet ? account : linkedAccount;

  // Outlier possibility that someone has MKR locked in chief as well as a proxy
  const mkrLockedInChief = add(
    account.mkrLockedChiefHot,
    account.mkrLockedChiefCold
  );
  const votingWeight = add(
    add(account.proxy.votingPower, account.mkrBalance),
    linkedAccount.mkrBalance
  );

  const pollVotingPower = add(votingWeight, mkrLockedInChief);
  return (
    <FadeIn>
      {!account.singleWallet ? (
        <SmallMediumText>
          <Strong>{isColdWallet ? 'Cold wallet:' : 'Hot wallet:'}</Strong> In
          voting contract{' '}
          <Black>{formatRound(account.proxy.votingPower, 4)} MKR</Black>{' '}
          {account.proxyRole === 'cold' && Number(account.mkrBalance) > 0 && (
            <TextButton onClick={() => modalOpen(Lock)}>Top-up</TextButton>
          )}
          {account.proxyRole === 'cold' &&
            Number(account.proxy.votingPower) > 0 && <span> | </span>}
          {Number(account.proxy.votingPower) > 0 && (
            <TextButton onClick={() => modalOpen(Withdraw)}>
              Withdraw
            </TextButton>
          )}
          <DotSpacer />
          In cold wallet{' '}
          <Black>{Number(coldWallet.mkrBalance) / 10 ** 18} MKR</Black>{' '}
          <DotSpacer />
          {linkedAccount.address !== '0x' && (
            <Fragment>
              {firstLetterCapital(linkedAccount.proxyRole)} wallet:{' '}
              {cutMiddle(linkedAccount.address)}{' '}
              <a
                target="_blank"
                rel="noopener noreferrer"
                href={ethScanLink(linkedAccount.address, network)}
              >
                Etherscan
              </a>
            </Fragment>
          )}
          <DotSpacer />
          {!legacy && (
            <Fragment>
              Total voting weight:{' '}
              <Black>{Number(pollVotingPower) / 10 ** 18} MKR</Black>{' '}
            </Fragment>
          )}
          <br />
          {account.votingFor && account.proxy.votingPower > 0 ? (
            <Fragment>
              <WithVote
                proposalAddresses={account.votingFor}
                signaling={signaling}
              >
                {({ proposalTitle, proposalSlug, noVote, topicKey }) =>
                  noVote ? (
                    'Currently not voting'
                  ) : (
                    <Fragment>
                      Currently voting for{' '}
                      <StyledLink
                        disabled={noVote}
                        to={`/${topicKey}/${proposalSlug}`}
                      >
                        {proposalTitle}
                      </StyledLink>
                    </Fragment>
                  )
                }
              </WithVote>
            </Fragment>
          ) : legacy ? (
            'Currently not voting'
          ) : null}
        </SmallMediumText>
      ) : (
        <SmallMediumText>
          <Strong>{'Active wallet:'}</Strong> In voting contract{' '}
          <Black>{formatRound(account.proxy.votingPower, 4)} MKR</Black>{' '}
          {Number(account.mkrBalance) > 0 && (
            <TextButton onClick={() => modalOpen(Lock)}>Top-up</TextButton>
          )}
          {Number(account.proxy.votingPower) > 0 && <span> | </span>}
          {Number(account.proxy.votingPower) > 0 && (
            <TextButton onClick={() => modalOpen(Withdraw)}>
              Withdraw
            </TextButton>
          )}
          <DotSpacer />
          Remaining wallet balance{' '}
          <Black>
            {formatRound(Number(coldWallet.mkrBalance) / 10 ** 18, 4)} MKR
          </Black>{' '}
          <DotSpacer />
          {linkedAccount.address !== '0x' && (
            <Fragment>
              This wallet: {cutMiddle(account.address)}{' '}
              <a
                target="_blank"
                rel="noopener noreferrer"
                href={ethScanLink(account.address, network)}
              >
                Etherscan
              </a>
            </Fragment>
          )}
          <br />
          {account.votingFor && account.proxy.votingPower > 0 ? (
            <Fragment>
              <WithVote
                proposalAddresses={account.votingFor}
                signaling={signaling}
              >
                {({ proposalTitle, proposalSlug, noVote, topicKey }) =>
                  noVote ? (
                    'Currently not voting'
                  ) : (
                    <Fragment>
                      Currently voting for{' '}
                      <StyledLink
                        disabled={noVote}
                        to={`/${topicKey}/${proposalSlug}`}
                      >
                        {proposalTitle}
                      </StyledLink>
                    </Fragment>
                  )
                }
              </WithVote>
            </Fragment>
          ) : legacy ? (
            'Currently not voting'
          ) : null}
        </SmallMediumText>
      )}
    </FadeIn>
  );
};

const mapStateToProps = state => ({
  account: getActiveAccount(state),
  network: state.metamask.network,
  fetching: state.accounts.fetching,
  onboardingState: state.onboarding.state
});

export default connect(mapStateToProps, { modalOpen, onboardingOpen })(
  VoterStatus
);
