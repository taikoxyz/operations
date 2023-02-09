'use strict'
const fs = require("fs");

const { wallets } = require("./wallets.json")

fs.writeFileSync("./wallets.txt", wallets.map(({ address }) => address).join("\n"))
