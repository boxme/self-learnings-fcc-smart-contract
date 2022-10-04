const { getNamedAccounts, ethers, network } = require("hardhat");
const { getWeth, AMOUNT } = require("../scripts/getWeth");
const { networkConfig } = require("../helper-hardhat-config");

async function main() {
    // Swap ETH for Weth
    await getWeth();

    const { deployer } = await getNamedAccounts();
    const lendingPool = await getLendingPool(deployer);
    console.log(`LendingPool address ${lendingPool.address}`);

    const wethTokenAddress = networkConfig[network.config.chainId].wethToken;
    await approveErc20(wethTokenAddress, lendingPoolAddress, AMOUNT, deployer);
    console.log("Depositing ETH..");
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0);
    console.log("Deposited");

    // Get your borrowing stats
    const { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(lendingPool, deployer);
}

async function getLendingPool(account) {
    const lendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        networkConfig[network.config.chainId].lendingPoolAddressesProvider,
        account
    );

    const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool();
    const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account);
    return lendingPool;
}

async function approveErc20(erc20Address, spenderAddress, amount, signer) {
    const erc20Token = await ethers.getContractAt("IERC20", erc20Address, signer);
    const txResponse = await erc20Token.approve(spenderAddress, amount);
    await txResponse.wait(1);
    console.log("Approved!");
}

async function getBorrowUserData(lendingPool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
        await lendingPool.getUserAccountData(account);

    console.log(`You have ${totalCollateralETH} worth of ETH deposited.`);
    console.log(`You have ${totalDebtETH} worth of ETH borrowed.`);
    console.log(`You can borrow ${availableBorrowsETH} worth of ETH.`);

    return { availableBorrowsETH, totalDebtETH };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
