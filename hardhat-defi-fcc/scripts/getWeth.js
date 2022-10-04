const { getNamedAccounts, ethers, network } = require("hardhat");
const { networkConfig } = require("../helper-hardhat-config");

const AMOUNT = ethers.utils.parseEther("0.1");

async function getWeth() {
    const { deployer } = await getNamedAccounts();
    // weth contract address 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
    const iWeth = await ethers.getContractAt(
        "IWeth",
        networkConfig[network.config.chainId].wethToken,
        deployer
    );
    const txResponse = await iWeth.deposit({ value: AMOUNT });
    await txResponse.wait(1);
    const wethBalance = await iWeth.balanceOf(deployer);
    console.log(`Got ${wethBalance.toString()} WETH`);
}

module.exports = { getWeth, AMOUNT };
