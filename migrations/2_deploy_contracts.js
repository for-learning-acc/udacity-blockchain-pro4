const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require('fs');

module.exports = function(deployer, network, accounts) {
    let firstAirline = accounts[1];
    deployer.deploy(FlightSuretyData, firstAirline)
    .then(() => {
        return deployer.deploy(FlightSuretyApp, FlightSuretyData.address)
                .then(() => {
                    let config = {
                        localhost: {
                            url: 'http://localhost:8545',
                            dataAddress: FlightSuretyData.address,
                            appAddress: FlightSuretyApp.address
                        }
                    }
                    fs.writeFileSync(__dirname + '/../src/dapp/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                    fs.writeFileSync(__dirname + '/../src/server/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                })
                .then(async() => {
                    let dataContract = await FlightSuretyData.deployed();
                    let appContract = await FlightSuretyApp.deployed();

                    let flight1 = 'FL1';
                    let flight2 = 'FL2';
                    let timestamp = Math.floor(Date.now() / 1000);

                    await dataContract.fund({ from: firstAirline, value: web3.utils.toWei("10", "ether") });
                    await appContract.registerFlight(firstAirline, flight1, timestamp, { from: firstAirline });
                    await appContract.registerFlight(firstAirline, flight2, timestamp, { from: firstAirline });
                })
    });
}