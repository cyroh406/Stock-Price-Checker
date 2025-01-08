const Stock = require('../models/Stock');
const axios = require('axios');
const crypto = require('crypto');

const hashIP = (ip) => {
  return crypto
    .createHash('sha256')
    .update(ip + process.env.IP_SALT)
    .digest('hex');
};

module.exports = function(app) {
  app.get('/api/stock-prices', async (req, res) => {
    try {
      const { stock, like } = req.query;
      const ip = req.ip;
      const hashedIP = hashIP(ip);

      async function getStockData(symbol) {
        try {
          const response = await axios.get(
            `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`
          );
          return response.data;
        } catch (error) {
          throw new Error(`Unable to fetch stock price for ${symbol}`);
        }
      }

      // Handle multiple stocks
      if (Array.isArray(stock)) {
        const [stock1, stock2] = stock;
        const [data1, data2] = await Promise.all([
          getStockData(stock1),
          getStockData(stock2)
        ]);

        let [stockDoc1, stockDoc2] = await Promise.all([
          Stock.findOne({ symbol: stock1.toUpperCase() }),
          Stock.findOne({ symbol: stock2.toUpperCase() })
        ]);

        if (!stockDoc1) {
          stockDoc1 = new Stock({ symbol: stock1.toUpperCase() });
        }
        if (!stockDoc2) {
          stockDoc2 = new Stock({ symbol: stock2.toUpperCase() });
        }

        if (like === 'true') {
          if (!stockDoc1.likes.includes(hashedIP)) {
            stockDoc1.likes.push(hashedIP);
          }
          if (!stockDoc2.likes.includes(hashedIP)) {
            stockDoc2.likes.push(hashedIP);
          }
          await Promise.all([stockDoc1.save(), stockDoc2.save()]);
        }

        return res.json({
          stockData: [
            {
              stock: stockDoc1.symbol,
              price: data1.latestPrice,
              rel_likes: stockDoc1.likes.length - stockDoc2.likes.length
            },
            {
              stock: stockDoc2.symbol,
              price: data2.latestPrice,
              rel_likes: stockDoc2.likes.length - stockDoc1.likes.length
            }
          ]
        });
      }

      // Handle single stock
      const data = await getStockData(stock);
      let stockDoc = await Stock.findOne({ symbol: stock.toUpperCase() });

      if (!stockDoc) {
        stockDoc = new Stock({ symbol: stock.toUpperCase() });
      }

      if (like === 'true') {
        if (!stockDoc.likes.includes(hashedIP)) {
          stockDoc.likes.push(hashedIP);
          await stockDoc.save();
        }
      }

      return res.json({
        stockData: {
          stock: stockDoc.symbol,
          price: data.latestPrice,
          likes: stockDoc.likes.length
        }
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });
};
