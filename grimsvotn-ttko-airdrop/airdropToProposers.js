const fs = require("fs");
const ethers = require("ethers");

const abi = [
    {
        "constant": false,
        "inputs": [
            {
                "name": "to",
                "type": "address"
            },
            {
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "transfer",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

async function main() {
    const data = JSON.parse(fs.readFileSync("../snaefellsjokull-proposers/rank.json"));
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_ENDPOINT);

    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(process.env.TTKO_ADDRESS, abi, wallet);
   
    let nonce = await wallet.getTransactionCount();

    await Promise.all(data.rank.map(async (proposer, i) => {
        if(proposer.sent) return;
        const amount = ethers.utils.parseUnits("50", 8);
        console.log(`sending ${amount} to ${proposer.address}`)
        nonce = nonce + i;
        
        const tx = await contract.transfer(proposer.address, amount, {
            nonce
        });

        await tx.wait(3); // wait for 3 confs?
        proposer.sent = true;
        proposer.txHash = tx.hash;
        data.rank[i] = proposer;
        fs.writeFileSync("./proposersOutput.json", JSON.stringify(data));
    }));
}
main().then(() => console.log("done")).catch(console.error);
