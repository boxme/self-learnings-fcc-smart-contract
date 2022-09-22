const { getNamedAccounts, ethers, deployments } = require("hardhat");

async function main() {
    const {deployer} = await getNamedAccounts();
    const fundMeDeployment = await deployments.get("FundMe");
    const fundMe = await ethers.getContractAt(fundMeDeployment.abi, fundMeDeployment.address);
    console.log('Got contract FundMe at ${fundMe.address}');
    console.log("Funding contract...");
    const transactionResponse = await fundMe.fund({
        value: ethers.utils.parseEther("0.1"),
    });
    await transactionResponse.wait();
    console.log("Funded!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })