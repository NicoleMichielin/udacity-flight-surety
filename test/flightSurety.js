var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const FlightSuretyData = artifacts.require("FlightSuretyData");
const FlightSuretyApp = artifacts.require("FlightSuretyApp");

contract('Flight Surety Tests', async (accounts) => {

  var config;
  let flightSuretyData;
  let flightSuretyApp;
  const STATUS_CODE_LATE_AIRLINE = 20;

  before('setup contract', async () => {
    config = await Test.Config(accounts);
    flightSuretyData = await FlightSuretyData.deployed();
    flightSuretyApp = await FlightSuretyApp.deployed();
    //await config.flightSuretyData.setOperatingStatus(true, config.owner);

    //await config.flightSuretyData.authorizeContract(config.flightSuretyApp.address);
    //await config.flightSuretyData.registerAdmin(config.firstAirline); // first airline
    //await config.flightSuretyApp.registerAirline(config.firstAirline, { from: config.owner });
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it('should authorize FlightSuretyApp contract', async () => {
    const isAuthorized = await flightSuretyData.isAuthorized(flightSuretyApp.address);
    assert.equal(isAuthorized, true, "FlightSuretyApp is not authorized");
});

  it(`1) (multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`2)(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`3) (multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

    // ARRANGE: Set up the parameters for the registerAirline function
    let appUserAddress = accounts[0];  // Owner account, che registra la compagnia aerea
    let airlineAddress = accounts[1];  // Airline to be registered
    let airlineName = "First Airline"; // Name of the airline

    // Register the first airline if not already registered
    await config.flightSuretyData.registerAirline(appUserAddress, airlineAddress, airlineName, {from: accounts[0]});
    
    // Fund the airline
    let fundAmount = web3.utils.toWei("10", "ether");
    await config.flightSuretyData.fundAirline(accounts[0]);

    // Ensure that access is allowed for Contract Owner account
    let accessDenied = false;
    try 
    {
        // ACT: Attempt to set operating status
        await config.flightSuretyData.setOperatingStatus(false, accounts[0]);
    }
    catch(e) {
        accessDenied = true;
    }

    // ASSERT: Check that access was not denied
    assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
});

it('4) (Flight) can be registered', async function () {
    let flightName = 'AL123';
    await flightSuretyApp.registerFlight(flightName, {from: accounts[1]});

    let flightData = await flightSuretyApp.getFlightInfo(flightName);
    assert.equal(flightData[0], true, "isRegistered not correctly initialised");
    assert.equal(flightData[3], accounts[1], "airline not correctly initialised");    
});

it('(authorize test 4) should authorize FlightSuretyApp contract', async function () {
    let authorized = await flightSuretyData.isAuthorized(flightSuretyApp.address);
    assert.equal(authorized, true, "FlightSuretyApp is not authorized");
});


it(`5) (multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

    // Controlla se l'airline è già registrata
    let isRegistered = await config.flightSuretyData.isAirlineRegistered(accounts[1]);
    if (!isRegistered) {
        // Registra l'airline se non è già registrata
        await config.flightSuretyData.registerAirline(config.owner, accounts[1], "Airline 2", {from: config.owner});
    }

    // Fondi l'airline per renderla operativa
    let fundAmount = web3.utils.toWei("10", "ether");
    await config.flightSuretyData.fund({from: accounts[1], value: fundAmount});

    // Imposta lo stato operativo su false usando accounts[1]
    await config.flightSuretyData.setOperatingStatus(false, accounts[1]);

    let reverted = false;
    /*try {
        // Tentativo di chiamata di una funzione che richiede isOperational == true
        await config.flightSuretyApp.setTestingMode(true);
    }
    catch(e) {
        reverted = true;
    }*/
    assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

    // Ripristina lo stato operativo per altri test
    await config.flightSuretyData.setOperatingStatus(true, accounts[1]);
});

  it('6) (airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isAirline.call(newAirline); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

  });


it(`7) (Flight - registration) cannot be address that is not funded and accepted airline`, async function () {
    let flightName = 'AL456';
    let registrationReverted = false;
    try 
    {
        await config.flightSuretyApp.registerFlight(flightName, {from: config.testAddresses[5]})
    }
    catch(e) {
        registrationReverted = true;
    }

    assert.equal(registrationReverted, true,"Flight registration was not reverted");
});

  it(`8) (passenger) cannot insure non-regitered flight`, async function () {            
    let flightName = 'AL789';
    let expectedPayOutAmount = web3.utils.toWei('0','ether');
    let payInAmount = web3.utils.toWei('1','ether');
    let dataContractValueBegin = await web3.eth.getBalance(config.flightSuretyData.address);
    //    console.log(dataContractValueBegin);
    let insuranceDenied = false;
       
    //Register flight
    //await config.flightSuretyApp.registerFlight(flightName, {from: config.testAddresses[1]});

    try {
        await config.flightSuretyApp.buyInsuranceApp(flightName, {from: config.testAddresses[5], value: payInAmount, gasPrice: 0, baseFeePerGas: 8, maxFeePerGas: 8}) 
       }
    catch(e) {
        insuranceDenied = true;
    }
  
    let dataContractValueEnd = await web3.eth.getBalance(config.flightSuretyData.address);
    //    console.log(dataContractValueEnd);
    let payOutAmount = await config.flightSuretyData.getPayOutAmount(config.testAddresses[5], flightName);
       
    assert.equal(insuranceDenied, true, "insurance attempt was not reverted despite flight not being registered chosen")
    assert.equal(payOutAmount.toString(), expectedPayOutAmount, "PayOutAmount registered despite unregistered flight");
    assert.equal(dataContractValueEnd - dataContractValueBegin, 0, "Ether transferred to contract despite unregistered flight");
   });

   it(`9) Airline voting: Fifth airline cannot be registered with a double vote by same airline`, async function () {
    var votingDenied = false; 
    try {
        await config.flightSuretyApp.voteAirlineInApp(config.testAddresses[4], { from: config.testAddresses[1] }); 
    }
    catch(e) {
        var votingDenied = true;
    }
    
    assert.equal(votingDenied, true, "Airline 4 could be registered without a vote"); 
});



it(`10) Airline voting: Another vote (3rd of 4) for fifth airline runs into error that voting is closed`, async function () {
    var votingsuccess = true;
    try {
        await config.flightSuretyApp.voteAirlineInApp(config.testAddresses[4], { from: config.testAddresses[3] })
    }
    catch(e) {
        var votingsuccess = false;
    } 

    assert.equal(votingsuccess, false, "Third out of four votes did not return error due to voting being closed"); 
});

it(`11) Buy Insurance: Passenger cannot insure flight that is not registered`, async function () {            
    let flightName = 'AL789';
    let expectedPayOutAmount = web3.utils.toWei('0','ether');
    let payInAmount = web3.utils.toWei('1','ether');
    let dataContractValueBegin = await web3.eth.getBalance(config.flightSuretyData.address);
    //    console.log(dataContractValueBegin);
    let insuranceDenied = false;
       
    //Register flight
    //await config.flightSuretyApp.registerFlight(flightName, {from: config.testAddresses[1]});

    try {
        await config.flightSuretyApp.buyInsuranceApp(flightName, {from: config.testAddresses[5], value: payInAmount, gasPrice: 0, baseFeePerGas: 8, maxFeePerGas: 8}) 
       }
    catch(e) {
        insuranceDenied = true;
    }
  
    let dataContractValueEnd = await web3.eth.getBalance(config.flightSuretyData.address);
    //    console.log(dataContractValueEnd);
    let payOutAmount = await config.flightSuretyData.getPayOutAmount(config.testAddresses[5], flightName);
       
    assert.equal(insuranceDenied, true, "insurance attempt was not reverted despite flight not being registered chosen")
    assert.equal(payOutAmount.toString(), expectedPayOutAmount, "PayOutAmount registered despite unregistered flight");
    assert.equal(dataContractValueEnd - dataContractValueBegin, 0, "Ether transferred to contract despite unregistered flight");
   });

});

