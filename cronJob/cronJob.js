const cron = require('node-cron');
const axios = require('axios');
const Bets = require('../app/models/bets');
const CricketMatch = require('../app/models/cricketMatches');
const User = require('../app/models/user');
const Settings = require('../app/models/settings');
const Cash = require('../app/models/deposits');
const BetsTransaction = require('../app/models/betTransactions');
let runningJob;

const cronJob1 = (req) => {
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
  userToUpdate.availableBalance -= loosingAmount;
  userToUpdate.clientPL -= loosingAmount;
  console.log('userToUpdate.clientPL', userToUpdate.clientPL);
  if (userToUpdate.exposure < 0) {
    userToUpdate.exposure = 0;
  }
  await userToUpdate.save();

  // Create and save BetsTransaction document
  let betsTransaction = new BetsTransaction({
    clientPL: userToUpdate.clientPL,
    availableBalance: userToUpdate.availableBalance,
    userId: userToUpdate.userId,
  });
  await betsTransaction.save();

  const currentUserParent = await User.findOne({
    userId: userToUpdate.createdBy,
    isDeleted: false,
  });

  if (!currentUserParent) {
    return res.status(404).send({ message: 'user not found' });
  }

  console.log('1=====>', currentUserParent.downLineShare);
  let currentUserParentCommission = betAmount * (currentUserParent.downLineShare / 100);
  console.log('currentUserParentCommission', currentUserParentCommission);
  currentUserParent.balance += currentUserParentCommission;
  currentUserParent.availableBalance += currentUserParentCommission;
  currentUserParent.clientPL -= betAmount - currentUserParentCommission;
  console.log('currentUserParentclientPL', currentUserParent.clientPL);
  if (currentUserParent.exposure < 0) {
    currentUserParent.exposure = 0;
  }
  await currentUserParent.save();

  // Create and save BetsTransaction document
  betsTransaction = new BetsTransaction({
    clientPL: currentUserParent.clientPL,
    availableBalance: currentUserParent.availableBalance,
    userId: currentUserParent.userId,
  });
  await betsTransaction.save();

  const firstParent = await User.findOne({
    userId: currentUserParent.createdBy,
    isDeleted: false,
  });

  if (!firstParent) {
    return res.status(404).send({ message: 'user not found' });
  }

  console.log('1stparent', firstParent.downLineShare);
  let firstParentCommission = firstParent.downLineShare - currentUserParent.downLineShare;
  let commission = betAmount * (firstParentCommission / 100);
  console.log('commission', commission);
  firstParent.balance += firstParentCommission;
  firstParent.availableBalance += firstParentCommission;
  let firstParentClientPL = 100 - firstParent.downLineShare;
  console.log('firstParentclientPL', firstParentClientPL);
  firstParent.clientPL -= betAmount * (firstParentClientPL / 100);
  console.log('firstParent.clientPL', firstParent.clientPL);
  if (firstParent.exposure < 0) {
    firstParent.exposure = 0;
  }
  await firstParent.save();

  // Create and save BetsTransaction document
  betsTransaction = new BetsTransaction({
    clientPL: firstParent.clientPL,
    availableBalance: firstParent.availableBalance,
    userId: firstParent.userId,
  });
  await betsTransaction.save();

  const secondParent = await User.findOne({
    userId: firstParent.createdBy,
    isDeleted: false,
  });

  if (!secondParent) {
    return res.status(404).send({ message: 'user not found' });
  }

  console.log('2secnd======', secondParent.downLineShare);
  let secondParentCommission = secondParent.downLineShare - firstParent.downLineShare;
  let secondCommission = betAmount * (secondParentCommission / 100);
  console.log('secondCommission', secondCommission);
  secondParent.balance += secondCommission;
  secondParent.availableBalance += secondCommission;
  let secondParentClientPL = 100 - secondParent.downLineShare;
  console.log('secondParentClientPL', secondParentClientPL);
  secondParent.clientPL -= betAmount * (secondParentClientPL / 100);
  console.log('second.clientPL', secondParent.clientPL);
  if (secondParent.exposure < 0) {
    secondParent.exposure = 0;
  }
  await secondParent.save();

  // Create and save BetsTransaction document
  betsTransaction = new BetsTransaction({
    clientPL: secondParent.clientPL,
    availableBalance: secondParent.availableBalance,
    userId: secondParent.userId,
  });
  await betsTransaction.save();

  const thirdParent = await User.findOne({
    userId: secondParent.createdBy,
    isDeleted: false,
  });

  if (!thirdParent) {
    return res.status(404).send({ message: 'user not found' });
  }

  console.log('3third======', thirdParent.downLineShare);
  let thirdParentCommission = thirdParent.downLineShare - secondParent.downLineShare;
  let thirdCommission = betAmount * (thirdParentCommission / 100);
  console.log('thirdCommission', thirdCommission);
  thirdParent.balance += thirdCommission;
  thirdParent.availableBalance += thirdCommission;
  let thirdParentClientPL = 100 - thirdParent.downLineShare;
  console.log('thirdParentClientPL', thirdParentClientPL);
  thirdParent.clientPL -= betAmount * (thirdParentClientPL / 100);
  console.log('thirdParent.clientPL', thirdParent.clientPL);
  if (thirdParent.exposure < 0) {
    thirdParent.exposure = 0;
  }

  await thirdParent.save();

  // Create and save BetsTransaction document
  betsTransaction = new BetsTransaction({
    clientPL: thirdParent.clientPL,
    availableBalance: thirdParent.availableBalance,
    userId: thirdParent.userId,
  });
  await betsTransaction.save();

  const fourthParent = await User.findOne({
    userId: thirdParent.createdBy,
    isDeleted: false,
  });

  if (!fourthParent) {
    return res.status(404).send({ message: 'user not found' });
  }

  console.log('5', fourthParent.downLineShare);
  await Bets.findByIdAndUpdate(bet._id, { status: 0 });
}

// async function handleLosingBet(req, bet) {
//   console.log(`Bet ${bet._id} lost.`);
//   const userId = bet.userId;
//   const loosingAmount = bet.loosingAmount;
//   const betAmount = bet.betAmount;

//   const userToUpdate = await User.findOne({
//     userId: userId,
//     isDeleted: false,
//   }).lean();
//   if (!userToUpdate) {
//     return res.status(404).send({ message: 'user not found' });
//   }

//   const currentUserParent = await User.findOne({
//     userId: userToUpdate.createdBy,
//   }).lean();
//   const firstParent = await User.findOne({
//     userId: currentUserParent.createdBy,
//   }).lean();
//   const secondParent = await User.findOne({
//     userId: firstParent.createdBy,
//   }).lean();
//   const thirdParent = await User.findOne({
//     userId: secondParent.createdBy,
//   }).lean();
//   const fourthParent = await User.findOne({
//     userId: thirdParent.createdBy,
//   }).lean();

//   console.log('currentUserParent', currentUserParent);
//   console.log('firstParent', firstParent);
//   console.log('secondParent', secondParent);
//   console.log('thirdParent', thirdParent);
//   console.log('fourthParent', fourthParent);

//   // Update user balances
//   const updateOperations = [
//     {
//       updateMany: {
//         filter: {
//           userId: {
//             $in: [
//               userToUpdate.userId,
//               currentUserParent.userId,
//               firstParent.userId,
//               secondParent.userId,
//               thirdParent.userId,
//               fourthParent.userId,
//             ],
//           },
//         },
//         update: {
//           $inc: {
//             balance: [
//               -loosingAmount,
//               betAmount * (currentUserParent.downLineShare / 100),
//               firstParent.downLineShare - currentUserParent.downLineShare,
//               secondParent.downLineShare - firstParent.downLineShare,
//               thirdParent.downLineShare - secondParent.downLineShare,
//               0,
//             ],
//             availableBalance: [
//               -loosingAmount,
//               betAmount * (currentUserParent.downLineShare / 100),
//               firstParent.downLineShare - currentUserParent.downLineShare,
//               secondParent.downLineShare - firstParent.downLineShare,
//               thirdParent.downLineShare - secondParent.downLineShare,
//               0,
//             ],
//             clientPL: [
//               -loosingAmount,
//               -(
//                 betAmount -
//                 betAmount * (currentUserParent.downLineShare / 100)
//               ),
//               -(betAmount * ((100 - firstParent.downLineShare) / 100)),
//               -(betAmount * ((100 - secondParent.downLineShare) / 100)),
//               -(betAmount * ((100 - thirdParent.downLineShare) / 100)),
//               0,
//             ],
//           },
//         },
//       },
//     },
//   ];

//   await User.bulkWrite(updateOperations);

//   // Update transactions
//   const transactionUpdates = [
//     {
//       updateMany: {
//         filter: {
//           userId: {
//             $in: [
//               userToUpdate.userId,
//               currentUserParent.userId,
//               firstParent.userId,
//               secondParent.userId,
//               thirdParent.userId,
//               fourthParent.userId,
//             ],
//           },
//         },
//         update: {
//           $set: {
//             clientPL: [
//               userToUpdate.clientPL,
//               currentUserParent.clientPL,
//               firstParent.clientPL,
//               secondParent.clientPL,
//               thirdParent.clientPL,
//               fourthParent.clientPL,
//             ],
//             availableBalance: [
//               userToUpdate.availableBalance,
//               currentUserParent.availableBalance,
//               firstParent.availableBalance,
//               secondParent.availableBalance,
//               thirdParent.availableBalance,
//               fourthParent.availableBalance,
//             ],
//           },
//         },
//       },
//     },
//   ];

//   await BetsTransaction.bulkWrite(transactionUpdates);
//   await Bets.findByIdAndUpdate(bet._id, { status: 0 });
// }

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

const cronJob2 = () => {
  cron.schedule('0 0 * * *', () => {
    updateDefaultTheme();
    updateDefaultLoginPage();
  });
};

module.exports = { cronJob1, cronJob2 };

