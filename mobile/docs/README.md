# Avacado Protocol — Technical Documentation

> **Status:** Conceptual Design & Planning  
> This document outlines our vision and proposed architecture. Implementation is planned for future development.

---

## Table of Contents

1. [Overview](#overview)
2. [Our Goal](#our-goal)
3. [The EERC System](#the-encrypted-erc-eerc-system)
4. [Proposed Key Features](#proposed-key-features)
5. [Batching for Enhanced Privacy](#batching-for-enhanced-privacy)
6. [Advanced Nullifier System](#advanced-nullifier-system)
7. [Auditor System](#auditor-system)
8. [Two-Phase Private Withdrawal System](#two-phase-private-withdrawal-system)
9. [Security Guarantees](#security-guarantees)
10. [Comparison with Traditional Systems](#comparison-with-traditional-systems)
11. [Development Roadmap](#development-roadmap)

---

## Overview

Avacado is a proposed privacy-preserving token system to be built on **Encrypted ERC (EERC)** technology. The system will enable private transactions while maintaining regulatory compliance through an innovative auditor system.

---

## Our Goal

We operate on the principle that **privacy does not equate to secrecy**. Our objective is to empower users with control over their financial data while facilitating legitimate oversight.

---

## The Encrypted ERC (EERC) System

Our proposed EERC system will preserve privacy in token transactions by encrypting balances on-chain using elliptic curve encryption. Users will be able to demonstrate sufficient balance through zero-knowledge proofs without disclosing exact amounts.

### Existing System Limitations

While existing EERC implementations support private transfers between registered users, deposit and withdrawal amounts remain visible on-chain.

### Our Proposed Enhancement

Our comprehensive implementation will achieve **end-to-end transaction privacy**, ensuring that no amounts are visible at any stage — including during transfers and withdrawals.

For compliance purposes, authorized auditors will be able to decrypt balances using their private key, ensuring regulatory requirements are met without compromising user privacy.

---

## Proposed Key Features

### Private Withdrawals

Our system will enable private withdrawals to any external address outside the EERC ecosystem, effectively decoupling encrypted balances from their final destinations. Unlike traditional privacy systems confined to their own ecosystems, our solution will facilitate private off-ramping.

### Unified Entry Point

A unified entry point will obfuscate user intent on-chain. All operations will be channeled through a single function that intelligently routes to the appropriate handler based on encrypted intent data, preventing observers from discerning the specific operation performed by a user.

### Two-Phase System

Withdrawals will be processed via a two-phase system: intent submission (Phase 1) followed by execution after a delay (Phase 2). This **24-hour delay** will mitigate front-running and allow for batch execution, where multiple users' withdrawals are processed collectively, enhancing privacy through anonymity sets.

---

## Batching for Enhanced Privacy

Our system will aggregate and execute multiple withdrawal intents in a single batch transaction. Batching enhances privacy by creating anonymity sets.

**Example:** With 50 intents in a single batch, the linkability between any individual withdrawal and its origin is significantly minimized. Observers can see the withdrawals but cannot determine which user initiated which transaction.

| Benefit | Description |
|---|---|
| **Enhanced Privacy** | The 24-hour delay naturally facilitates accumulation of intents from multiple users |
| **Cost Efficiency** | Batch execution reduces gas costs per withdrawal |
| **Anonymity Sets** | More participants = stronger privacy guarantees for all |

---

## Advanced Nullifier System

We plan to implement an advanced nullifier system that will prove commitment ownership without exposing critical details, all while maintaining auditor oversight.

### Phase 1 — Commitment

A user generates a random secret and creates a commitment — a hash of the amount, destination, tokenId, nonce, and secret. This commitment, along with encrypted audit data, is submitted.

```
commitment = hash(amount, destination, tokenId, nonce, secret)
```

The encrypted audit data allows auditors to decrypt the user's secret and associated amount.

### Phase 2 — Nullifier Reveal

After 24 hours, the user reveals the nullifier (a hash of the commitment and secret), along with the amount and destination, supported by a zero-knowledge proof.

```
nullifier = hash(commitment, secret)
```

The public cannot link the nullifier back to the original commitment without the secret.

### Privacy Guarantees

| Party | Visible |
|---|---|
| **Public** | Unlinked commitments and nullifiers (e.g. 50 within a batch) |
| **Auditor** | Full trail: user → commitment → nullifier → amount |

**Security properties:**
- Zero-knowledge proofs prevent fraudulent claims
- A nullifier registry prevents double-spending
- The secret serves as a salt, privacy key, and proof of ownership

---

## Auditor System

In our design, auditors will possess the capability to decrypt all encrypted balance data and audit trails using their private key. This ensures full compliance with regulatory requirements while preserving privacy from public observation.

### Planned: 7-of-9 Threshold Encryption

Our design includes a **7-of-9 threshold encryption scheme**, requiring the cooperation of seven out of nine auditors for decryption. This prevents any single entity from having unilateral access to user data.

### DEX Compliance Vision

This system will assist users in avoiding DEX blocking, where decentralized exchanges may freeze funds from privacy protocols based on transaction history. Our auditor system will be able to verify the legitimacy of funds and ensure regulatory compliance.

---

## Two-Phase Private Withdrawal System

The two-phase withdrawal system will be the cornerstone of Avacado's privacy guarantees. It separates intent from execution, creating anonymity sets through batching.

### Phase 1 — Submit Intent (Private)

```solidity
submitWithdrawIntent(tokenId, proof, balancePCT, metadata)
```

**Creates:**
```
intentHash = poseidon(amount, destination, tokenId, nonce)
```

**What is stored on-chain (public):**
- Your address
- Intent hash (cryptographic commitment)
- Encrypted balance
- ZK proof (~764 bytes)

**What remains private:**
- Withdrawal amount
- Destination address
- Nonce

---

### Phase 2 — Execute Intent (After 24h)

**Option A — Individual Execution** *(Low Privacy)*
```solidity
executeWithdrawIntent(intentHash, tokenId, destination, amount, ...)
```
> ⚠️ Everyone sees the direct link: `YOU → AMOUNT → DESTINATION`

**Option B — Batch Execution** *(Recommended — High Privacy)*
```solidity
executeBatchWithdrawIntents([50 intents])
```
> ✅ Everyone sees 50 withdrawals but cannot link specific users to specific destinations

---

### How Privacy is Achieved

**Phase 1: Submission (Today)**
```
User1 → intentHash: 0x****...**** ❓
User2 → intentHash: 0x****...**** ❓
User3 → intentHash: 0x****...**** ❓
```
- Observer **knows:** Three users submitted intents
- Observer **doesn't know:** The amounts or destinations

**Phase 2: Batch Execution (After 24h)**
```
1000 tokens → 0xAlice****
 500 tokens → 0xBob****
2000 tokens → 0xCarol****
```
- Observer **knows:** The amounts and destinations
- Observer **doesn't know:** Which user submitted which withdrawal

---

## Security Guarantees

### 1. Immutable Commitment

The contract verifies:
```
poseidon(amount, destination, salt, tokenId, nonce) == intentHash
```
This ensures no one can execute the withdrawal with altered parameters. Your withdrawal is cryptographically locked to your specified values.

### 2. Balance Protection

Your balance is locked after intent submission. You cannot submit another intent until the current one is executed, preventing double-spending.

### 3. Time-Based Access

| Window | Who Can Execute |
|---|---|
| **0 – 24h** | Only you (individual execution) |
| **24h+** | A relayer can batch the withdrawal *(recommended for privacy)* |
| **7d+** | Intent expires — resubmission required |

---

## Comparison with Traditional Systems

### Traditional Withdrawal

```solidity
withdraw(amount, destination);
```

**Privacy:** None. All transaction details are publicly visible.

```
On-chain: User → Amount → Destination  ← ALL PUBLIC
```

### Avacado Two-Phase System

```solidity
// Phase 1: Hide the details
submitWithdrawIntent(proof)
// Only hash visible on-chain

// Phase 2: Reveal in batch
executeBatch([many intents])
// Cannot link user to withdrawal
```

---

## Development Roadmap

### Planned Core Features

- [ ] Two-phase withdrawal system with intent submission and batch execution
- [ ] Unified entry point for obfuscated user operations
- [ ] Full EERC integration with encrypted on-chain balances
- [ ] Zero-knowledge proof system for balance verification

### Advanced Features

- [ ] Nullifier-based privacy system with commitment-nullifier separation
- [ ] 7-of-9 threshold encryption for the auditor system
- [ ] Zero-Knowledge circuits for proving commitment membership without revealing specifics
- [ ] Merkle tree integration for enhanced commitment storage security
- [ ] SDK and developer tools for easy integration

---

> This documentation presents our conceptual design and vision for Avacado.  
> Implementation is planned for future development, and all specifications are subject to change.  
> 
> **Website:** [avacado.app](https://www.avacado.app/)
