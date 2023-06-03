const express = require('express');
const CasinoGames = require('../models/casinoGames');
const SelectedCasino = require('../models/selectedCasino');

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

function getAllCasinoCategories(req, res) {
  CasinoGames.find({}, { _id: 1, category: 1 }, (err, casinoCategories) => {
    if (err || !casinoCategories || casinoCategories.length === 0) {
      return res.status(404).send({ message: 'Casino Categories Not Found' });
    }

    SelectedCasino.find({}, { _id: 1 }, (err, selectedCasino) => {
      if (err ||!selectedCasino) {
        return res.status(404).send({ message: 'Failed to retrieve casino categories' });
      }

      const selectedCategoryIds = selectedCasino.map((selected) => selected._id);
      const results = casinoCategories.map((category) => ({
        _id: category._id,
        category: category.category,
        status: selectedCategoryIds.includes(category._id) ? 1 : 0,
      }));

      return res.send({
        message: 'Casino Categories Found',
        success: true,
        results: results,
      });
    });
  });
}

async function addSelectedCasinoCategories(req, res) {
  const { casinoCategories } = req.body;

  try {
    for (const category of casinoCategories) {
      const { categoryId, status, games } = category;

      const filter = { _id: categoryId };

      if (status === 0) {
        await SelectedCasino.deleteOne(filter);
      } else {
        const selectedCasino = await SelectedCasino.findOne(filter).exec();

        if (selectedCasino) {
          const gameIdsToRemove = games
            .filter(game => game.status === 0)
            .map(game => game.id);

          selectedCasino.games = selectedCasino.games.filter(game => !gameIdsToRemove.includes(game.id));

          if (status === 2) {
            const matchingGame = await CasinoGames.findOne({
              _id: categoryId
            }).exec();

            if (matchingGame) {
              selectedCasino.games = matchingGame.games;
            }
          } else {
            const gameIdsToAdd = games
              .filter(game => game.status === 1 && !selectedCasino.games.some(existingGame => existingGame.id === game.id))
              .map(game => game.id);

            const matchingGame = await CasinoGames.findOne({
              _id: categoryId
            }).exec();

            if (matchingGame) {
              const selectedGames = matchingGame.games.filter(game => {
                const gameToUpdate = games.find(g => g.id === game.id);
                return gameToUpdate && (gameToUpdate.status === 1 || status === 2);
              });

              selectedCasino.games.push(...selectedGames.filter(game => gameIdsToAdd.includes(game.id)));
            }
          }

          await selectedCasino.save();
        } else {
          if (status === 2) {
            const matchingGame = await CasinoGames.findOne({
              _id: categoryId
            }).exec();

            if (matchingGame) {
              await SelectedCasino.create({
                _id: categoryId,
                games: matchingGame.games,
                category: categoryId
              });
            }
          } else {
            const matchingGame = await CasinoGames.findOne({
              _id: categoryId
            }).exec();

            if (matchingGame) {
              const selectedGames = matchingGame.games.filter(game => {
                const gameToUpdate = games.find(g => g.id === game.id);
                return gameToUpdate && (gameToUpdate.status === 1 || status === 2);
              });

              await SelectedCasino.create({
                _id: categoryId,
                games: selectedGames,
                category: categoryId
              });
            }
          }
        }
      }
    }

    res.send({ message: 'Selected casino categories saved successfully', success: true });
  } catch (err) {
    console.error("Error saving selected casino categories:", err);
    res.status(500).send({ message: 'Failed to save selected casino categories' });
  }
}

function getSelectedCasinoGames(req, res) {
  let categoryId = req.query.categoryId;
  SelectedCasino.find({ _id: categoryId }, (err, casinoCategories) => {
    if (err || !casinoCategories || casinoCategories.length === 0) {
      return res.status(404).send({ message: 'Casino Categories Not Found' });
    }

    const games = casinoCategories[0].games;

    return res.send({
      message: 'Selected Casino Games Found',
      success: true,
      results: games,
    });
  });
}


router.post('/addCasinoGameDetails', addCasinoGameDetails);
router.get('/getAllCasinoCategories', getAllCasinoCategories);
router.get('/getSelectedCasinoGames', getSelectedCasinoGames);
router.post('/addSelectedCasinoCategories', addSelectedCasinoCategories);

module.exports = { router };
