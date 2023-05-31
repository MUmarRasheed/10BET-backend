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

    const gameList = response.data;

    const groupedGames = gameList.reduce((groups, game) => {
      const category = game.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(game);
      return groups;
    }, {});

    const bulkOps = [];

    for (const category in groupedGames) {
      const games = groupedGames[category];

      const bulkInsertOps = games.map((game) => ({
        insertOne: {
          document: {
            id: game.id,
            name: game.name,
            type: game.type,
            subcategory: game.subcategory,
            details: JSON.stringify(game.details),
            new: game.new,
            system: game.system,
            position: game.position,
            category: game.category,
            licence: game.licence,
            plays: game.plays,
            rtp: game.rtp,
            wagering: game.wagering,
            gamename: game.gamename,
            report: game.report,
            mobile: game.mobile,
            additional: game.additional,
            id_hash: game.id_hash,
            id_parent: game.id_parent,
            id_hash_parent: game.id_hash_parent,
            freerounds_supported: game.freerounds_supported,
            featurebuy_supported: game.featurebuy_supported,
            has_jackpot: game.has_jackpot,
            provider: game.provider,
            provider_name: game.provider_name,
            play_for_fun_supported: game.play_for_fun_supported,
            image: game.image,
            image_preview: game.image_preview,
            image_filled: game.image_filled,
            image_portrait: game.image_portrait,
            image_square: game.image_square,
            image_background: game.image_background,
            image_bw: game.image_bw,
          },
        },
      }));

      const bulkWriteResult = await CasinoGames.bulkWrite(bulkInsertOps);
      bulkOps.push(bulkWriteResult);
    }

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
