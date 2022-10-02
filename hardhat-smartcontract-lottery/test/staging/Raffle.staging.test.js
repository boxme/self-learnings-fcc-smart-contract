const { assert, expect } = require("chai");
const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Staging Tests", function () {
          let raffle, raffleContract, deployer, raffleEntranceFee;

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer;
              raffle = await ethers.getContract("Raffle", deployer);
              raffleEntranceFee = await raffle.getEntranceFee();
          });

          describe("fulfillRandomWords", () => {
              it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async () => {
                  console.log("Setting up test...");
                  const startingtimestamp = await raffle.getLastTimeStamp();
                  const accounts = await ethers.getSigners();

                  console.log("Setting up Listener...");
                  await new Promise(async (resolve, reject) => {
                      // Set up listener before we enter the raffle
                      // Just in case the blockchain moves fast

                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event is fired!");

                          try {
                              const recentWinner = await raffle.getRecentWinner();
                              const raffleState = await raffle.getRaffleState();
                              const winnerEndingBalance = await accounts[0].getBalance();
                              const endingTimestamp = await raffle.getLastTimeStamp();

                              await expect(raffle.getPlayer(0)).to.be.reverted;
                              assert.equal(recentWinner.toString(), accounts[0].address);
                              assert.equal(raffleState, 0);
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(raffleEntranceFee).toString()
                              );
                              assert(endingTimestamp > startingTimestamp);
                              resolve(); // if try passes, resolves the promise
                          } catch (e) {
                              console.log(e);
                              reject(e);
                          }
                      });

                      console.log("Entering Raffle...");
                      const tx = await raffle.enterRaffle({ value: raffleEntranceFee });
                      await tx.wait(1);
                      console.log("Ok, time to wait...");
                      const winnerStartingBalance = await accounts[0].getBalance();

                      // and this code WONT complete until our listener has finished listening!
                  });
              });
          });
      });
