const LOCAL_HOST_PORT = 4000;
var express = require('express');
const axios = require('axios');
require('dotenv').config();
var app = express();

app.get('/', async function (req, res) {
   const data = await getGoogleResponse("Hello there")
   console.log(data);
   res.send(data.items);
})

var server = app.listen(LOCAL_HOST_PORT, function () {

    var port = server.address().port   
   console.log("Example app listening at http://localhost:%s", port)
})


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
    let retData = ""
    await axios.get(`https://www.googleapis.com/customsearch/v1?cx=${process.env.SEARCH_NUMBER}&key=${process.env.SEARCH_API}&q=${text}`, {
            headers: {
                'accept-encoding': '*'
            }})
                .then(response => {
                    retData = response.data
                })
                .catch(error => {
                    console.log(process.env.SEARCH_API);
                    retData = "Error: " + error
                });
    return retData
}