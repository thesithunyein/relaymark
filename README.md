# Relaymark

Approve the exact text of a joint launch, release, or public announcement. One
Agent ID wallet submits a draft. A different Agent ID wallet records a decision.
Anyone can check published text against the approval without connecting a wallet.

## Product flow

1. Open **New request**, enter the reviewer’s Agent ID wallet address, and paste or upload the exact text.
2. Confirm the request in your wallet. Share its review link. For longer or sensitive drafts, send the text file through your team's existing private channel alongside the public receipt.
3. The designated reviewer opens the draft, confirms it matches the recorded fingerprint, and approves or declines from their own wallet.
4. Share the public receipt alongside the published text. A change in the text needs a fresh request. The sender or reviewer can revoke an active approval.

The contract records the text fingerprint, wallet addresses, timestamps and decision.
It has no owner, admin key, upgrade mechanism, asset custody or payable functions.
Hashes use Keccak-256 over UTF-8 text, with CRLF and CR normalized to LF. The title
is a local label outside the fingerprint. Approval establishes the wallet’s decision
on that fingerprint. Team affiliation and the accuracy of the text are external to the receipt.

The review link includes the draft in its browser fragment. It can be read by anyone
who gets the full link. Drafts saved on the device can remain in browser storage.
The public receipt link contains only the request number.

## Development

Use Node.js 22 or later and Foundry.

```sh
npm ci
npm run dev
npm run check
forge test
npm run build
```

The frontend displays a disconnected deployment state until a contract address is
configured. For local end-to-end testing, run Anvil, deploy the test registry and
Relaymark, then run Vite with `--mode localchain`. The local mode accepts
`VITE_AGENT_ID_ADDRESS`, `VITE_CONTRACT_ADDRESS`, and `VITE_BSC_RPC_URL`; a
production build always uses the official Agent ID registry on BNB Smart Chain.

## Production deployment

1. Use a funded BNB Smart Chain wallet to deploy `contracts/Relaymark.sol:Relaymark`.
   The constructor takes the official Agent ID registry
   `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`. Use the compiler settings pinned in
   `foundry.toml`. Sign with a hardware wallet, an encrypted Foundry keystore, or
   the local browser-wallet deployment helper below.
2. Verify the exact source and constructor arguments on BscScan. Confirm the
   contract’s `agentId()` points to the official registry.
3. Set `VITE_CONTRACT_ADDRESS` in the Vercel production environment and deploy.
   `VITE_BSC_RPC_URL` is optional. It is public frontend configuration and must
   be an HTTPS RPC endpoint suitable for browser access.
4. Open the deployed app, verify that a direct receipt route loads, and complete
   a first request and review from two real Agent ID holders.

### Local browser-wallet deployment helper

Run `forge build` and then `npm run deploy:wallet`. Open the localhost URL shown
by the script in a browser with a funded BNB Smart Chain wallet. Review the
estimated gas and confirm the creation transaction in that wallet. The helper
does not receive private keys or sign on your behalf.

### Wallets

Use an injected browser wallet with the registered address or use the Binance
Agentic Wallet CLI option. Relaymark prepares a zero-value call and checks the
confirmed transaction against the selected action. Developer Mode and the
official CLI flow are described in the
[wallet reference](https://github.com/binance/binance-skills-hub/blob/main/skills/binance-web3/binance-agentic-wallet/references/external-sign.md).
