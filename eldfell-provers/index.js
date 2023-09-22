const fs = require("fs");
const { parse } = require("csv-parse");

const arr = [];


fs.createReadStream("./eldfellprovers.csv")
  .pipe(parse())
  .on("data", function (row) {
    if(row[0] === "0x0000000000000000000000000000000000000000") return;
    const obj = {
        address: row[0],
        blocks: Number(row[1])
    };
    arr.push(obj);
  }).on("end", function () {
    fs.writeFileSync("a4Provers.json", JSON.stringify(arr));
  })
  .on("error", function (error) {
    console.log(error.message);
  });