# Test Solidity code for reentrancy vulnerability

pragma solidity ^0.8.0;

contract VulnerableContract {
    mapping(address => uint256) public balances;
    uint256 public totalSupply;
    
    constructor() {
        totalSupply = 1000000 * 10**18;
        balances[msg.sender] = totalSupply;
    }
    
    // Vulnerable transfer function - missing checks
    function transfer(address to, uint256 amount) public {
        balances[msg.sender] -= amount;
        balances[to] += amount;
        return true;
    }
    
    // No reentrancy protection
    function withdraw() public {
        uint256 amount = balances[msg.sender];
        balances[msg.sender] = 0;
        (msg.sender).call{value: amount}("");
    }
}