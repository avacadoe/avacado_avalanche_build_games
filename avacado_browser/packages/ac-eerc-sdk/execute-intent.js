import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji } from "viem/chains";

// Configuration
const PRIVATE_KEY = "0x" + (process.argv[2] || "95492791d9e40b7771b8b57117c399cc5e27d99d4959b7f9592925a398be7bdb");
if (!PRIVATE_KEY) {
    console.error("Usage: node execute-intent.js <private_key>");
    process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY);

const client = createPublicClient({
    chain: avalancheFuji,
    transport: http("https://api.avax-test.network/ext/bc/C/rpc"),
});

const walletClient = createWalletClient({
    account,
    chain: avalancheFuji,
    transport: http("https://api.avax-test.network/ext/bc/C/rpc"),
});

// Contract details
const CONTRACT_ADDRESS = "0x5894792d827D56057718Ca15B266D1A7C4eb3682";
const ERC20_ADDRESS = "0x2d13f85a3b201637Ad02F339b461749881f7d49d";

// Get the correct tokenId for the ERC20 token
const tokenId = await client.readContract({
    address: CONTRACT_ADDRESS,
    abi: [{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"tokenIds","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}],
    functionName: "tokenIds",
    args: [ERC20_ADDRESS],
});

// Intent execution parameters
const intentHash =
    "0x1982ee5796a1c70842f7a933130d2d1760046baddce62c9b7176f6810acf439a";
const destination = "0xE6670193988c10D8C1460F118B6223244a4f558A";
const amount = 100n;
const nonce = 1n;

// Proof data
const proof = {
    proofPoints: {
        a: [
            "0x17459b0fe403e5ef05b78c597fb96d5c2f1851487da421da25386e55b2b09c07",
            "0x2f7b22cfc21ec978ccc23a8d6bdce3cd70481a9117dd6ce6e8e2ddee3b139ba6",
        ],
        b: [
            [
                "0x2ab7e95fa29191f00d286e21c3070900b2a592989f78f71e943eef92bb67884d",
                "0x2ce36f6a9120455112f7b678ca0937baf7435cda9d6e76ba0800fa0aaaf308e0",
            ],
            [
                "0x22ee1fdf5ef9debdb4cded77ff5698319f3a3b76f9b51cab4bce879a99f0cc95",
                "0x280ab7f0a055e6de46f0be2791794c96503f4565462574765b9c59c47af293a7",
            ],
        ],
        c: [
            "0x09a280ca8e7c1ee92686aac0637262b7bef0de720f5422db0accfb90762c4bba",
            "0x2bbb8a060e3d33078a8b01bc406b8cc4e5719047433d26754e3549fa3f30bbc8",
        ],
    },
    publicSignals: [
        "0x0fd68e06a5a218cb2cdaa39ce8dd9d9e50b374b2e1faa90ae16a116485184bc7",
        "0x1dc646d171166637d5ebaa6bd2a801ff4513043f01f9cd6a1a586fdac71adf89",
        "0x00e40906de303ca22e43cdc8ca76d11b13c5a3ef20f266b444a47e6af6d3fd71",
        "0x0bbe5facc80dc90b3c0a162000ac5be401c70f7dcf258ba65e94cb35792de912",
        "0x239e3fa02802905fa75ee126d1bbc65effc94fb729fde2224836a8a1add8f374",
        "0x02790110f1121ddf8f61edab1c6d4bf451dba88d0d61ecad94b04578559bed2c",
        "0x0fd68e06a5a218cb2cdaa39ce8dd9d9e50b374b2e1faa90ae16a116485184bc7",
        "0x1dc646d171166637d5ebaa6bd2a801ff4513043f01f9cd6a1a586fdac71adf89",
        "0x19f2d001203b95c23ad9c530ecd16f65b190275795e7697abbeb797b14f15c50",
        "0x272a00ae676650e5425a1658b59bc57367ed5d44a943567e28d1b8e8795d65ab",
        "0x11b249c3fa5490ce49aa7993ad2fd69a62dab4226d18cbfd52f2502f42fc9760",
        "0x0f48d00355758e11dcc64a258604c8e978972c08b2204b16b0569d04fe95815b",
        "0x2eb0fd9030aa1bf27cd31931c2c95dae4cc7cd2be15d03e3e1fda616211ea416",
        "0x146af66e3199108743fec90ee6d2fe9f10fc885b700c0a548fb434c344f411bd",
        "0x00000000000000000000000000000000d59660e22b82775dc3273e34d97f8cc3",
        "0x1982ee5796a1c70842f7a933130d2d1760046baddce62c9b7176f6810acf439a",
    ],
};

// Balance PCT
const balancePCT = [
    "11686345408367509288683245665803764096677769172587708399179619104571715573163",
    "1720133044893311018886819046607598418483165043181015214924498291829214741467",
    "662232778232773305457390052147088262417453551719676452042028495640096741704",
    "3360356011603547972355761697463374622542216652036052046383782951469817254502",
    "4318034313775669644458744908841454906748163458344097994669329411556726066677",
    "19906274110779578235051566025053966725588961226775106791602341049751138215423",
    "175674693032711352592141828973284735250",
];

const intentMetadata = "0x";

async function executeIntent() {
    try {
        console.log("🔄 Executing withdraw intent...");
        console.log("Intent Hash:", intentHash);
        console.log("Token ID:", tokenId.toString());
        console.log("Destination:", destination);
        console.log("Amount:", amount.toString());
        console.log("Nonce:", nonce.toString());

        // Format proof for contract call
        const formattedProof = [
            proof.proofPoints.a,
            proof.proofPoints.b,
            proof.proofPoints.c,
        ];

        const hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS,
            abi: [
                {
                    inputs: [
                        {
                            internalType: "bytes32",
                            name: "intentHash",
                            type: "bytes32",
                        },
                        {
                            internalType: "uint256",
                            name: "tokenId",
                            type: "uint256",
                        },
                        {
                            internalType: "address",
                            name: "destination",
                            type: "address",
                        },
                        {
                            internalType: "uint256",
                            name: "amount",
                            type: "uint256",
                        },
                        {
                            internalType: "uint256",
                            name: "nonce",
                            type: "uint256",
                        },
                        {
                            internalType: "tuple",
                            name: "proof",
                            type: "tuple",
                            components: [
                                {
                                    internalType: "uint256[2]",
                                    name: "a",
                                    type: "uint256[2]",
                                },
                                {
                                    internalType: "uint256[2][2]",
                                    name: "b",
                                    type: "uint256[2][2]",
                                },
                                {
                                    internalType: "uint256[2]",
                                    name: "c",
                                    type: "uint256[2]",
                                },
                            ],
                        },
                        {
                            internalType: "uint256[7]",
                            name: "balancePCT",
                            type: "uint256[7]",
                        },
                        {
                            internalType: "bytes",
                            name: "intentMetadata",
                            type: "bytes",
                        },
                    ],
                    name: "executeWithdrawIntent",
                    outputs: [],
                    stateMutability: "nonpayable",
                    type: "function",
                },
            ],
            functionName: "executeWithdrawIntent",
            args: [
                intentHash,
                tokenId,
                destination,
                amount,
                nonce,
                formattedProof,
                balancePCT,
                intentMetadata,
            ],
        });

        console.log("✅ Intent executed successfully!");
        console.log("Transaction Hash:", hash);

        // Wait for confirmation
        console.log("⏳ Waiting for confirmation...");
        const receipt = await client.waitForTransactionReceipt({ hash });
        console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    } catch (error) {
        console.error("❌ Failed to execute intent:", error);
        process.exit(1);
    }
}

executeIntent();
