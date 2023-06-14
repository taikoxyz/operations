const fs = require("fs");
const ethers = require("ethers");

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
    const data = JSON.parse(fs.readFileSync("./provers.json"));
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_ENDPOINT);

    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(process.env.TTKO_ADDRESS, abi, wallet);
   
    let nonce = await wallet.getTransactionCount();
   
    await Promise.all(data.map(async (prover, i) => {
        if(prover.sent) return;
        const amount = ethers.utils.parseUnits("50", 8);
        console.log(`sending ${amount} to ${prover.address}`)
        nonce = nonce + i;
        
        const tx = await contract.transfer(prover.address, amount, {
            nonce
        });

        await tx.wait(3); // wait for 3 confs?
        prover.sent = true;
        prover.txHash = tx.hash;
        data[i] = prover;
        fs.writeFileSync("./provers.json", JSON.stringify(data));
    }));
}
main().then(() => console.log("done")).catch(console.error);
