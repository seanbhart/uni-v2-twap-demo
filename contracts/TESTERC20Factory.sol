// SPDX-License-Identifier: MIT
// pragma solidity ^0.8.0;
// pragma solidity >=0.7.6;
pragma solidity >=0.6.8;


import '@openzeppelin/contracts/access/Ownable.sol';
// import '@openzeppelin/contracts/utils/Create2.sol';
import './TESTERC20.sol';
import 'hardhat/console.sol';


contract TESTERC20Factory is Ownable {
    mapping(string => address) public getToken;
    mapping(string => mapping(address => address)) public getAccountToken;
    string[] public tokenList;

    // event TokenDeployed(address tokenAddress_);
    event TokenCreated(
        address indexed creator_,
        string symbol_,
        address tokenAddress_,
        uint tokenCount_
    );

    constructor() Ownable() public {}

    function tokenListLength() external view returns (uint) {
        return tokenList.length;
    }

    function createToken(string calldata _name, string calldata _symbol, uint _ownerSupply) external returns (address tokenAddress) {
        console.log("TESTERC20Factory createToken: ", _name, _symbol, _ownerSupply);
        require(getToken[_symbol] == address(0), 'TESTERC20Factory: TOKEN_EXISTS');

        bytes memory bytecode = type(TESTERC20).creationCode;
        bytes32 salt = keccak256(abi.encodePacked('TESTERC20', _symbol));
        assembly {
            tokenAddress := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        console.log("TESTERC20Factory createToken address: ", tokenAddress);
        TESTERC20(tokenAddress).initialize(_name, _symbol, msg.sender, _ownerSupply);
        getToken[_symbol] = tokenAddress;
        getAccountToken[_symbol][msg.sender] = tokenAddress;
        tokenList.push(_symbol);

        emit TokenCreated(msg.sender, _symbol, tokenAddress, tokenList.length);
    }

    // function createToken(string memory _name, string memory _symbol, uint _ownerSupply) external {
    //     console.log("createToken: ", _name, _symbol, _ownerSupply);
    //     require(getToken[_symbol] == address(0), 'TESTERC20Factory: TOKEN_EXISTS');

    //     bytes32 salt = keccak256(abi.encodePacked('TESTERC20', _symbol));
    //     console.logBytes32(salt);
    //     address tokenAddress = computeAddress(salt);
    //     console.log("createToken tokenAddress: ", tokenAddress);
    //     deployToken(salt, _name, _symbol, _ownerSupply);
    //     console.log("createToken deployed");
    //     getToken[_symbol] = tokenAddress;
    //     getAccountToken[_symbol][msg.sender] = tokenAddress;
    //     tokenList.push(_symbol);
    //     console.log("createToken complete");

    //     emit TokenCreated(msg.sender, _symbol, tokenAddress, tokenList.length);
    // }

    // function deployToken(bytes32 salt, string memory _name, string memory _symbol, uint _ownerSupply) public {
    //     address tokenAddress;
    //     tokenAddress = Create2.deploy(0, salt, type(TESTERC20).creationCode);
    //     console.log("deployToken tokenAddress: ", tokenAddress);
    //     TESTERC20(tokenAddress).initialize(_name, _symbol, msg.sender, _ownerSupply);
    //     console.log("deployToken init");
        
    //     emit TokenDeployed(tokenAddress);
    // }

    // function computeAddress(bytes32 salt) public view returns (address) {
    //     return Create2.computeAddress(salt, bytes32("0x01"));
    // }
}