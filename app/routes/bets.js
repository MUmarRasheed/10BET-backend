const express = require('express');
var jwt = require('jsonwebtoken');
const userValidation = require('../validators/user');
const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
let config = require('config');
const Bets = require('../models/bets');
const User = require('../models/user');
const CricketMatch = require('../models/cricketMatches');
const Markets = require('../models/marketTypes');
const SubMarketType = require('../models/subMarketTypes');
const loginRouter = express.Router();

async function placeBet(req, res) {
  const errors = validationResult(req);
  if (errors.errors.length !== 0) {
    return res.status(400).send({ errors: errors.errors });
  }
  //to do want to check blocked marketplaces and submarketplaces from the user
  const userId = req.decoded.userId;
  if (
    req.decoded.login.role == '0' ||
    req.decoded.login.role == '1' ||
    req.decoded.login.role == '2' ||
    req.decoded.login.role == '3' ||
    req.decoded.login.role == '4'
  ) {
    return res.send({ message: 'only bettor can do betting' });
  }
  const { sportsId, selectedTeam, betAmount, betRate, matchId, subMarketId } =
    req.body;
  try {
    const user = await User.findOne({ userId }).exec();
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }
    console.log('userrrr', user);
    if (user.bettingAllowed === false) {
      return res
        .status(400)
        .send({ message: 'Bet is not allowed for your account' });
    }
    // if (user.blockedMarketPlaces !== null) {
    //   return res.status(400).send({ message: 'Market Locked by the dealer' });
    // }
    const market = await Markets.findOne({
      marketId: req.body.sportsId,
    }).exec();
    if (!market) {
      return res.status(404).send({ message: 'Market not found' });
    }
    console.log('market', market);
    if (market.status == 0) {
      return res
        .status(400)
        .send({ message: 'Betting is disabled by the dealer' });
    }
    const subMarketTypes = await SubMarketType.findOne({
      subMarketId: subMarketId,
    }).exec();
    if (!subMarketTypes) {
      return res.status(404).send({ message: 'Market not found' });
    }
    console.log('submarket', subMarketTypes);
    if (subMarketTypes.status == 0) {
      return res
        .status(400)
        .send({ message: 'Betting is disabled by the dealer' });
    }

    const match = await CricketMatch.findOne({
      sportsId: sportsId,
      id: matchId,
    }).exec();
    console.log('match.teams', match);
    if (!match) {
      console.log(`Match not found for sports ID ${sportsId}`);
      return res
        .status(404)
        .send({ message: `Match not found for sports ID ${sportsId}` });
    }

    // Check if the match has ended
    if (match.matchEndced) {
      console.log(`Match has already ended for sports ID ${sportsId}`);
      return res
        .status(404)
        .send({ message: `Match has already ended for sports ID ${sportsId}` });
    }

    const teams = [match.teams[0], match.teams[1]];
    // const userBetRate = BetRateList.getBetRateList(
    //   sportsId,
    //   teams,
    //   selectedTeam
    // );

    // // Check if the user's bet rate is available
    // if (!userBetRate.includes(betRate)) {
    //   console.log(
    //     `Bet rate not available for user ID ${userId} and sports ID ${sportsId}`
    //   );
    //   return res.status(404).send({
    //     message: `Bet rate not available for user ID ${userId} and sports ID ${sportsId}`,
    //   });
    // }

    // Calculate the return amount
    const returnAmount = betAmount * betRate;
    const winningAmount = betAmount * betRate;
    const loosingAmount = req.body.betAmount;

    // Create the bet object
    const bet = new Bets({
      sportsId,
      userId,
      team: selectedTeam,
      betAmount,
      betRate,
      returnAmount,
      matchId: matchId,
      status: match.status,
      loosingAmount: loosingAmount,
      winningAmount: winningAmount,
      subMarketId: subMarketId,
    });

    // Save the bet object to the database
    console.log(
      `Bet placed for user ID ${userId}, sports ID ${sportsId}, and team ${selectedTeam}`
    );
    bet.save((err, result) => {
      if (err) {
        return res.status(400).send({ message: 'Error placing bet' });
      }
      return res.status(201).send({
        success: true,
        message: 'Bet placed successfully',
        results: result,
      });
    });
  } catch (error) {
    console.error(error);
    return res.status(404).send({ message: 'Server error' });
  }
}

const BetRateList = {
  //to do on sportsId and on matchId ratelist
  getBetRateList: (sportsId, teams, selectedTeam) => {
    let betRateList = [];
    console.log('teams', teams);
    console.log('selectedteams', selectedTeam);

    switch (sportsId) {
      case 1: // if sportsId is 1 (e.g. cricket)
        if (selectedTeam === teams[0]) {
          betRateList = [1.5, 2.0, 2.5, 3.0];
        } else if (selectedTeam === teams[1]) {
          betRateList = [2.0, 2.5, 3.0, 3.5];
        } else {
          throw new Error('Invalid team');
        }
        break;
      case 2: // if sportsId is 2 (e.g. basketball)
        if (selectedTeam === teams[0]) {
          betRateList = [1.2, 1.5, 2.0, 2.5];
        } else if (selectedTeam === teams[1]) {
          betRateList = [1.5, 2.0, 2.5, 3.0];
        } else {
          throw new Error('Invalid team');
        }
        break;
      // add more cases for other sports
      default: // if sportsId is not recognized
        throw new Error('Invalid sportsId');
    }

    return betRateList;
  },
};
loginRouter.post('/placeBet', placeBet);

module.exports = { loginRouter };
