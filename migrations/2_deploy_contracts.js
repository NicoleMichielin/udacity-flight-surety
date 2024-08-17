const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require('fs');

module.exports = async function(deployer) {
    let flightSuretyDataInstance;
    let flightSuretyAppInstance;

    // Passaggio 1: Distribuisci FlightSuretyData
    await deployer.deploy(FlightSuretyData);
    flightSuretyDataInstance = await FlightSuretyData.deployed();

    // Passaggio 2: Distribuisci FlightSuretyApp con l'indirizzo di FlightSuretyData
    await deployer.deploy(FlightSuretyApp, flightSuretyDataInstance.address);
    flightSuretyAppInstance = await FlightSuretyApp.deployed();

    // Passaggio 3: Autorizza FlightSuretyApp a interagire con FlightSuretyData
    //await flightSuretyDataInstance.authorizeCaller(flightSuretyAppInstance.address);

    await flightSuretyDataInstance.authorizeContract(FlightSuretyApp.address);

    // Verifica che l'autorizzazione sia corretta
    const isAuthorized = await flightSuretyDataInstance.isAuthorized(flightSuretyAppInstance.address);
    console.log(`FlightSuretyApp authorized: ${isAuthorized}`);

    // Configura gli indirizzi dei contratti
    let config = {
        localhost: {
            url: 'http://localhost:9545',
            dataAddress: flightSuretyDataInstance.address,
            appAddress: flightSuretyAppInstance.address
        }
    };

    // Salva la configurazione nei file
    fs.writeFileSync(__dirname + '/../src/dapp/config.json', JSON.stringify(config, null, '\t'), 'utf-8');
    fs.writeFileSync(__dirname + '/../src/server/config.json', JSON.stringify(config, null, '\t'), 'utf-8');
};
