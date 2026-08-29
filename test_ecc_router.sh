#!/bin/bash
# Test ecc-agent-router on Osiris code
# Run this in the new session

set -e

echo "=== Testing ecc-agent-router on Osiris code ==="
echo

echo "1. Testing on Solidity file (should use security-reviewer/solidity-reviewer)..."
echo "   File: src/test_reentrancy.sol"
hermes --conversation "Analyze the Solidity file at /c/Users/kathi/workspace/osiris/src/test_reentrancy.sol for security vulnerabilities. Look for reentrancy, overflow, and access control issues. Use the best ECC agent for this code."

echo
echo "2. Testing on Python trading code (should use python-reviewer/llm-trading-agent-security)..."
echo "   File: src/trading.py"
hermes --conversation "Review the Python trading code at /c/Users/kathi/workspace/osiris/src/trading.py for security issues, especially money-path code. Check for proper decimal handling, error handling, and trade execution safety. Use the best ECC agent for money-path trading code."

echo
echo "3. Testing architecture review (should use architect)..."
echo "   Analyzing overall project structure"
hermes --conversation "Review the overall Osiris project architecture at /c/Users/kathi/workspace/osiris/. Check for proper separation of concerns, security boundaries, and adherence to the AGENTS.md rules. Use the best ECC agent for architecture review."

echo
echo "=== ecc-agent-router test complete ==="