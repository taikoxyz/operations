"use strict";
const ethers = require("ethers");
const fs = require("fs");

const L2_RPC_ENDPOINT = "https://l2rpc.a1.taiko.xyz"

const L2_BLOCK_START_HEIGHT = 0;
// 512862 timestamp: Thu, 05 Jan 2023 23:59:52 GMT
// 512863 timestamp: Fri, 06 Jan 2023 00:00:16 GMT
const L2_BLOCK_END_HEIGHT = 512862;

const GOLDEN_TOUCH_ADDRESS = "0x0000777735367b36bC9B61C50022d9D0700dB4Ec";
const L2_BRIDGE_ADDRESS = "0x0000777700000000000000000000000000000004";
const L2_TOKEN_VAULT_ADDRESS = "0x0000777700000000000000000000000000000002";

// Any user with a bridging transaction + one other type of transaction (transfer, dapp tx)
const REASON_USED_BRIDGE = "REASON_USED_BRIDGE";
const REASON_USED_OTHER_TYPES_OF_TXS = "REASON_USED_OTHER_TYPES_OF_TXS";

const BATCH_SIZE = 5000;

let blocksScanned = 0
let txsScanned = 0
let successfulTxs = 0

class Account {
  constructor(address, reason) {
    this.address = address;
    this.reasons = [reason];
    this.successfulTxsCount = 1;
  }
}

class AccountsList {
  constructor() {
    this.accountList = [];
  }

  addAccountWithReason(address, reason) {
    const idx = this.accountList.findIndex(
      (account) => account.address === address
    );

    if (idx < 0) {
      this.accountList.push(new Account(address, reason));
      return;
    }

    this.accountList[idx].successfulTxsCount += 1;
    if (!this.accountList[idx].reasons.includes(reason)) {
      this.accountList[idx].reasons.push(reason);
    }
  }

  getEligibleAccounts() {
    return this.accountList
      .filter((account) => account.reasons.length >= 2)
      .sort((a, b) => {
        if (a.successfulTxsCount > b.successfulTxsCount) return -1;
        if (a.successfulTxsCount < b.successfulTxsCount) return 1;
        return 0;
      });
  }
}

async function main() {
  const l2Provider = new ethers.providers.JsonRpcBatchProvider(L2_RPC_ENDPOINT);
  const accountsList = new AccountsList();
  const bridgeInterface = new ethers.utils.Interface(require("./artifacts/Bridge.json").abi);
  const tokenVaultInterface = new ethers.utils.Interface(require("./artifacts/TokenVault.json").abi);

  const processMessageSelector = bridgeInterface.getSighash("processMessage");
  const sendEtherSelector = tokenVaultInterface.getSighash("sendEther");
  const sendERC20Selector = tokenVaultInterface.getSighash("sendERC20");

  for (
    let i = L2_BLOCK_START_HEIGHT;
    i <= L2_BLOCK_END_HEIGHT;
    i += BATCH_SIZE
  ) {
    let batchEnd = i + BATCH_SIZE - 1;
    if (batchEnd > L2_BLOCK_END_HEIGHT) batchEnd = L2_BLOCK_END_HEIGHT;

    const batchBlockHeights = new Array(batchEnd - i + 1)
      .fill(0)
      .map((_, j) => i + j);

    await Promise.all(
      batchBlockHeights.map(async function (height) {
        console.log(`Block: ${height}`);

        const block = await l2Provider.getBlockWithTransactions(height);

        blocksScanned += 1;

        for (const tx of block.transactions) {
          txsScanned += 1;
          if (tx.from === GOLDEN_TOUCH_ADDRESS) continue; // ignore those `TaikoL2.anchor` transactions
          const receipt = await l2Provider.getTransactionReceipt(tx.hash);
          if (receipt.status !== 1) continue;
          successfulTxs += 1;

          // Bridging transaction: L1 => L2 ETHs && ERC-20s
          // we use `message.owner` to identify the actual user L2 account address,
          // since `tx.from` is always the relayer account.
          if (
            tx.data &&
            tx.to === L2_BRIDGE_ADDRESS &&
            tx.data.startsWith(processMessageSelector)
          ) {
            const { message } = bridgeInterface.decodeFunctionData(
              "processMessage",
              tx.data
            );

            accountsList.addAccountWithReason(
              message.owner,
              REASON_USED_BRIDGE
            );
            continue;
          }

          // Bridging transaction: L2 => L1 ETHs && ERC-20s
          // we can simply use `tx.from` to identify the actual user L2 account address.
          if (
            tx.data &&
            tx.to == L2_TOKEN_VAULT_ADDRESS &&
            (tx.data.startsWith(sendEtherSelector) || tx.data.startsWith(sendERC20Selector))
          ) {
            accountsList.addAccountWithReason(
              tx.from,
              REASON_USED_BRIDGE
            );
            continue;
          }

          // Other types of transaction (transfer, dapp tx)
          accountsList.addAccountWithReason(
            tx.from,
            REASON_USED_OTHER_TYPES_OF_TXS
          );
        }
      })
    );
  }

  const wallets = accountsList.getEligibleAccounts().map((account) => {
    return {
      address: account.address,
      successfulTxsCount: account.successfulTxsCount,
    };
  });

  console.log({ blocksScanned, txsScanned, successfulTxs })
  console.log(
    `Accounts at least finished one task: ${accountsList.accountList.length}`
  );
  console.log(`Eligible accounts: ${wallets.length}`);

  fs.writeFileSync("./wallets.json", JSON.stringify({ wallets }));

  // eslint-disable-next-line no-process-exit
  process.exit(0);
}

main().catch(console.error);
