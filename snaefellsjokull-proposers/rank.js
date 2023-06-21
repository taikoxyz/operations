'use strict'
const ethers = require("ethers");
const fs = require("fs");

const L2_RPC_ENDPOINT = "http://localhost:28545"
const BATCH_SIZE = 5000;

const proposers = {}

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

        if (!proposers[block.miner]) {
          proposers[block.miner] = { proposed: 1 }
        } else {
          proposers[block.miner].proposed++
        }
      }))
    }
  } catch (error) {
    console.error(error)
  }

  let proposersArray = []
  for (const proposer of Object.keys(proposers)) {
    proposersArray.push({ address: proposer, proposed: proposers[proposer].proposed })
  }

  proposersArray = proposersArray.sort(function (a, b) {
    return b.proposed - a.proposed
  })

  fs.writeFileSync("./rank.json", JSON.stringify({ rank: proposersArray }));
}

main().catch(console.error)
