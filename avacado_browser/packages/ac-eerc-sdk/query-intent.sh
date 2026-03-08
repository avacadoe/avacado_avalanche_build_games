#!/bin/bash

# Script to query withdraw intents from the EERC contract using cast
# Usage: ./query-intent.sh <intent_hash> [rpc_url] [contract_address]

if [ $# -lt 1 ]; then
    echo "Usage: $0 <intent_hash> [rpc_url] [contract_address]"
    echo "Example: $0 0x1234567890abcdef... https://api.avax-test.network/ext/bc/C/rpc 0x..."
    exit 1
fi

INTENT_HASH=$1
RPC_URL=${2:-"https://api.avax-test.network/ext/bc/C/rpc"}
CONTRACT_ADDRESS=${3:-"0x5894792d827D56057718Ca15B266D1A7C4eb3682"}  # Fuji converter contract

echo "Querying withdraw intent..."
echo "Intent Hash: $INTENT_HASH"
echo "RPC URL: $RPC_URL"
echo "Contract Address: $CONTRACT_ADDRESS"
echo ""

# Call the withdrawIntents function
# Function signature: withdrawIntents(bytes32) returns (address,uint256,uint256,bool,bool)
RESULT=$(cast call $CONTRACT_ADDRESS \
    "withdrawIntents(bytes32)(address,uint256,uint256,bool,bool)" \
    $INTENT_HASH \
    --rpc-url $RPC_URL)

echo "Raw result: $RESULT"
echo ""

# Parse the result
USER=$(echo $RESULT | cut -d' ' -f1)
TOKEN_ID=$(echo $RESULT | cut -d' ' -f2)
TIMESTAMP=$(echo $RESULT | cut -d' ' -f3)
EXECUTED=$(echo $RESULT | cut -d' ' -f4)
CANCELLED=$(echo $RESULT | cut -d' ' -f5)

echo "Parsed result:"
echo "User: $USER"
echo "Token ID: $TOKEN_ID"
echo "Timestamp: $TIMESTAMP ($(date -r $TIMESTAMP 2>/dev/null || echo 'Invalid timestamp'))"
echo "Executed: $EXECUTED"
echo "Cancelled: $CANCELLED"