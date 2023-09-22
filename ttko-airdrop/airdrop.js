const fs = require("fs");
const ethers = require("ethers");
var Mutex = require('async-mutex').Mutex;

const abi = [
    {
        "inputs": [
          {
            "internalType": "address",
            "name": "to",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "transfer",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      },
];

async function main() {
    const mutex = new Mutex();
    const data = JSON.parse(fs.readFileSync(process.env.DATA_FILE));
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_ENDPOINT);

    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(process.env.TTKO_ADDRESS, abi, wallet);
   
    let nonce = await wallet.getTransactionCount();

    let firstTx = true;
    await Promise.all(data.map(async (airdroppee, i) => {
        if(airdroppee.sent) return;
        if(airdroppee.address == "0x0000000000000000000000000000000000000000") return;
        if(airdroppee.address == "0x0000000000000000000000000000000000000001") return;
        
        const amount = ethers.utils.parseUnits("2.5", 18);
        const release = await mutex.acquire();
        nonce = i == 0 || firstTx ? nonce : nonce + 1;
        if(firstTx) {
            firstTx = false;
        }
        console.log(`sending ${amount} to ${airdroppee.address} with nonce ${nonce}`)
        const tx = await contract.transfer(airdroppee.address, amount, {
             nonce
        });
        release();


        await tx.wait(2);
        airdroppee.sent = true;
        airdroppee.txHash = tx.hash;
        fs.writeFileSync(process.env.DATA_FILE, JSON.stringify(data));
    }));
}
main().then(() => console.log("done")).catch(console.error);
