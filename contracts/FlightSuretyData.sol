// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false

    mapping(address => bool) private authorizedCallers;
    
    struct Airline
    {
        bool isRegistered;
        uint256 funds;
    }

    struct FlightInsurance
    {
        uint256 value;
        bool isCredited;
        uint256 creditedInsuranceAmount;
    }

    mapping(address => Airline) private airlines;
    mapping(bytes32 => mapping(address => FlightInsurance)) private flightInsurances;
    mapping(bytes32 => address[]) private flightPassengers;
    mapping(address => uint256) private passengerBalance;

    uint256 public constant MIN_AIRLINE_FUNDS = 10 ether;
    uint256 public constant MAX_INSURANCE_AMOUNT = 1 ether;

    uint256 airlineCount = 0;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor(address airline) 
    {
        contractOwner = msg.sender;
        authorizedCallers[contractOwner] = true;
        registerAirline(airline);
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireAuthorizedCaller()
    {
        require(authorizedCallers[msg.sender] == true, "Caller is not an authorized caller");
        _;
    }

    modifier requireRegisteredAirline()
    {
        require(isRegisteredAirline(msg.sender), "Caller is not an registered airline");
        _;
    }

    modifier requireFundedAirline()
    {
        require(isActiveAirline(msg.sender), "Caller is not funded");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() public view returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus(bool mode) external requireContractOwner 
    {
        operational = mode;
    }

    function authorizeCaller(address caller) external requireIsOperational requireContractOwner
    {
        authorizedCallers[caller] = true;
    }

    function deauthorizeCaller(address caller) external requireIsOperational requireContractOwner
    {
        delete authorizedCallers[caller];
    }

    function isRegisteredAirline(address airline) public view requireIsOperational returns (bool)
    {
        return airlines[airline].isRegistered;
    }

    function isActiveAirline(address airline) public view requireIsOperational returns (bool)
    {
        return airlines[airline].funds >= MIN_AIRLINE_FUNDS;
    }

    function getAirlineCount() public view requireIsOperational returns (uint256)
    {
        return airlineCount;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline (address newAirline) public requireIsOperational
    {
        require(!isRegisteredAirline(newAirline), "Airline has already registered");

        airlines[newAirline] = Airline(true, 0);
        airlineCount++;
    }


   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy(address airline, string memory flight, uint256 timestamp, address passenger) external requireIsOperational requireAuthorizedCaller payable
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);

        flightInsurances[flightKey][passenger] = FlightInsurance(msg.value, false, 0);
        flightPassengers[flightKey].push(passenger);
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees(address airline, string memory flight, uint256 timestamp) external requireIsOperational requireRegisteredAirline
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);

        for (uint256 i = 0; i < flightPassengers[flightKey].length; i++)
        {
            address passenger = flightPassengers[flightKey][i];
            FlightInsurance memory insurance = flightInsurances[flightKey][passenger];
            
            if (!insurance.isCredited) {
                uint256 amount = insurance.value.mul(3).div(2);
                flightInsurances[flightKey][passenger].creditedInsuranceAmount = amount;
                flightInsurances[flightKey][passenger].isCredited = true;
                passengerBalance[passenger] = passengerBalance[passenger].add(amount);
            }
        }
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay(address payable passenger) external requireIsOperational requireAuthorizedCaller returns (uint256)
    {
        uint256 payoutAmount = passengerBalance[passenger];
        passengerBalance[passenger] = passengerBalance[passenger].sub(payoutAmount);
        passenger.transfer(payoutAmount);

        return payoutAmount;
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund() public requireIsOperational requireRegisteredAirline payable
    {
        require(msg.value > 0, "Value must be greater than 0");
        airlines[msg.sender].funds = airlines[msg.sender].funds.add(msg.value);
    }

    function getFlightKey (address airline, string memory flight, uint256 timestamp) pure internal returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    fallback()  external payable requireIsOperational {
    }
    
    receive() external payable {
    }


}

