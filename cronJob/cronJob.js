const cron = require('node-cron');
const axios = require('axios');
const Bets = require('../app/models/bets');
const CricketMatch = require('../app/models/cricketMatches');
const User = require('../app/models/user');
const Settings = require('../app/models/settings');
const Cash = require('../app/models/deposits');
const BetsTransaction = require('../app/models/betTransactions');
const { getParents } = require('../app/routes/bets')
let runningJob;

const checkBetStatus = (req) => {
  runningJob = cron.schedule('*/5 * * * * *', async () => {
    try {
      const endedMatches = await getEndedMatches();
      console.log('endedMatches', endedMatches);
      for (const match of endedMatches) {
        const matchId = match.id;
        const sportsId = match.sportsId;
        const bets = await getAllBets(sportsId, matchId); // Pass the arguments separately
        console.log('bets', bets);

        for (const bet of bets) {
          console.log('bet', bets);
          console.log('bet.team', bet.runner);
          if (bet.runner === match.winningTeam) {
            // await Bets.findByIdAndUpdate(bet._id, { status: 1 });
            console.log(`Bet ${bet._id} won!`);
            handleWinningBet(bet);
          } else {
            console.log(`Bet ${bet._id} lost.`);
            handleLosingBet(req, bet);
          }
        }
      }

      if (endedMatches.length >= 1) {
        console.log('Stopping cron job');
        runningJob.stop();
      }
    } catch (err) {
      console.error(err);
    }
  });
};

async function getAllBets(marketId, matchId) {
  try {
    // let userId = req.decoded.userId
    const allBets = await Bets.find({ marketId, matchId, status: 1 });
    return allBets;
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function getEndedMatches() {
  try {
    sportsId = '38d3bc03-8a59-4551-85cf-a35298f75124';
    id = '64458338-704e-4d0f-b4fa-6af920ab467d';
    const endedMatches = await CricketMatch.find({
      sportsId,
      id,
      matchEnded: true,
    });
    return endedMatches;
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function handleLosingBet(req, bet) {
  console.log(`Bet ${bet._id} lost.`);
  const userId = bet.userId;
  const loosingAmount = bet.loosingAmount;
  const betAmount = bet.betAmount;
  const userToUpdate = await User.findOne({
    userId: userId,
    isDeleted: false,
  });

  if (!userToUpdate) {
    return res.status(404).send({ message: 'user not found' });
  }

  userToUpdate.balance -= loosingAmount;
  userToUpdate.clientPL -= loosingAmount;
  userToUpdate.exposure += loosingAmount;
  await userToUpdate.save();

  // Create and save BetsTransaction document
  let betsTransaction = new BetsTransaction({
    clientPL: userToUpdate.clientPL,
    availableBalance: userToUpdate.availableBalance,
    userId: userToUpdate.userId,
  });
  await betsTransaction.save();

  const parentUserIds = await getParents(userId);
  
  const parentUser = await User.find({
    userId: {
      $in: [...parentUserIds]
    },
    isDeleted: false
  }).sort({role: -1});

  if (!parentUser) {
    return res.status(404).send({ message: 'user not found' });
  }

  const remainingAmount = bet.winningAmount;
  const TotalLoosingAmount   = bet.loosingAmount;

    let prev = 0;
    parentUser.forEach(user => {
      let current = user.downLineShare
      user["commission"] = current - prev
      prev = current
    });
    parentUser.forEach(user => {
      user.exposure += (user.commission / 100 ) * remainingAmount
      user.availableBalance += ((user.commission / 100 ) * remainingAmount) + ((user.commission / 100 ) * TotalLoosingAmount)
      user.balance  += (user.commission / 100 ) * TotalLoosingAmount
      user.clientPL -= user.downLineShare != 100 ? ((100 - user.downLineShare) / 100 ) * TotalLoosingAmount : 0
      user.save()
    });
  await Bets.findByIdAndUpdate(bet._id, { status: 0 });
}

async function handleWinningBet(req, bet) {
  console.log(`Bet ${bet._id} lost.`);

  const userId = bet.userId;
  const loosingAmount = bet.loosingAmount;
  const betAmount = bet.betAmount;
  const userToUpdate = await User.findOne({
    userId: userId,
    isDeleted: false,
  });

  if (!userToUpdate) {
    return res.status(404).send({ message: 'user not found' });
  }
  const remainingAmount       = (bet.winningAmount / 100) * 98;
  const totalRemainingAmount  = bet.winningAmount;
  const TotalLoosingAmount    = bet.loosingAmount;

  userToUpdate.balance          += TotalLoosingAmount + remainingAmount;
  userToUpdate.clientPL         += TotalLoosingAmount + remainingAmount;
  userToUpdate.availableBalance += TotalLoosingAmount + remainingAmount;
  userToUpdate.exposure         += TotalLoosingAmount;
  await userToUpdate.save();

  console.log('  userToUpdate.clientPL',   userToUpdate.clientPL);

  // Create and save BetsTransaction document
  let betsTransaction = new BetsTransaction({
    clientPL: userToUpdate.clientPL,
    availableBalance: userToUpdate.availableBalance,
    userId: userToUpdate.userId,
  });
  await betsTransaction.save();

  const parentUserIds = await getParents(userId);
  
  const parentUser = await User.find({
    userId: {
      $in: [...parentUserIds]
    },
    isDeleted: false
  }).sort({role: -1});

  if (!parentUser) {
    return res.status(404).send({ message: 'user not found' });
  }
    let prev = 0;
    
    parentUser.forEach(user => {
      let current = user.downLineShare
      user["commission"] = current - prev
      prev = current
    });

    parentUser.forEach(user => {
      user.exposure += (user.commission / 100 ) * totalRemainingAmount;
      user.balance  -= (user.commission / 100 ) * remainingAmount;
      user.clientPL += user.downLineShare != 100 ? ((100 - user.downLineShare) / 100 ) * remainingAmount : 0
      user.save()
    });
  await Bets.findByIdAndUpdate(bet._id, { status: 0 });
}

function handlePendingBet(bet) {
  console.log(`Bet ${bet._id} is pending.`);
}

const updateDefaultTheme = async () => {
  try {
    const settings = await Settings.findOne({_id: "645e27d8ba117017eb29bad8" });
    const currentTheme = settings.defaultThemeName;
    console.log('current theme', currentTheme);
    let updatedTheme;

    if (currentTheme === 'light-theme') {
      updatedTheme = 'dark-theme';
    } else if (currentTheme === 'dark-theme') {
      updatedTheme = 'grey-theme';
    } else {
      updatedTheme = 'light-theme';
    }

    // Update the default theme
    settings.defaultThemeName = updatedTheme;
    await settings.save();
    console.log('Default theme updated:', settings.defaultThemeName);
  } catch (err) {
    console.error(err);
  }
};

const updateDefaultLoginPage = async () => {
  try {
    const settings = await Settings.findOne({_id: "642bff9fc9bb7f4cb5b35d0a" });
    const currentLoginPage = settings.defaultLoginPage;
    console.log('current LoginPage', currentLoginPage);
    let updatedLoginPage;

    if (currentLoginPage === 'login-page-one') {
      updatedLoginPage = 'login-page-two';
    } else if (currentLoginPage === 'login-page-two') {
      updatedLoginPage = 'login-page-three';
    } else {
      updatedLoginPage = 'login-page-one';
    }

    // Update the default login page
    settings.defaultLoginPage = updatedLoginPage;
    await settings.save();
    console.log('Default loginPage updated:', settings.defaultLoginPage);
  } catch (err) {
    console.error(err);
  }
};

const themeCronJob = () => {
  cron.schedule('0 0 * * *', () => {
    updateDefaultTheme();
    updateDefaultLoginPage();
  });
};

module.exports = { checkBetStatus, themeCronJob };

