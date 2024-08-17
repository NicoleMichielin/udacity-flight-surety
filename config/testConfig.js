
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');

var Config = async function(accounts) {
    
    // These test addresses are useful when you need to add
    // multiple users in test scripts
    let testAddresses = [
        "0x0fc66b02fbc4851f3cfbaeba23656e930413a773",
        "0x97fb2cc1650836c26fce9f65c1fa0595a2f3e517",
        "0x1e5bd1d13e33a380a20a959edd58c6967cd400bd",
        "0x19de3c4c642d2ea56ed3f4f0d83316a3a51ddc52",
        "0x99ddbf7d82773d5f8efc968afb8fd507e501637e",
        "0x9f09c5442038b7795a857e71c0863fb0c9d3a31c",
        "0x87b8a3438eb9c60c0313a6a3358f06a12606ab69",
        "0x52edce91676dfcd66e856b1ea195d046a98ea1b3",
        "0xb9416bebec10b230e21b1323968ce90188d2b374",
        "0x07836f0264e97a36b6f0a2ff2d7add32f876ea10",
    ];

    let flightSuretyData = await FlightSuretyData.new();
    let flightSuretyApp = await FlightSuretyApp.new(flightSuretyData.address);

    
    return {
        owner: accounts[0],
        firstAirline: accounts[1],
        weiMultiple: (new BigNumber(10)).pow(18),
        testAddresses: testAddresses,
        flightSuretyData: flightSuretyData,
        flightSuretyApp: flightSuretyApp
    }
}

module.exports = {
    Config: Config
};