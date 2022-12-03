const LOCAL_HOST_PORT = 4000;
var express = require("express");
const axios = require("axios");
extractor = require("unfluff");
const { Configuration, OpenAIApi } = require("openai");
require("dotenv").config();
var app = express();

// Cors is a library that let us make cross-origin requests
// We need to limit the origins (websites) that can make requests to our API
// https://www.npmjs.com/package/cors
var cors = require("cors");
var whitelist = ['http://localhost:3000', "http://localhost:3001" /** other domains if any */]
var corsOptions = {
  credentials: true,
  origin: function ( origin, callback ) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(null, true)
      //callback(new Error('Not allowed by CORS'))
    }
  }
}
app.use(cors(corsOptions)); // !! SHOULD BE CHANGE TO ONLY ALLOW OUR FRONTEND !!



app.get("/", async function (req, res) {
  res.send("Welcome to the AI search engine server. What are you doing here?");
});

var server = app.listen(LOCAL_HOST_PORT, function () {
  var port = server.address().port;
  console.log("Example app listening at http://localhost:%s", port);
});


app.get("/getGoogleResults", async function (req, res) {
  const query = req.query.query;
  const googleResponse = await getGoogleResponse(query);
  res.send(googleResponse.items);
});



/**
 * This function will get the response from google search engine based on the query
 *
 * @param {string} text
 * @returns {object} response
 */
async function getGoogleResponse(text) {
  if (process.env.SEARCH_API === undefined || process.env.SEARCH_API === "") {
    throw new Error("Environment variables are not set");
  }
  let retData = "";
  await axios
    .get(
      `https://www.googleapis.com/customsearch/v1?cx=${process.env.SEARCH_NUMBER}&key=${process.env.SEARCH_API}&q=${text}`,
      {
        headers: {
          "accept-encoding": "*",
        },
      }
    )
    .then((response) => {
      retData = response.data;
    })
    .catch((error) => {
      console.log(process.env.SEARCH_API);
      retData = "Error: " + error;
    });
  return retData;
}

/**
 *  This function will get the response from openai based on the query
 *
 * @param {*} text
 * @returns response
 */
async function getOpenAiResponse(text) {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API,
  });
  const openai = new OpenAIApi(configuration);

  const response = await openai.createCompletion({
    model: "text-davinci-002",
    prompt: text,
    temperature: 0.7,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });

  const data = response.data.choices[0].text;

  return data;
}

/**
 * 
 * A function that extracts text from a url 
 *
 * @param {*} url 
 * @returns 
 */
async function extractTextFromTheUrl(url) {
  let data = "";
  await axios
    .get(url, {
      headers: {
        "accept-encoding": "*",
      },
    })
    .then((response) => {
      data = extractor(response.data);
      console.log(response);
    })
    .catch((error) => {
      console.log(error);
    });

  console.log(data);
  return data.text;
}
