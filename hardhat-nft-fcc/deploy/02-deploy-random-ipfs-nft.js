const { network } = require("hardhat");
const { networkConfig, developmentChains } = require("../helper-hardhat-config");
const { storeImages, storeTokenUriMetadata } = require("../utils/uploadToPinata");

const imagesLocation = "./images/randomNft/";
const metadataTemplate = {
    name: "",
    description: "",
    image: "",
    attributes: [
        {
            trait_type: "Cuteness",
            value: 100,
        },
    ],
};
let tokenUris = [
    "ipfs://QmaVkBn2tKmjbhphU7eyztbvSQU5EXDdqRyXZtRhSGgJGo",
    "ipfs://QmYQC5aGZu2PTH8XzbJrbDnvhj3gVs7ya33H9mqUNvST3d",
    "ipfs://QmZYmH5iDbD6v3U2ixoVAjioSzvWJszDzYdbeCLquGSpVm",
];

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    let vrfCoordinatorV2Address, subscriptionId;
    log("----------------------------------------------------");
    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2MockDeployment = await deployments.get("VRFCoordinatorV2Mock");
        vrfCoordinatorV2Mock = await ethers.getContractAt(
            vrfCoordinatorV2MockDeployment.abi,
            vrfCoordinatorV2MockDeployment.address
        );
        vrfCoordinatorV2Address = vrfCoordinatorV2MockDeployment.address;

        const txnResponse = await vrfCoordinatorV2Mock.createSubscription();
        const txnReceipt = await txnResponse.wait();
        subscriptionId = txnReceipt.events[0].args.subId;
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2;
        subscriptionId = networkConfig[chainId].subscriptionId;
    }
    log("----------------------------------------------------");
    if (process.env.UPLOAD_TO_PINATA == "true") {
        tokenUris = await handleTokenUris();
    }
    // const args = [
    //     vrfCoordinatorV2Address,
    //     networkConfig[chainId].gasLane,
    //     subscriptionId,
    //     networkConfig[chainId].mintFee,
    //     networkConfig[chainId].callbackGasLimit,
    // ];
};

async function handleTokenUris() {
    // Check out https://github.com/PatrickAlphaC/nft-mix for a pythonic version of uploading
    // to the raw IPFS-daemon from https://docs.ipfs.io/how-to/command-line-quick-start/
    // You could also look at pinata https://www.pinata.cloud/

    tokenUris = [];
    const { responses: imageUploadResponses, files } = await storeImages(imagesLocation);
    for (imageUploadResponseIndex in imageUploadResponses) {
        let tokenUriMetadata = { ...metadataTemplate };
        // Replace pug.png to pug
        tokenUriMetadata.name = files[imageUploadResponseIndex].replace(".png", "");
        tokenUriMetadata.description = `An adorable ${tokenUriMetadata.name} pup!`;
        tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`;
        console.log(`Uploading ${tokenUriMetadata.name}...`);

        // Store JSON to pinata / IPFS
        const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetadata);
        tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`);
    }
    console.log("Token URIs uploaded! They are:");
    console.log(tokenUris);

    return tokenUris;
}

module.exports.tags = ["all", "randomipfs", "main"];
