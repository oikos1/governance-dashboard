import React from 'react';
import { connect } from 'react-redux';
import {
  Box,
  Grid,
  Button,
  Flex,
  Link,
  Input,
  Card,
  Address
} from '@makerdao/ui-components-core';

import linkImg from '../../imgs/onboarding/link-lock.svg';
import lockImg from '../../imgs/onboarding/lock.svg';

import faqs from './data/faqs';
import Sidebar from './shared/Sidebar';
import Stepper from './shared/Stepper';
import OnboardingHeader from './shared/OnboardingHeader';
import WalletIcon from './shared/WalletIcon';
import SignTransactionStep from './shared/SignTransactionStep';
import TwoColumnSidebarLayout from './shared/TwoColumnSidebarLayout';
import { lock } from '../../reducers/proxy';
import { getAccount } from '../../reducers/accounts';
import {
  ColdWalletTag,
  VotingContractTag,
  SingleWalletTag
} from './shared/Tags';
import { Label } from '../../utils/typography';

const inputWidth = '33.4rem';
const walletIconSize = '2.7rem';

class LockMKR extends React.Component {
  constructor(props) {
    super(props);

    let storageWallet = this.props.coldWallet;
    let votingWallet = this.props.hotWallet;

    // if we're not using a proxy, assign hot/cold wallet to the single wallet to keep behavior intact
    //if (this.props.skipProxy) {
    storageWallet = this.props.singleWallet;
    votingWallet = this.props.singleWallet;
    //}

    this.state = {
      step: 0,
      votingMKR: '',
      error: false,
      faqs: [],
      storageWallet,
      votingWallet
    };

    console.log('LockMKR set state to', this.state);
  }

  toChooseDepositAmount = () => {
    this.setState({
      step: 0,
      faqs: []
    });
  };

  toConfirmDepositAmount = () => {
    this.setState({
      step: 1,
      faqs: []
    });
  };

  toLockMKR = () => {
    this.props.lock(parseFloat(this.state.votingMKR));
    this.setState({
      step: 2,
      faqs: faqs.lockMKR
    });
  };

  handleVotingMKRChange = event => {
    if (this.state.error) this.validate(event.target.value);
    this.setState({
      votingMKR: event.target.value
    });
  };

  validateOnBlur = event => {
    this.validate(event.target.value);
  };

  validate = amount => {
    const mkr = parseFloat(amount);
    let error = false;

    if (Number.isNaN(mkr)) {
      error = 'Please enter a valid number';
    } else if (mkr === 0) {
      error = 'Please enter a number greater than zero';
    } else if (mkr > this.state.storageWallet.mkrBalance) {
      error = `The maximum amount of MKR you can lock is ${this.state.storageWallet.mkrBalance}`;
    }

    this.setState({
      error
    });
  };

  setMaxVotingMKR = () => {
    this.setState({
      votingMKR: this.state.storageWallet.mkrBalance,
      error: false
    });
  };

  render() {
    return (
      <TwoColumnSidebarLayout
        sidebar={
          <Sidebar
            hotWallet={this.props.hotWallet}
            coldWallet={this.props.coldWallet}
            singleWallet={this.props.singleWallet}
            faqs={this.state.faqs}
          />
        }
      >
        <div>
          <Grid gridRowGap="l">
            {this.state.step <= 1 && (
              <OnboardingHeader
                title="Lock MKR"
                subtitle={`In order to participate in voting, you must lock your MKR tokens${
                  !this.props.singleWallet
                    ? ' into your secure voting contract.'
                    : ''
                }. The higher the amount, the more impact you’ll have on the system`}
              />
            )}

            <Stepper step={this.state.step}>
              <Grid gridRowGap="l">
                <div>
                  <Label mb="s">Available MKR</Label>
                  <div>
                    {[this.state.storageWallet.mkrBalance.toNumber()]} MKR
                    available to vote
                  </div>
                </div>

                <div>
                  <Label mb="s">MKR you would like to vote with?</Label>
                  <div>
                    <Input
                      maxWidth={`${inputWidth}`}
                      placeholder="00.0000 MKR"
                      value={this.state.votingMKR}
                      onChange={this.handleVotingMKRChange}
                      onBlur={this.validateOnBlur}
                      after={
                        <Link
                          fontWeight="medium"
                          onClick={this.setMaxVotingMKR}
                        >
                          Set max
                        </Link>
                      }
                      errorMessage={this.state.error}
                    />
                  </div>
                </div>

                <Flex justifyContent="center">
                  <Button
                    variant="secondary-outline"
                    onClick={this.props.onComplete}
                    mr="s"
                  >
                    Skip step
                  </Button>
                  <Button
                    disabled={!this.state.votingMKR || this.state.error}
                    onClick={this.toConfirmDepositAmount}
                  >
                    Confirm
                  </Button>
                </Flex>
              </Grid>
              <div>
                <Label mb="xs">MKR in your control</Label>
                <Card px="m" py="s">
                  <Grid
                    alignItems="center"
                    gridTemplateColumns="auto 1fr 1fr 1fr"
                    gridColumnGap="s"
                  >
                    <Box>
                      <WalletIcon
                        provider={this.state.storageWallet.type}
                        style={{
                          maxWidth: walletIconSize,
                          maxHeight: walletIconSize
                        }}
                      />
                    </Box>
                    <Box>
                      <Link fontWeight="semibold">
                        <Address
                          full={this.state.storageWallet.address}
                          shorten
                        />
                      </Link>
                    </Box>
                    <Box gridRow={['2', '1']} gridColumn={['1/3', '3']}>
                      {this.state.storageWallet.mkrBalance.toNumber()} MKR
                    </Box>
                    <Flex justifyContent="flex-end">
                      {this.props.singleWallet ? (
                        <SingleWalletTag />
                      ) : (
                        <ColdWalletTag />
                      )}
                    </Flex>
                  </Grid>
                </Card>

                <Box ml="s" mt="xs">
                  <img src={linkImg} alt="" />
                </Box>

                <Label mb="xs">Secure MKR ready to vote</Label>
                <Card px="m" py="s">
                  <Grid
                    alignItems="center"
                    gridTemplateColumns="auto 1fr 1fr 1fr"
                    gridColumnGap="s"
                  >
                    <Box>
                      <img src={lockImg} alt="" />
                    </Box>
                    {/* <Box>
                      <Link fontWeight="semibold">Address hidden</Link>
                    </Box> */}
                    <Box gridRow={['2', '1']} gridColumn={['1/3', '3']}>
                      {Number(this.state.votingMKR)} MKR
                    </Box>
                    <Flex justifyContent="flex-end">
                      <VotingContractTag />
                    </Flex>
                  </Grid>
                </Card>

                <Flex justifyContent="flex-end" mt="m">
                  <Button
                    variant="secondary-outline"
                    mr="s"
                    onClick={this.toChooseDepositAmount}
                  >
                    Back
                  </Button>

                  <Button onClick={this.toLockMKR}>Confirm</Button>
                </Flex>
              </div>
              <SignTransactionStep
                title="Confirm lock MKR"
                subtitle={
                  <span>
                    In order to start voting please confirm the Locking of MKR
                    on your {this.props.skipProxy ? '' : 'cold'} wallet ending
                    in <Link>{this.state.storageWallet.address.slice(-4)}</Link>
                    .
                    <br />
                    You can withdraw your MKR at anytime.
                  </span>
                }
                walletProvider={this.state.storageWallet.type}
                status={this.props.sendMkrTxStatus}
                tx={this.props.sendMkrTxHash}
                onNext={this.props.onComplete}
                onRetry={this.toConfirmDepositAmount}
                onCancel={this.toConfirmDepositAmount}
              />
            </Stepper>
          </Grid>
        </div>
      </TwoColumnSidebarLayout>
    );
  }
}

export default connect(
  ({ onboarding, proxy, ...state }) => ({
    hotWallet: onboarding.skipProxy
      ? ''
      : getAccount(state, onboarding.hotWallet.address),
    coldWallet: onboarding.skipProxy
      ? ''
      : getAccount(state, onboarding.coldWallet.address),
    singleWallet: onboarding.skipProxy
      ? getAccount(state, state.accounts.activeAccount)
      : '',
    skipProxy: onboarding.skipProxy,
    ...proxy
  }),
  {
    lock
  }
)(LockMKR);
