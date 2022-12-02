const LOCAL_HOST_PORT = 4000;
var express = require("express");
const axios = require("axios");
extractor = require("unfluff");
const { Configuration, OpenAIApi } = require("openai");
require("dotenv").config();
var app = express();

app.get("/", async function (req, res) {
  const data = await extractTextFromTheUrl(
    "https://www.healthline.com/health/becoming-vegetarian"
  );

  res.send(data);
});

var server = app.listen(LOCAL_HOST_PORT, function () {
  var port = server.address().port;
  console.log("Example app listening at http://localhost:%s", port);
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
