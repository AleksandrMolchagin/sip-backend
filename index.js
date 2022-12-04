const LOCAL_HOST_PORT = 4000;
const webSocketsServerPort = 8000;

const webSocketServer = require('websocket').server;
const http = require('http');
var express = require("express");
const axios = require("axios");
extractor = require("unfluff");
const { Configuration, OpenAIApi } = require("openai");
require("dotenv").config();
var app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


// Cors is a library that let us make cross-origin requests
// We need to limit the origins (websites) that can make requests to our API
// https://www.npmjs.com/package/cors
var cors = require("cors");
const { get } = require("http");
const { response } = require("express");
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


/**
 *
 * This request will
 * 1. Get the response from google search engine
 * 2. Get possible classification of the question from openai
 * 3. Retrieves full articles from the urls
 * 4. Classifies the articles based on the classification from openai
 * 
 */
app.post('/getClassifiedResults', async function (req, res) {
  const query = req.body.query
  const userID = req.body.userID
  console.log(query)
  if (query === undefined || query === "") {
    res.status(400).send("Query is empty");
    return
  } 
  const googleResults = await getGoogleResponse(query);
  const categories = await identifyQuestionsPossibleAnswers(query);
  const finalResults = []
  for (let i = 0; i < googleResults.items.length; i++) {
    item = googleResults.items[i];
    let article = item.snippet
    try{
      article = await extractTextFromTheUrl(item.link);
    } catch (e) {
      console.log(e);
      article = item.snippet;
    }
    let currentProgress = i/googleResults.items.length * 100 + 10;
    console.log("Progress: " + currentProgress + "%")
    wsServer.SendToUser(userID, { type: 'progress', data: currentProgress });
    if (article === undefined || article === "") {
      continue;
    }
    let openData = `Please identify if the following source supports either "${categories[0]}" or "${categories[1]}" and give the explanation (FOLLOW THE GIVEN FORMAT:  1) Answer: "${categories[0]}" or "${categories[1]}" 2) Explanation: ___ ): "${article.substring(0, 2000)}"`;
    let response = await getOpenAiResponse(openData, temperature = 0.1);
    console.log(response)
    let answer = response.split("Answer")[1].split("Explanation:")[0].replace(": ", "").replaceAll(/\s/g,'')
    let explanation = response.split("Explanation: ")[1]
    finalResults.push(
      {
        title: item.title,
        description: item.snippet,
        url: item.link,
        ai_explanation: explanation,
        classification: answer
      }
    )
  }
  res.send({categories: categories, finalResults: finalResults});
});

/**
 *
 * This request wll return the response from google search engine
 * @req {string} query
 * @returns {object} response
 */
app.get("/getGoogleResults", async function (req, res) {
  const query = req.query.query;
  const googleResponse = await getGoogleResponse(query);
  if (googleResponse === 429) {
    res.status(429).send("Error: Too many requests");
  }
  res.send(googleResponse.items);
});



async function identifyQuestionsPossibleAnswers(question){

  data = `Please numerate 2 common opposite viewpoints (in one word !important) can be given for the following query: "${question}"`;
  let response = await getOpenAiResponse(data, temperature = 0);

  let proResult = response.split("2")[0].replace("1. ", "").replaceAll(/\s/g,'')
  let conResult = response.split("2")[1].replace(". ", "").replaceAll(/\s/g,'')
  console.log("Responses can be classified in the following categories: " + proResult + " / " + conResult);

  return [proResult, conResult]
}


/**
 * This function will get the response from google search engine based on the query
 *
 * @param {string} text
 * @returns {object} response
 */
async function getGoogleResponse(text) {
  if (process.env.SEARCH_API2 === undefined || process.env.SEARCH_API2 === "") {
    throw new Error("Environment variables are not set");
  }
  let retData = "";
  await axios
    .get(
      `https://www.googleapis.com/customsearch/v1?cx=${process.env.SEARCH_NUMBER2}&key=${process.env.SEARCH_API2}&q=${text}`,
      {
        headers: {
          "accept-encoding": "*",
        },
      }
    )
    .then((response) => {
      retData = response.data;
      console.log("Results are ready.")
    })
    .catch((error) => {
      retData = "Error: " + error;
      console.log(retData)
      retData = 429;
    });
  return retData;
}

/**
 *  This function will get the response from openai based on the query
 *
 * @param {*} text
 * @returns response
 */
async function getOpenAiResponse(text, temperature) {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API,
  });
  const openai = new OpenAIApi(configuration);

  const response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: text,
    temperature: temperature,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    best_of: 1,
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
    })
    .catch((error) => {
      console.log(error);
    });

  return data.text;
}




const webSocketOnlineServer = http.createServer()

webSocketOnlineServer.listen(4500
  , () => {
    console.log('      🫡  Web Socket Server ready at: http://localhost:4500')    
    });

const wsServer = new webSocketServer({
  httpServer: webSocketOnlineServer
});

const clients = {};

let LASTUSERID = 0;

wsServer.on('error', (err) => console.log('uncaught ERROR: ', err));
wsServer.on('request', function (request) {
  console.log('Connection from origin ' + request.origin + '.');
  //get bearer token from request
  console.log((new Date()) + ' Recieved a new connection from origin ' + request.origin + '.');

  let connection = null
  let account = null;

  connection = request.accept(null, request.origin);
  
  const userID = LASTUSERID++;
  clients[userID] = connection;
  console.log('connected: ' + userID + ' in ' + Object.getOwnPropertyNames(clients));


  wsServer.SendToUser(userID, { type: 'connected', data: userID });

});

wsServer.SendToUser = function (userID, message) {
  if (clients[userID]) {
    console.log("Sending data (" + message.type + ")  to user: " + userID);
    clients[userID].send(JSON.stringify(message));
  }
}