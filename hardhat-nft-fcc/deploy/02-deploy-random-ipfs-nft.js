const { network } = require("hardhat");
const { networkConfig, developmentChains } = require("../helper-hardhat-config");
const { storeImages } = require("../utils/uploadToPinata");

const imagesLocation = "./images/randomNft/";

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
    await handleTokenUris();
    // const args = [
    //     vrfCoordinatorV2Address,
    //     networkConfig[chainId].gasLane,
    //     subscriptionId,
    //     networkConfig[chainId].mintFee,
    //     networkConfig[chainId].callbackGasLimit,
    // ];
};

async function handleTokenUris() {
    tokenUris = [];
    const { responses, files } = await storeImages(imagesLocation);
    console.log(responses);

    return tokenUris;
}

module.exports.tags = ["all", "randomipfs", "main"];
