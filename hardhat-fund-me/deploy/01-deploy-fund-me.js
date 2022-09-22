const {networkConfig, developmentChains} = require("../helper-hardhat-config.js");
const {network} = require("hardhat");
require("dotenv").config();
const { verify } = require("../utils/verify");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy, log} = deployments;
    const {deployer} = await getNamedAccounts();
    const chainId = network.config.chainId;

    // const ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"];
    let ethUsdPriceFeedAddress;
    if (developmentChains.includes(network.name)) {
        // Deployment to localhost
        const ethUsdPriceFeedAggregator = await deployments.get("MockV3Aggregator");
        ethUsdPriceFeedAddress = ethUsdPriceFeedAggregator.address;
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"];
    }
    log("----------------------------------------------------");
    log("Deploying FundMe and waiting for confirmations...");
    const args = [ethUsdPriceFeedAddress];
    const fundMe = await deploy("FundMe", {
        from: deployer,
        args: args,
        log: true,
        // we need to wait if on a live network so we can verify properly
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    log(`FundMe deployed at ${fundMe.address}`)

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        await verify(fundMe.address, args);
    }
}

module.exports.tags = ["all", "fundme"];