const fs = require("fs");
const ethers = require("ethers");

const abi = [
    {
        "constant": false,
        "inputs": [
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
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
    const data = JSON.parse(fs.readFileSync("./output.json"));
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_ENDPOINT);

    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(USDC_ADDRESS, abi, wallet);
   

    data.map(async (prover, i) => {
        if(prover.sent) return;
        const amount = ethers.utils.formatUnits(prover.amount, 6);
        const tx = await contract.transfer(prover.address, amount);
        await tx.wait(3); // wait for 3 confs?
        prover.sent = true;
        data[i] = prover;
        fs.writeFileSync("./output.json", JSON.stringify(data));
    });
}
main().then(() => console.log("done")).catch(console.error);
