const express = require('express');
const CasinoGames = require('../models/casinoGames');
const router = express.Router();
const axios = require('axios');

async function addCasinoGameDetails(req, res) {
  try {
    const response = await axios.post(
      'https://stage.game-program.com/api/seamless/provider',
      {
        api_password: '6w9GNrsxZsHBeC795N',
        api_login: '1obet_mc_s',
        method: 'getGameList',
        show_additional: true,
        show_systems: 1,
        currency: 'EUR',
      }
    );

    console.log('Response:', response.data);
    const gameList = response.data.response;
    const bulkOps = gameList.map((game) => ({
      updateOne: {
        filter: { category: game.category },
        update: { $push: { games: { ...game, details: JSON.parse(game.details) } } },
        upsert: true,
      },
    }));

    await CasinoGames.bulkWrite(bulkOps);
    res.send({ success: true, message: 'Casino games added successfully' });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send({ success: false, message: 'Failed to add casino games' });
  }
}

router.post('/addCasinoGameDetails', addCasinoGameDetails);

module.exports = { router };
