'use strict'
const ethers = require("ethers");
const fs = require("fs");

const L2_RPC_ENDPOINT = "https://l2rpc.a1.taiko.xyz"
const BATCH_SIZE = 5000;

const proposersSet = new Set()

async function main() {
  const l2Provider = new ethers.providers.JsonRpcBatchProvider(L2_RPC_ENDPOINT);

  const l2Head = await l2Provider.getBlockNumber()

  console.log({ l2Head })

  try {
    for (let i = 1; i <= l2Head; i += BATCH_SIZE) {
      let batchEnd = i + BATCH_SIZE - 1;
      if (batchEnd > l2Head) batchEnd = l2Head;

      const batchBlockHeights = new Array(batchEnd - i + 1)
        .fill(0)
        .map((_, j) => i + j);

      await Promise.all(batchBlockHeights.map(async function (height) {
        console.log(`Block: ${height}`);

        const block = await l2Provider.getBlock(height)

        proposersSet.add(block.miner)
      }))
    }
  } catch (error) {
    console.error(error)
  }

  const proposersArray = Array.from(proposersSet)
  console.log({ proposers: proposersArray.length })

  fs.writeFileSync("./proposers.json", JSON.stringify({ proposers: proposersArray }));
}

main().catch(console.error)
