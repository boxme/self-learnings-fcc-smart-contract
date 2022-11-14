const { ethers, network } = require("hardhat");
const {
    frontEndContractsFile,
    frontEndContractsFile2,
    frontEndAbiLocation,
    frontEndAbiLocation2,
} = require("../helper-hardhat-config");
// const { fs } = require("fs");

module.exports = async function () {
    if (process.env.UPDATE_FRONT_END) {
        console.log("updating front end...");
        await updateContractAddress();
        await updateAbi();
        console.log("Front end updated!");
    }
};

async function updateContractAddress() {
    const nftMarketplace = await ethers.getContract("NftMarketplace");
    const chainId = network.config.chainId.toString();
    var fs = require("fs");
    const contractAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile, "utf8"));
    if (chainId in contractAddresses) {
        if (!contractAddresses[chainId]["NftMarketplace"].includes(nftMarketplace.address)) {
            contractAddresses[chainId]["NftMarketplace"].push(nftMarketplace.address);
        }
    } else {
        contractAddresses[chainId] = { NftMarketplace: [nftMarketplace.address] };
    }
    fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses));
    fs.writeFileSync(frontEndContractsFile2, JSON.stringify(contractAddresses));
}

async function updateAbi() {
    const nftMarketplace = await ethers.getContract("NftMarketplace");
    var fs = require("fs");
    fs.writeFileSync(
        `${frontEndAbiLocation}NftMarketplace.json`,
        nftMarketplace.interface.format(ethers.utils.FormatTypes.json)
    );
    fs.writeFileSync(
        `${frontEndAbiLocation2}NftMarketplace.json`,
        nftMarketplace.interface.format(ethers.utils.FormatTypes.json)
    );

    const basicNft = await ethers.getContract("BasicNft");
    fs.writeFileSync(
        `${frontEndAbiLocation}BasicNft.json`,
        basicNft.interface.format(ethers.utils.FormatTypes.json)
    );
    fs.writeFileSync(
        `${frontEndAbiLocation2}BasicNft.json`,
        basicNft.interface.format(ethers.utils.FormatTypes.json)
    );
}

module.exports.tags = ["all", "frontend"];
