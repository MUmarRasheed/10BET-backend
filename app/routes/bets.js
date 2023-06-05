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
const betValidator = require('../validators/bets');
// const maxAllowedBetSizes = require('../models/betLimits')

async function getParents(userId) {
  const parentUserIds = [];
  let currentUserId = userId;

  while (currentUserId) {
    const parentUser = await User.findOne({ userId: currentUserId }).exec();
    if (!parentUser || !parentUser.createdBy || parentUser.createdBy === currentUserId) {
      break;
    }

    parentUserIds.push(parentUser.createdBy);
    currentUserId = parentUser.createdBy;
  }

  return parentUserIds;
}

async function placeBet(req, res) {
  const errors = validationResult(req);
  if (errors.errors.length !== 0) {
    return res.status(400).send({ errors: errors.errors });
  }
  const { marketId, selectedTeam, betAmount, betRate, matchId, subMarketId } = req.body;

  const userId = req.decoded.userId;
  if (req.decoded.login.role !== '5') {
    return res.status(404).send({ message: 'you are not Allowed to bet' });
  }

  try {
    const user = await User.findOne({ userId }).exec();
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }
    if (user.availableBalance < betAmount) {
      return res.status(404).send({ message: 'insufficient balance' });
    }
    if (user.bettingAllowed === false) {
      return res.status(404).send({ message: 'Bet is not allowed for your account' });
    }

    const parentUserIds = await getParents(user.userId);

    const parentUser = await User.find({
      userId: {
        $in: [...parentUserIds]
      },
      isDeleted: false
    }).exec();
    console.log('parentUser', parentUser);
    // seeing from markettypes
    if (
      parentUser[0].blockedMarketPlaces.includes(marketId) ||
      parentUser[0].blockedSubMarkets.includes(subMarketId)
    ) {
      return res.status(404).send({ message: 'Betting disabled by your dealer' });
    }
    // Check if the user is allowed to place a bet in the specified market and submarket
    if (user.betLockStatus === true || user.matchOddsStatus === true) {
      return res
        .status(400)
        .send({ message: 'Bet not allowed for your account' });
    }
    if (user.blockedSubMarkets.includes(subMarketId)) {
      return res.status(404).send({ message: 'Betting is not allowed in this market' });
    }
    // default maxbetsize should be of that set by company but if the user set his own betsize then his
    // and we cannot place a bet of the amount that is greater than this maxbetsize

    // const MaxBetSize = await maxAllowedBetSizes.findOne().exec();
    // console.log('MaxBetSize',MaxBetSize)
    const match = await CricketMatch.findOne({
      sportsId: marketId,
      id: matchId,
    }).exec();
    console.log('match.teams', match);
    if (!match) {
      console.log(`Match not found for sports ID ${marketId}`);
      return res.status(404).send({ message: `Match not found for sports ID ${marketId}` });
    }

    // Check if the match has ended
    if (match.matdchEnded) {
      console.log(`Match has already ended for sports ID ${marketId}`);
      return res
        .status(404)
        .send({ message: `Match has already ended for sports ID ${marketId}` });
    }

    const teams = [match.teams[0], match.teams[1]];
    // Calculate the return amount
    const returnAmount = betAmount * betRate - betAmount;
    const winningAmount = betAmount * betRate - betAmount;
    const loosingAmount = req.body.betAmount;
    let marketIds = marketId;
    // Create the bet object
    const bet = new Bets({
      marketId,
      userId,
      team: selectedTeam,
      betAmount,
      betRate,
      returnAmount,
      matchId: matchId,
      matchStatus: match.status,
      loosingAmount: loosingAmount,
      winningAmount: winningAmount,
      subMarketId: subMarketId,
      runner: selectedTeam,
      event: match.name,
    });

    // Save the bet object to the database
    console.log(
      `Bet placed for user ID ${userId}, sports ID ${marketId}, and team ${selectedTeam}`
    );
    bet.save(async (err, result) => {
      if (err) {
        console.log('err', err);
        return res.status(404).send({ message: 'Error placing bet' });
      }
      try {
        const updatedUser = await User.findOneAndUpdate(
          { userId: userId },
          {
            $inc: {
              availableBalance: -req.body.betAmount,
              exposure: -Math.abs(req.body.betAmount),
            },
          },
          { new: true }
        ).exec();

        const updatedParentUsers = await User.updateMany(
          { userId: { $in: parentUserIds } },
          {
            $inc: {
              availableBalance: -req.body.betAmount,
              exposure: -Math.abs(req.body.betAmount),
            },
          },
          { new: true }
        ).exec();
    
        return res.send({
          success: true,
          message: 'Bet placed successfully',
          results: result,
        });
      } catch (error) {
        console.error('error', error);
        return res.status(404).send({ message: 'Error updating user balance' });
      }
    });
  } catch (error) {
    console.error('error', error);
    return res.status(404).send({ message: 'Server error' });
  }
}

function getUserBets(req, res) {
  const errors = validationResult(req);
  if (errors.errors.length !== 0) {
    return res.status(400).send({ errors: errors.errors });
  }
  // Initialize variables with default values
  let query = {};
  let page = 1;
  let sort = -1;
  let sortValue = 'createdAt';
  var limit = config.pageSize;
  if (req.body.numRecords) {
    if (isNaN(req.body.numRecords))
      return res.status(404).send({ message: 'NUMBER_RECORDS_IS_NOT_PROPER' });
    if (req.body.numRecords < 0)
      return res.status(404).send({ message: 'NUMBER_RECORDS_IS_NOT_PROPER' });
    if (req.body.numRecords > 100)
      return res.status(404).send({
        message: 'NUMBER_RECORDS_NEED_TO_LESS_THAN_100',
      });
    limit = Number(req.body.numRecords);
  }
  if (req.body.sortValue) sortValue = req.body.sortValue;
  if (req.body.sort) {
    sort = Number(req.body.sort);
  }
  if (req.query.page) {
    page = Number(req.body.page);
  }
  if (req.body.endDate && req.body.startDate) {
    query.createdAt = {
      $gte: req.body.startDate,
      $lte: req.body.endDate,
    };
  }
  if (req.body.userId) {
    query.userId = req.body.userId;
  }
  if (req.body.status) {
    query.status = req.body.status;
  }
  if (req.body.marketId) {
    query.marketId = req.body.marketId;
  }
  if (req.body.searchValue) {
    const searchRegex = new RegExp(req.body.searchValue, 'i');
    query.$or = [
      { name: { $regex: searchRegex } },
      {
        $expr: {
          $regexMatch: { input: { $toString: '$betRate' }, regex: searchRegex },
        },
      },
      {
        $expr: {
          $regexMatch: {
            input: { $toString: '$betAmount' },
            regex: searchRegex,
          },
        },
      },
    ];
  }
  Bets.paginate(
    query,
    { page: page, sort: { [sortValue]: sort }, limit: limit },
    (err, result) => {
      if (err || !result)
        return res.status(404).send({ message: 'bets not found' });
      return res.send({
        success: true,
        message: 'bets record found',
        results: result,
      });
    }
  );
}

function betFunds(req, res) {
  const errors = validationResult(req);
  if (errors.errors.length !== 0) {
    return res.status(400).send({ errors: errors.errors });
  }

  User.findOne({ userId: req.decoded.userId }, (err, user) => {
    if (err || !user) {
      return res.send({ message: 'User Not Found' });
    }

    let results;
    if (req.decoded.role === '5') {
      results = {
        balance: user.balance,
        liable: user.exposure,
        credit: user.credit,
        available: user.availableBalance,
        activeBets: 3,
      };
    } else {
      results = {
        balance: 0,
        liable: user.exposure,
        credit: 0,
        available: 0,
        activeBets: 3,
      };
    }

    return res.send({ message: 'Funds Record Found', results: results });
  });
}

loginRouter.post('/placeBet', betValidator.validate('placeBet'), placeBet);
loginRouter.post('/getUserBets', getUserBets);
loginRouter.get('/betFunds', betFunds);

module.exports = { loginRouter };
