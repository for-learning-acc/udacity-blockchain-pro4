
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

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

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
    let airline2 = accounts[2];
    let airline3 = accounts[3];
    await config.flightSuretyApp.registerAirline(airline2, {from: config.firstAirline});

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(airline3, {from: config.airline2});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isRegisteredAirline.call(airline3); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

  });

  it('(airline) can register an Airline using registerAirline() if it is funded', async () => {
    // ARRANGE
    let airline2 = accounts[2];
    let airline3 = accounts[3];

    await config.flightSuretyData.fund({from: airline2, value: web3.utils.toWei("10", "ether")})

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(airline3, {from: airline2});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isRegisteredAirline.call(airline3);
    // ASSERT
    assert.equal(result, true, "Airline should be able to register another airline if it has provided funding");
  });

  it('(airline) Registration of fifth and subsequent airlines requires multi-party consensus of 50% of registered airlines', async () => {
    // ARRANGE
    let airline2 = accounts[2];
    let airline4 = accounts[4];
    let airline5 = accounts[5];
    let firstAirline = config.firstAirline;

    await config.flightSuretyData.fund({from: firstAirline, value: web3.utils.toWei("10", "ether")})

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(airline4, {from: config.firstAirline});
        await config.flightSuretyApp.registerAirline(airline5, {from: config.firstAirline});
    }
    catch(e) {

    }
    let airlineCount = await config.flightSuretyData.getAirlineCount.call();

    assert.equal(airlineCount, 4, "Airline 5 should be in the wait list");

    
    await config.flightSuretyApp.registerAirline(airline5, {from: airline2});

    airlineCount = await config.flightSuretyData.getAirlineCount.call();    

    assert.equal(airlineCount, 5, "Airline 5 should be registered");

    let isAirlineRegistered = await config.flightSuretyData.isRegisteredAirline(airline5);
    assert.equal(isAirlineRegistered, true, "Airline should be added with multi-party consensus of 50% of registered airlines");
  });
});
