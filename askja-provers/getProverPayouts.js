const fs = require("fs");
const { parse } = require("csv-parse");

const arr = [];
const totalReward = 25000; // 25000 USDC
let totalBlocks = 0;

function isWhatPercentOf(x, y) {
    return (x / y);
  }

fs.createReadStream("./provers.csv")
  .pipe(parse())
  .on("data", function (row) {
    if(row[0] === "0x0000000000000000000000000000000000000000") return;
    const obj = {
        address: row[0],
        blocks: Number(row[1])
    };
    totalBlocks = totalBlocks + Number(row[1]);
    arr.push(obj);
  }).on("end", function () {
    arr.forEach(prover => {
        const percentage = isWhatPercentOf(prover.blocks, totalBlocks);
        console.log(percentage);
        const reward = percentage * totalReward;
        // console.log("reward", reward);
        prover.reward = reward;
    })

    console.log(arr);
    fs.writeFileSync("output.json", JSON.stringify(arr));

    let sum = 0;
    arr.forEach(prover => {
        sum = sum + prover.reward;
    })

    console.log("sum", sum); // 25000.0000000000000076
  })
  .on("error", function (error) {
    console.log(error.message);
  });