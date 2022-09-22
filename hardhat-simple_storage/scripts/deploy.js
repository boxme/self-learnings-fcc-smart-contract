// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { run, network } = require("hardhat");
const hre = require("hardhat");
// const web3 = require("@nomiclabs/hardhat-web3");
const GOERLI_CHAIN_ID = 5;

async function main() {
  const SimpleStorageFactory = await hre.ethers.getContractFactory(
    "SimpleStorage"
  );
  console.log("Deploying Contract...");
  const simpleStorage = await SimpleStorageFactory.deploy();
  await simpleStorage.deployed();

  console.log("Deployed Contract to:", simpleStorage.address);

  // Verify contract if we're deployed to Goerli test network
  if (
    network.config.chainId === GOERLI_CHAIN_ID &&
    process.env.ETHERSCAN_API_KEY
  ) {
    console.log("Waiting for block confirmation");
    // Wait 6 blocks on the chain before verification.
    await simpleStorage.deployTransaction.wait(6);

    await verify(simpleStorage.address, []);
  }

  const currentValue = await simpleStorage.retrieve();
  console.log(`Current Value is: ${currentValue}`);

  // Update the current value
  const transactionResponse = await simpleStorage.store(7);

  // Wait 1 block on the chain before retrieving.
  await transactionResponse.wait(1);
  const updatedValue = await simpleStorage.retrieve();
  console.log(`Updated Value is: ${updatedValue}`);
}

async function verify(contractAddress, args) {
  console.log("Verifying contract..");
  try {
    // pass the "verify" parameters
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    });
  } catch (e) {
    if (e.message.toLowerCase().includes("already verified")) {
      console.log("Already Verified!");
    } else {
      console.log(e);
    }
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
