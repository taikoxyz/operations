const fs = require("fs").promises; // Use fs.promises for async file operations
const ethers = require("ethers");
const Mutex = require('async-mutex').Mutex;

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

async function readData() {
    const data = await fs.readFile(process.env.DATA_FILE, 'utf-8');
    return JSON.parse(data);
}

async function writeData(data) {
    await fs.writeFile(process.env.DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

async function sendTransaction(contract, recipient, nonce) {
    const amount = ethers.utils.parseUnits("2.5", 18);
    console.log(`sending ${amount} to ${recipient.address} with nonce ${nonce}`);
    
    const tx = await contract.transfer(recipient.address, amount, { nonce });
    await tx.wait(2);
    
    return tx;
}

async function main() {
    const mutex = new Mutex();
    const data = await readData();
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_ENDPOINT);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(process.env.TTKO_ADDRESS, abi, wallet);

    let nonce = await wallet.getTransactionCount();
    let firstTx = true;

    await Promise.all(data.map(async (recipient, i) => {
        if (recipient.sent || recipient.address === "0x0000000000000000000000000000000000000000" || recipient.address === "0x0000000000000000000000000000000000000001") {
            return;
        }

        const release = await mutex.acquire();
        nonce = (i === 0 || firstTx) ? nonce : nonce + 1;

        if (firstTx) {
            firstTx = false;
        }

        const tx = await sendTransaction(contract, recipient, nonce);
        release();

        recipient.sent = true;
        recipient.txHash = tx.hash;
        await writeData(data);
    }));
}

main().then(() => console.log("done")).catch(console.error);
