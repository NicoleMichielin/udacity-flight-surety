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


it(`8) (Passenger) Can buy insurance`, async function () {
    let flightName = 'AL123';
    let flightID = web3.utils.asciiToHex(flightName); // Converti il nome del volo in bytes32
    let dataContractValueBegin = await web3.eth.getBalance(config.flightSuretyData.address);
    let expectedPayOutAmount = web3.utils.toWei('1.5', 'ether');
    let payInAmount = web3.utils.toWei('1', 'ether');

    // Registrazione del volo nel contratto FlightSuretyApp
    let flight = await config.FlightSuretyApp.registerFlight(flightName, { from: config.testAddresses[1] });
    assert.equals(flight, "flight registered");

    // Verifica che il volo sia stato registrato nel contratto FlightSuretyApp
    let flightData = await config.flightSuretyApp.getFlightInfo(flightName);
    assert.equal(flightData[0], true, "Flight not registered in FlightSuretyApp");

    // Assicurati che il volo sia effettivamente registrato nel contratto FlightSuretyData
    let flightRegistered = await config.flightSuretyData.flights(flightID);
    assert.equal(flightRegistered.isRegistered, true, "Flight not registered in FlightSuretyData");

    // Acquisto dell'assicurazione
    await config.flightSuretyApp.buyInsuranceApp(flightName, { from: config.testAddresses[5], value: payInAmount, gasPrice: 0 });

    // Verifica che il contratto abbia ricevuto la giusta quantità di fondi
    let dataContractValueEnd = await web3.eth.getBalance(config.flightSuretyData.address);
    assert.equal(web3.utils.toBN(dataContractValueEnd).sub(web3.utils.toBN(dataContractValueBegin)).toString(), payInAmount, "Not the right amount received in contract.");

    // Verifica l'importo di pagamento previsto
    let payOutAmount = await config.flightSuretyData.getPayOutAmount(config.testAddresses[5], flightName);
    assert.equal(payOutAmount.toString(), expectedPayOutAmount, "PayOutAmount not correct");
});

  it(`9) (passenger) cannot insure non-regitered flight`, async function () {            
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












  /*it(`1a) (multiparty) direct call to data contract is denied`, async function () {

    let accessDenied = false;
    try {
        let status = await config.flightSuretyData.isOperational.call({from: config.testAddresses[1]}); //Different account to owner bc is set as authorized caller in coonstrcutor
    }
    catch(e) {
        accessDenied = true;
    }
    assert.equal(accessDenied, true, "Data contract function isOperational could be accessed directly");
  });


  it(`1b) (multiparty) call through App contract is granted and  correct initial isOperational() value is`, async function () {

    // Get operating status
    let status = await config.flightSuretyApp.isOperationalApp.call();
    assert.equal(status, true, "Incorrect initial operating status value");
  });


  it(`2) First 4 airlines can be registered without voting`, async function () {
    //register airlines
    await config.flightSuretyApp.registerAirlineApp(config.testAddresses[1], "Airline 1", { from: config.testAddresses[0] });      
    await config.flightSuretyApp.registerAirlineApp(config.testAddresses[2], "Airline 2", { from: config.testAddresses[1] });
    await config.flightSuretyApp.registerAirlineApp(config.testAddresses[3], "Airline 3", { from: config.testAddresses[2] });
    // As Contract owner is first Airline these three are enough
    
    let successA1 = await config.flightSuretyData.isAcceptedAirline(config.testAddresses[1]);
    let successA2 = await config.flightSuretyData.isAcceptedAirline(config.testAddresses[2]); 
    let successA3 = await config.flightSuretyData.isAcceptedAirline(config.testAddresses[3]);  

    assert.equal(successA1, true, "Airline 1 could not be registered");
    assert.equal(successA2, true, "Airline 2 could not be registered");
    assert.equal(successA3, true, "Airline 3 could not be registered");
    });
    

    it(`3) Fifth airline cannot be registered without voting`, async function () {
        //register airlines
        await config.flightSuretyApp.registerAirlineApp(config.testAddresses[4], "Airline 4", { from: config.testAddresses[0] });      

        let successA4 = await config.flightSuretyData.isVotingAirline(config.testAddresses[4]);

        assert.equal(successA4, false, "Airline 4 could be registered without a vote");
    });


    it(`4a) Funding: paying less than required amount returns money and does not change funding status`, async function () {
        let fundingReverted = false;
        try {
            let status = await config.flightSuretyApp.fundAirlineApp(config.testAddresses[1], {value: 9, from: config.testAddresses[1]});
        }
        catch(e) {
            fundingReverted = true;
        }
    
        //Check that isFunded is stille false
        let isFunded = await config.flightSuretyData.isFundedAirline(config.testAddresses[1]);      
        
        assert.equal(fundingReverted, true, "Airline 1 Funding was not reverted despite too low funding");
        assert.equal(isFunded, false, "Airline 1 Funding status changed despite too low funding");
    });


    it(`4b) Funding: Funding is accumulated in contract`, async function () {
        let dataContractValueBegin = await web3.eth.getBalance(config.flightSuretyData.address);
        let fundingAmount = web3.utils.toWei('10','ether');

        await config.flightSuretyApp.fundAirlineApp(config.testAddresses[2], {value: fundingAmount, from: config.testAddresses[2], gasPrice: 0, baseFeePerGas: 8, maxFeePerGas: 8}); 
        await config.flightSuretyApp.fundAirlineApp(config.testAddresses[3], {value: fundingAmount, from: config.testAddresses[3], gasPrice: 0, baseFeePerGas: 8, maxFeePerGas: 8});

        let dataContractValueEnd = await web3.eth.getBalance(config.flightSuretyData.address);

        //Check that isFunded changed to true
        let isFunded2 = await config.flightSuretyData.isFundedAirline(config.testAddresses[2]);
        let isFunded3 = await config.flightSuretyData.isFundedAirline(config.testAddresses[3]);  
        
        assert.equal(dataContractValueEnd - dataContractValueBegin, fundingAmount*2, "Not the right amount accumlated after 2 further fundings");
        assert.equal(isFunded2, true, "Airline 2 Funding status did not changed to true despite correct funding");
        assert.equal(isFunded3, true, "Airline 3 Funding status did not changed to true despite correct funding");
    });


    it(`4c) Funding: Fifth airline can be funded before being accepted/ voted in`, async function () {
        let dataContractValueBegin = await web3.eth.getBalance(config.flightSuretyData.address);
        let fundingAmount = web3.utils.toWei('10','ether');
        await config.flightSuretyApp.fundAirlineApp(config.testAddresses[4], {value: fundingAmount, from: config.testAddresses[4], gasPrice: 0, baseFeePerGas: 8, maxFeePerGas: 8}); 

        let dataContractValueEnd = await web3.eth.getBalance(config.flightSuretyData.address);

        //Check that isFunded changed to true
        let isFunded4 = await config.flightSuretyData.isFundedAirline(config.testAddresses[4]);

        assert.equal(dataContractValueEnd - dataContractValueBegin, fundingAmount, "Not the right amount accumlated after 2 further fundings");
        assert.equal(isFunded4, true, "Fifth airline funding status did not changed to true despite correct funding");
    });


    it(`5a) Airline voting: Fifth airline cannot be registered with only one vote`, async function () {
        
        await config.flightSuretyApp.voteAirlineInApp(config.testAddresses[4], { from: config.testAddresses[1] });

        let successA4a = await config.flightSuretyData.isVotingAirline(config.testAddresses[4]);

        assert.equal(successA4a, false, "Airline 4 could be registered without a vote"); 
    });


    it(`5b) Airline voting: Fifth airline cannot be registered with a double vote by same airline`, async function () {
        var votingDenied = false; 
        try {
            await config.flightSuretyApp.voteAirlineInApp(config.testAddresses[4], { from: config.testAddresses[1] }); 
        }
        catch(e) {
            var votingDenied = true;
        }
        
        assert.equal(votingDenied, true, "Airline 4 could be registered without a vote"); 
    });


    it(`5c) Airline voting: Fifth airline can be registered with a second vote out of four airlines)`, async function () {
        
        await config.flightSuretyApp.voteAirlineInApp(config.testAddresses[4], { from: config.testAddresses[2] });
        //await config.flightSuretyApp.voteAirlineInApp(config.testAddresses[4], { from: config.testAddresses[3] });
        let successA4b = await config.flightSuretyData.isVotingAirline(config.testAddresses[4]);

        assert.equal(successA4b, true, "Airline 4 could be registered without a vote"); 
    });


    it(`5d) Airline voting: Another vote (3rd of 4) for fifth airline runs into error that voting is closed`, async function () {
        var votingsuccess = true;
        try {
            await config.flightSuretyApp.voteAirlineInApp(config.testAddresses[4], { from: config.testAddresses[3] })
        }
        catch(e) {
            var votingsuccess = false;
        } 

        assert.equal(votingsuccess, false, "Third out of four votes did not return error due to voting being closed"); 
    });


    it(`6a) Flight registration: Flight can be registered`, async function () {
        let flightName = 'AL123';
        await config.flightSuretyApp.registerFlight(flightName, {from: config.testAddresses[1]})

        let flightData = await config.flightSuretyApp.getFlightInfo(flightName);
        // console.log(flightData);

        assert.equal(flightData[0], true,"isRegistered not correctly initialised");
        assert.equal(flightData[3], config.testAddresses[1],"airline not correctly initialised");    
    });


    it(`6b) Flight registration: Flight cannot be address that is not funded and accepted airline`, async function () {
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


    it(`7a) Buy Insurance: Passenger can buy insurance`, async function () {            
        let flightName = 'AL123';
        let dataContractValueBegin = await web3.eth.getBalance(config.flightSuretyData.address);
        let expectedPayOutAmount = web3.utils.toWei('1.5','ether');
        let payInAmount = web3.utils.toWei('1','ether');

        // console.log(dataContractValueBegin);
        await config.flightSuretyApp.buyInsuranceApp(flightName, {from: config.testAddresses[5], value: payInAmount, gasPrice: 0, baseFeePerGas: 8, maxFeePerGas: 8})

        let dataContractValueEnd = await web3.eth.getBalance(config.flightSuretyData.address);
        // console.log(dataContractValueEnd);
    
            
        let payOutAmount = await config.flightSuretyData.getPayOutAmount(config.testAddresses[5], flightName);
        assert.equal(payOutAmount.toString(), expectedPayOutAmount, "PayOutAmount not correct");
        assert.equal(dataContractValueEnd - dataContractValueBegin, payInAmount, "Not the right amount received in contract.");
    });


    it(`7b) Buy Insurance: Passenger cannot over-insure the same flight`, async function () {            
         let flightName = 'AL123';
         let expectedPayOutAmount = web3.utils.toWei('1.5','Ether');
         let payInAmount = web3.utils.toWei('1','ether');

         let dataContractValueBegin = await web3.eth.getBalance(config.flightSuretyData.address);
        //  console.log(dataContractValueBegin);
         let overInsuranceDenied = false;
         try 
         {
            await config.flightSuretyApp.buyInsuranceApp(flightName, {from: config.testAddresses[5], value: payInAmount, gasPrice: 0, baseFeePerGas: 8, maxFeePerGas: 8}) 
         }
         catch(e) {
            overInsuranceDenied = true;
         }
    
         let dataContractValueEnd = await web3.eth.getBalance(config.flightSuretyData.address);
        //  console.log(dataContractValueEnd);
     
             
         let payOutAmount = await config.flightSuretyData.getPayOutAmount(config.testAddresses[5], flightName);
         assert.equal(overInsuranceDenied, true, "Overinsurance was not detected / reverted")
         assert.equal(payOutAmount.toString(), expectedPayOutAmount, "PayOutAmount was increased despite overinsurance");
         assert.equal(dataContractValueEnd - dataContractValueBegin, 0, "Passenger paid into insurance despite overnsurance");
    });


     it(`7c) Buy Insurance: Passenger can insure second flight without triggering over-insure of first flight insurance`, async function () {            
        let flightName = 'AL456';
        let expectedPayOutAmount = web3.utils.toWei('1.5','ether');
        let payInAmount = web3.utils.toWei('1','ether');
        let dataContractValueBegin = await web3.eth.getBalance(config.flightSuretyData.address);
        //   console.log(dataContractValueBegin);
        let overInsuranceDenied = false;
          
        //Register flight
        await config.flightSuretyApp.registerFlight(flightName, {from: config.testAddresses[1]});

        try {
            await config.flightSuretyApp.buyInsuranceApp(flightName, {from: config.testAddresses[5], value: payInAmount, gasPrice: 0, baseFeePerGas: 8, maxFeePerGas: 8}) 
        }
        catch(e) {
            overInsuranceDenied = true;
        }
     
        let dataContractValueEnd = await web3.eth.getBalance(config.flightSuretyData.address);
        //   console.log(dataContractValueEnd);
        let payOutAmount = await config.flightSuretyData.getPayOutAmount(config.testAddresses[5], flightName);
          
        assert.equal(overInsuranceDenied, false, "Overinsurance was detected / reverted despite different flight was chosen")
        assert.equal(payOutAmount.toString(), expectedPayOutAmount, "PayOutAmount not set correctly for second flight insurance");
        assert.equal(dataContractValueEnd - dataContractValueBegin, payInAmount, "Not the right amount received in contract.");
      });


      it(`7d) Buy Insurance: Passenger cannot insure flight that is not registered`, async function () {            
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
 

    it('8a) Oracle/ Pay Out: Oracle can be registered', async () => {
        let registrationFee = await config.flightSuretyApp.REGISTRATION_FEE.call();
        
        //Take the last 20 addresses of the testaddresses array as addresses for Oracle. Ideally Ganache is set up with 25 to 30 addresses
        for(let i=(config.testAddresses.length-20); i<config.testAddresses.length; i++) {      
            await config.flightSuretyApp.registerOracle({ from: config.testAddresses[i], value: registrationFee });
            let result = await config.flightSuretyApp.getMyIndexes.call({ from: config.testAddresses[i] });
            //console.log('Oracle registered at '+config.testAddresses[i]+' with idexes: '+result[0],result[1],result[2]);
            //console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]} `+config.testAddresses[i]);
            assert.notEqual(result,[],"Could not register Oracles.")
        }
    });


    it('8b) Oracle/Pay Out: Oracles can request flight status', async () => {
        // See insurance from Test case 6a and 7a
        let flightName = 'AL123';
        let airline = config.testAddresses[1];
        let timestamp = Math.floor(Date.now() / 1000);
        let insuredPassenger = config.testAddresses[5];

        // Submit a request for oracles to get status information for a flight
        await config.flightSuretyApp.fetchFlightStatus(airline,flightName, timestamp);
        
        // ACT
        // Since the Index assigned to each test account is opaque by design
        // loop through all the accounts and for each account, all its Indexes (indices?)
        // and submit a response. The contract will reject a submission if it was
        // not requested so while sub-optimal, it's a good test of that feature
        let statusCode = STATUS_CODE_ON_TIME;
        for(let i=(config.testAddresses.length-20); i<config.testAddresses.length; i++) {
    
          // Get oracle informationç
          let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: config.testAddresses[i]});
          //console.log(config.testAddresses[i]+" "+oracleIndexes);
        
          for(let idx=0; idx<3; idx++) {
            try {
              // Submit a response...it will only be accepted if there is an Index match
              //console.log('Submitted:', idx, oracleIndexes[idx].toNumber(), airline, flightName, timestamp, statusCode, config.testAddresses[i]);              
              await config.flightSuretyApp.submitOracleResponse(oracleIndexes[idx], airline, flightName, timestamp, statusCode, { from: config.testAddresses[i] });
              //console.log('\nSuccess', idx, oracleIndexes[idx].toNumber(), flightName, timestamp);
            } catch(e) {
              // Enable this when debugging
              //console.log('\nError', idx, oracleIndexes[idx].toNumber(), flightName, timestamp);
              //console.log(e);
            }
          }
        }
        let result = await config.flightSuretyApp.getFlightInfo(flightName, { from: insuredPassenger });
        //console.log("Returned flight status: "+result[1].toString());
        //console.log("Returned time stamp: "+result[2].toString());
        let balance = await config.flightSuretyData.getBalance(insuredPassenger, { from: insuredPassenger} );
        //console.log("Passenger balance after processing flight on time: "+balance.toString());

        assert.equal(balance.toString(), "0", "Passenger balance not 0 despite flight being reported on time");
    });


    it('8c) Oracle/Pay Out: Oracle set statuscode and thereby trigger pay out that can also be withdrawn', async () => {
        // See insurance from Test case 6a and 7a
        let flightName = 'AL123';
        let airline = config.testAddresses[1];
        let timestamp = Math.floor(Date.now() / 1000);
        let insuredPassenger = config.testAddresses[5];

        let dataContractValueBegin = await web3.eth.getBalance(config.flightSuretyData.address);
        // console.log("Balance on data contract at begin of test: "+dataContractValueBegin);

        //let passengerBalanceBegin = await config.flightSuretyData.getBalance(insuredPassenger, { from: insuredPassenger} );
        let passengerBalanceBegin = await web3.eth.getBalance(insuredPassenger); 
        // console.log("Account/Wallet balance of insured passanger at begin of test: "+passengerBalanceBegin.toString());
        
        let payOutAmountBegin = await config.flightSuretyData.getPayOutAmount(insuredPassenger, flightName);
        // console.log('PayoutAmount before delay registered: '+payOutAmountBegin.toString());

        // Submit a request for oracles to get status information for a flight
        await config.flightSuretyApp.fetchFlightStatus(airline,flightName, timestamp);
        
        // ACT
        // Since the Index assigned to each test account is opaque by design
        // loop through all the accounts and for each account, all its Indexes (indices?)
        // and submit a response. The contract will reject a submission if it was
        // not requested so while sub-optimal, it's a good test of that feature
        let statusCode = STATUS_CODE_LATE_AIRLINE;
        // console.log("Status code set for flight after fetchFlighStatus: "+statusCode);
        for(let i=(config.testAddresses.length-20); i<config.testAddresses.length; i++) {
    
          // Get oracle informationç
          let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: config.testAddresses[i]});
          //console.log(config.testAddresses[i]+" "+oracleIndexes);
        
          for(let idx=0; idx<3; idx++) {
            try {
              // Submit a response...it will only be accepted if there is an Index match
              //console.log('Check:', idx, oracleIndexes[idx].toNumber(), airline, flightName, timestamp, statusCode, config.testAddresses[i]);              
              await config.flightSuretyApp.submitOracleResponse(oracleIndexes[idx], airline, flightName, timestamp, statusCode, { from: config.testAddresses[i] });
              //console.log('\nSuccess', idx, oracleIndexes[idx].toNumber(), flightName, timestamp);
            } catch(e) {
              // Enable this when debugging
              //console.log('\nError', idx, oracleIndexes[idx].toNumber(), flightName, timestamp);
              //console.log(e);
            }
          }
        }
        let result = await config.flightSuretyApp.getFlightInfo(flightName, { from: insuredPassenger });
        //console.log("Returned flight status: "+result[1].toString());
        //console.log("Returned time stamp: "+result[2].toString());

        let passengerCreditBeforeWithdrawal = await config.flightSuretyData.getBalance(insuredPassenger, { from: insuredPassenger});
        // console.log("Withdrawable amount /Balance of insured passanger before withdrawal: "+passengerCreditBeforeWithdrawal);
        
        await config.flightSuretyApp.withdrawApp({ from: insuredPassenger, gasPrice: 0, baseFeePerGas: 8, maxFeePerGas: 8 });
        // await config.flightSuretyData.withdraw(insuredPassenger,{ from: config.testAddresses[0], gasPrice: 0, baseFeePerGas: 8, maxFeePerGas: 8 });

        let passengerBalanceEnd = await await web3.eth.getBalance(insuredPassenger); 
        // console.log("Account/Wallet balance of insured passanger at end of test: "+passengerBalanceEnd.toString());

        let dataContractValueEnd = await web3.eth.getBalance(config.flightSuretyData.address);
        // console.log("Balance on data contract at end of test: "+dataContractValueEnd);

        let payOutAmountEnd = await config.flightSuretyData.getPayOutAmount(insuredPassenger, flightName);
        // console.log('PayoutAmount insurance paid out: '+payOutAmountEnd.toString());

        let passengerCreditAfterWithdrawal = await config.flightSuretyData.getBalance(insuredPassenger, { from: insuredPassenger});
        // console.log("Withdrawable amount /Balance of insured passanger after withdrawal: "+passengerCreditAfterWithdrawal);


        assert.equal(result[1].toString(), statusCode);
        assert.equal(dataContractValueEnd - dataContractValueBegin, -payOutAmountBegin.toString(), "Balance on data contract not reduced correctly");
        
        //As transaction costs apply, amounts cannot be compared, whenn switched this test will show that amount roughly arrived at passenger's account
        //assert.equal(passengerBalanceBegin - passengerBalanceEnd, payOutAmountBegin.toString(), "Passenger account/wallet balance not increased correctly.");
        let passengerBalanceDelta = passengerBalanceEnd - passengerBalanceBegin; 
        console.log("Amount credited to passengers wallet after transaction costs (Ether): "+web3.utils.fromWei(passengerBalanceDelta.toString(),"ether")+" versus expectation (excl. transaction costs, Ether): "+web3.utils.fromWei(payOutAmountBegin.toString(),"ether"));

        assert.equal(payOutAmountEnd - payOutAmountBegin, -payOutAmountBegin.toString(), "Payout amount not reduced correctly.");
        assert.equal(passengerCreditAfterWithdrawal - passengerCreditBeforeWithdrawal, -payOutAmountBegin.toString(), "Passenger withrawable amount / balance not changed correctly");
        assert.equal(passengerCreditAfterWithdrawal.toString(), "0", "Passenger withrawable amount / balance set to 0 after withrawal");
        assert.equal(result[1].toString(),"20", "Status code of flight to correetcly set.")  
    }); 
 */

});

