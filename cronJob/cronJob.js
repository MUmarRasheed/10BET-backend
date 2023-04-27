const cron = require('node-cron');
const axios = require('axios');
const Bets = require('../app/models/bets');
const CricketMatch = require('../app/models/cricketMatches');

let runningJob;
// Run the cron job every 5 seconds
const cronJob = () => {
  runningJob = cron.schedule('*/5 * * * * *', async () => {
    // Check match status and update bets accordingly
    const endedMatches = await getEndedMatches();
    for (const match of endedMatches) {
      const matchId = match.id;
      const bets = await Bets.find({ sportsId: 1, matchId });
      console.log('bets', bets);
      for (const bet of bets) {
        console.log('in here');
        if (bet.team === match.winningTeam) {
          // Update bet status to 'win'
          await Bets.findByIdAndUpdate(bet._id, { status: 'win' });
          console.log(`Bet ${bet._id} won!`);
        } else {
          // Update bet status to 'lose'
          await Bets.findByIdAndUpdate(bet._id, { status: 'lose' });
          console.log(`Bet ${bet._id} lost.`);
        }
      }
    }
    if (endedMatches.length === 1) {
      console.log('No more ended matches, stopping cron job');
      runningJob.stop();
    }
  });
};

async function getAllBets(req, res) {
  try {
    const allBets = await Bets.find({});
    return allBets;
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function getEndedMatches() {
  try {
    sportsId = 1;
    const endedMatches = await CricketMatch.find({
      sportsId,
      matchEnded: true,
    });
    console.log('endedmatches', endedMatches);
    // Stop the cron job if there are no more ended matches
    return endedMatches;
  } catch (err) {
    console.error(err);
    return [];
  }
}

function handleWinningBet(bet) {
  console.log(`Bet ${bet._id} won!`);
  // TODO: Handle winning bet logic
}

function handleLosingBet(bet) {
  console.log(`Bet ${bet._id} lost.`);
  // TODO: Handle losing bet logic
}

function handlePendingBet(bet) {
  console.log(`Bet ${bet._id} is pending.`);
  // TODO: Handle pending bet logic
}

module.exports = cronJob;
