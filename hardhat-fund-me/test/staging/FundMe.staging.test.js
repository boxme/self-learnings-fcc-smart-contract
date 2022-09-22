const { assert } = require("chai");
const { ethers, network, getNamedAccounts, deployments } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

developmentChains.includes(network.name) 
    ? describe.skip() 
    : describe("FundMe", async function() {
          let fundMe;
          let deployer;
          const sendValue = ethers.utils.parseEther("1");

          beforeEach(async () => {
            deployer = (await getNamedAccounts()).deployer;
            const fundMeDeployment = await deployments.get("FundMe");
            fundMe = await ethers.getContractAt(
                fundMeDeployment.abi, 
                fundMeDeployment.address);
          });

          it("allows people to fund and withdraw", async function() {
            const fundTxResponse = await fundMe.fund({value: sendValue});
            await fundTxResponse.wait(1);

            const withdrawTxResponse = await fundMe.withdraw();
            await withdrawTxResponse.wait(1);

            const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address);
            console.log(endingFundMeBalance.toString() + " should equal -, running assert equal...");
            assert.equal(endingFundMeBalance.toString(), "0");
          });
});