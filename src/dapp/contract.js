import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
    }

    async initialize(network) {
        let config = Config[network];
        this.owner = config.ownerAddress;
        this.appAddress = config.appAddress; // handover required as I will call authorizeCaller directly from index.js
        this.oracleAddresses = config.oracleAddresses;
        await this.initializeWeb3(config);
        await this.initializeContracts(config);

        //let accts = await this.web3.eth.getAccounts();
        //console.log(accts);

        this.airlines = config.startingAirlines;
        this.passengers = config.startingPassengers;
        this.flights = config.startingFlights;

        console.log('here?')
        //Authorise app contract to call data contract
        //await this.authorizeCaller(config.appAddress);

        //Register  - but not fund - the 2nd, 3rd and 4th airline - owner is already the first airline
        //await this.initilizeAirlines();

        await this.updateContractInfo();

        var selectAirlines = document.getElementById("airlines-airline-dropdown");
        for(let counter=0; counter<=3; counter++) {
            selectAirlines.options[selectAirlines.options.length] = new Option(this.airlines[counter].name+"("+this.airlines[counter].address.slice(0,8)+"...)", counter);
        }

        var selectFlights1 = document.getElementById("flights-flights-dropdown");
        var selectFlights2 = document.getElementById("passengers-flights-dropdown");
        for(let counter=0; counter<this.flights.length; counter++) {
            selectFlights1.options[selectFlights1.options.length] = new Option(this.flights[counter].name+"("+this.flights[counter].from+" --> "+this.flights[counter].to+")", counter);
            selectFlights2.options[selectFlights2.options.length] = new Option(this.flights[counter].name+"("+this.flights[counter].from+" --> "+this.flights[counter].to+")", counter);
            //await this.registerFlight(this.flights[counter].name);
        }
    }

    async initializeWeb3(config) {
        let web3Provider;
        if (window.ethereum) {
            web3Provider = window.ethereum;
            try {
                await window.ethereum.enable();
            } catch (error) {
                console.error("User denied account access")
            }
        } else if (window.web3) {
            web3Provider = window.web3.currentProvider;
        } else {
            web3Provider = new Web3.providers.HttpProvider(config.url);
        }
        this.web3 = new Web3(web3Provider);
        console.log(this.owner);
        this.web3.eth.defaultAccount = this.owner;
    }

    async initializeContracts(config) {
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
    }

    async initilizeAirlines() {
        let self = this;
        for (let counter=1; counter<=3; counter++) { //I do count the owner as airline, so only for other airlines are able to register without voting
        //console.log('Starting to register: '+self.airlines[counter].address+ ' by ' + self.owner);
        await self.registerAirline(self.airlines[counter].address, self.airlines[counter].name, { from: self.owner}); 
        console.log('registered: '+self.airlines[counter].address);
        }
    }

    async registerFlight(flight) {
        let self = this;
        var success = true;
        try {
            self.flightSuretyApp.methods
            .registerFlight(flight)
            .send({ from: self.owner });
        } catch(error){
                    console.log(error);
                    success = false;
        };
        if (success) {console.log('Flight registered: '+flight+' by '+self.owner);};
    }

    async registerMultipleOracles(registrationFee) {
        let self = this;
        var success = true;
        console.log(registrationFee, self.oracleAddresses);
        let regFeeWei = this.web3.utils.toWei(registrationFee, 'ether');
        try {
            self.flightSuretyApp.methods
            .registerMultipleOracles(self.oracleAddresses)
            .send({ value: regFeeWei, from: self.owner });
        } catch(error){
                    console.log(error);
                    success = false;
        };
        if (success) {console.log('Oracles authorized: '+self.oracleAddresses+' by '+self.owner);};
        const oraclesWithIndexes = [];
        await self.oracleAddresses.forEach(async oracle => {
            let indexes = await self.flightSuretyApp.methods.getMyIndexes().call({ from: oracle });
            console.log(oracle, indexes);
            oraclesWithIndexes.push({address: oracle, indexes: indexes});    
        })
        console.log(oraclesWithIndexes);
    }
    // async saveOraclesWithIndexes(oraclesWithIndexes) {
    //     console.log(oraclesWithIndexes);
    // } 
    async getDataContractAddress() {
        return this.flightSuretyData._address;
    }

    async getAppContractAddress() {
        return this.flightSuretyApp._address;
    }

    async authorizeCaller(){
        let self = this;
        var success = true;
        try {
            self.flightSuretyData.methods
            .authorizeCaller(self.appAddress)
            .send({ from: self.owner });
        } catch(error){
                    console.log(error);
                    success = false;
        };
        if (success) {console.log('App contract authorized to call data contract: '+self.appAddress+' by '+self.owner);};
        self.updateContractInfo();
    }

    async updateContractInfo() {
        let self=this;
        var statusDataContract=false; 
        try {
            statusDataContract = await self.flightSuretyData.methods.isOperational().call({ from: self.owner });
            console.log(statusDataContract);
        } catch(error){
            console.error(error);
        };
        if (statusDataContract) {
            document.getElementById('contract-operational-status').value="Operational";
        } else {
            document.getElementById('contract-operational-status').value="WARNING: Not connected or operational";
        }


    }
    async getAirlineInfo(index) {
        let self = this;
        //console.log(index, self.airlines[index].address, self.airlines[index].name)
        return [self.airlines[index].address, self.airlines[index].name];
    }
    async getFlightInfo(index) {
        let self = this;
        //console.log(index, self.flights[index].name)
        return self.flights[index].name;
    }

    
    async registerAirline(address, name) {
        let self = this;
        try {
        await self.flightSuretyApp.methods.registerAirlineApp(address,name).send({ from: self.owner });
        } catch(error){
            console.error(error);
        };
    }

    async fundAirline(address, amountEther) {
        let self = this;
        let account = await this.getAccount();
        let amountWei = this.web3.utils.toWei(amountEther, 'ether');
        //console.log(account+amountWei);
        try {
        await self.flightSuretyApp.methods.fundAirlineApp(address).send({ from: account, value: amountWei });
        } catch(error){
            console.error(error);
        };
    }

    async buyInsurance(flight, amountEther) {
        let self = this;
        let account = await self.getAccount();
        let amountWei = self.web3.utils.toWei(amountEther, 'ether');
        console.log(account+amountWei);
        try {
        await self.flightSuretyApp.methods.buyInsuranceApp(flight).send({ from: account, value: amountWei });
        } catch(error){
            console.error(error);
        };
    }

    async fetchFlightStatus(flight) {
        let self = this;
        let success = false;
        let timestamp= Math.floor(Date.now() / 1000);
        try {
            await self.flightSuretyApp.methods
                .fetchFlightStatus(self.owner, flight, timestamp) //Flights are not linked to airlines in my implementation
                .send({ from: self.owner}, (error, result) => {
            });
            success = true;
        } catch (error) {
            console.log(error);
        }
        if (success) {console.log("Flight information requested for: "+flight)};
    }

    async getAccount() {
        try {
            let accounts = await this.web3.eth.getAccounts();
            return accounts[0];
        } catch (error) {
            console.log(error);
        }
    }
    async withdrawPayout() {
        let self = this;
        let account = await self.getAccount();
        let success = false;
        try {
            await self.flightSuretyApp.methods.withdrawApp().send({ from: account });
            success = true;
        } catch (error) {
            console.log(error);
        }
        if (success) {console.log("Withdraw successful.")}
    }

    async getPayout() {
        let self = this;
        let account = await self.getAccount();
        let success = false;
        var balance = 0;
        try {
            var balance = await self.flightSuretyData.methods.getBalance(account).call({ from: account });
            console.log(balance);
            success = true;
        } catch (error) {
            console.log(error);
        }
        if (success) {console.log("Update of balance successful.")}
        return self.web3.utils.fromWei(balance, 'ether');
    }
}