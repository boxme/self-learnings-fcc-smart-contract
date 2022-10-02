const { assert, expect } = require("chai");
const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let raffle,
              raffleContract,
              vrfCoordinatorV2Mock,
              raffleEntranceFee,
              interval,
              player,
              accounts;

          beforeEach(async () => {
              // Can't use getNamedAccounts() because it's returning VoidSigner
              //   namedAccounts = await getNamedAccounts();
              //   deployer = namedAccounts.deployer;
              //   player = namedAccounts.player;
              accounts = await ethers.getSigners();
              deployer = accounts[0];
              player = accounts[1];
              await deployments.fixture(["mocks", "raffle"]);

              const vrfCoordinatorV2MockDeployment = await deployments.get("VRFCoordinatorV2Mock");
              vrfCoordinatorV2Mock = await ethers.getContractAt(
                  vrfCoordinatorV2MockDeployment.abi,
                  vrfCoordinatorV2MockDeployment.address
              );

              const raffleContractDeployment = await deployments.get("Raffle");
              raffleContract = await ethers.getContractAt(
                  raffleContractDeployment.abi,
                  raffleContractDeployment.address
              );

              // Returns a new instance of the Raffle contract connected to player
              raffle = raffleContract.connect(player);
              raffleEntranceFee = await raffle.getEntranceFee();
              interval = await raffle.getInterval();
          });

          describe("contructor", async function () {
              it("initializes the raffle correctly", async () => {
                  raffleEntranceFee = await raffle.getEntranceFee();
                  const raffleState = (await raffle.getRaffleState()).toString();
                  assert.equal(raffleState, "0");
                  assert.equal(
                      interval.toString(),
                      networkConfig[network.config.chainId]["keepersUpdateInterval"]
                  );
              });
          });

          describe("enterRaffle", async () => {
              it("reverts when you don't pay enough", async () => {
                  await expect(raffle.enterRaffle()).to.be.revertedWith(
                      "Raffle__NotEnoughETHEntered"
                  );
              });

              it("records player when they enter", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  const contractPlayerAddress = await raffle.getPlayer(0);
                  assert.equal(player.address, contractPlayerAddress);
              });

              it("emits event on enter", async () => {
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.emit(
                      raffle,
                      "RaffleEnter"
                  );
              });

              it("doesn't allow entrance when raffle is calculating", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  // await network.provider.send("evm_mine", []);
                  await network.provider.request({ method: "evm_mine", params: [] });

                  // changes the state to calculating for our comparison below
                  await raffle.performUpkeep([]);
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith(
                      "Raffle__RaffleNotOpen"
                  );
              });
          });

          describe("checkUpKeep", async () => {
              it("returns false if people haven't sent any ETH", async () => {
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);

                  // callStatic is an ether.js way of calling a function and ask the
                  // contract/node to ignore state changes
                  // Without state changes, the return value(s) will be the ones written in the
                  // contract code. Else, contract function will always return a transaction
                  // https://ethereum.stackexchange.com/questions/34252/why-does-a-function-in-a-contract-that-creates-a-transaction-returns-a-transac
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x");
                  assert(!upkeepNeeded);
              });

              it("returns false if raffle isn't open", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  await raffle.performUpkeep([]); // changes the state to calculating

                  const raffleState = await raffle.getRaffleState(); // stores the new state
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x"); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)

                  assert.equal(raffleState.toString() == "1", upkeepNeeded == false);
              });

              it("returns false if enough time hasn't passed", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 5]); // use a higher number here if this test fails
                  //   await network.provider.request({ method: "evm_mine", params: [] });
                  await network.provider.send("evm_mine", []);

                  // "0x" is for empty byte. [] works too.
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x");
                  assert(!upkeepNeeded);
              });

              it("returns true if enough time has passed, has players, eth, and is open", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x"); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert(upkeepNeeded);
              });
          });

          describe("performUpkeep", async () => {
              it("can only if checkupkeep is true", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  const tx = await raffle.performUpkeep("0x");
                  console.log(tx);
                  assert(tx);
              });

              it("reverts if checkup is false", async () => {
                  await expect(raffle.performUpkeep("0x")).to.be.revertedWith(
                      "Raffle__UpkeepNotNeeded"
                  );
              });

              it("updates the raffle state and emits a requestId", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  const txResponse = await raffle.performUpkeep("0x"); // emits requestId
                  const txReceipt = await txResponse.wait(1); // waits 1 block
                  console.log(txReceipt);
                  const raffleState = await raffle.getRaffleState(); // updates state
                  // Check for the 2nd event because vrf coordinator will emit an event itself first.
                  const requestId = txReceipt.events[1].args.requestId;
                  assert(requestId.toNumber() > 0);
                  assert(raffleState == 1); // 0 = open, 1 = calculating
              });
          });

          describe("fulfillRandomWords", async () => {
              beforeEach(async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
              });

              it("can only be called after performUpkeep", async () => {
                  // performUpkeep in the contract makes a request to vrf for random words
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
                  ).to.be.revertedWith("nonexistent request");

                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address) // reverts if not fulfilled
                  ).to.be.revertedWith("nonexistent request");
              });

              // This test simulates users entering the raffle and wraps the entire functionality of the raffle
              // inside a promise that will resolve if everything is successful.
              // An event listener for the WinnerPicked is set up
              // Mocks of chainlink keepers and vrf coordinator are used to kickoff this winnerPicked event
              // All the assertions are done once the WinnerPicked event is fired
              it("picks a winner, resets, and sends money", async () => {
                  const additionalEntrances = 3;
                  const startingIndex = 2;
                  for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
                      // Returns a new instance of the Raffle contract connected to a player
                      raffle = raffleContract.connect(accounts[i]);
                      await raffle.enterRaffle({ value: raffleEntranceFee });
                  }

                  const startingTimestamp = await raffle.getLastTimeStamp();

                  await new Promise(async (resolve, reject) => {
                      // Event listener for "WinnerPicked" event
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event is fired!");
                          // assert throws an error if it fails, so we need to wrap
                          // it in a try/catch so that the promise returns event
                          // if it fails.
                          try {
                              const recentWinner = await raffle.getRecentWinner();
                              const raffleState = await raffle.getRaffleState();
                              const winnerBalance = await accounts[2].getBalance();
                              const endingTimestamp = await raffle.getLastTimeStamp();

                              // Comparisons to check if our ending values are correct
                              assert.equal(recentWinner.toString(), accounts[2].address);
                              assert.equal(raffleState, 0);
                              assert.equal(
                                  winnerBalance.toString(),
                                  startingBalance // startingBalance + ( (raffleEntranceFee * additionalEntrances) + raffleEntranceFee )
                                      .add(
                                          raffleEntranceFee
                                              .mul(additionalEntrances) // multiply
                                              .add(raffleEntranceFee)
                                      )
                                      .toString()
                              );
                              assert(endingTimestamp > startingTimestamp);
                              resolve(); // if try passes, resolves the promise
                          } catch (e) {
                              reject(e);
                          }
                      });

                      // Kicking off the event by mocking the chainlink keepers and vrf coordinator
                      const tx = await raffle.performUpkeep("0x");
                      const txReceipt = await tx.wait(1);
                      console.log(txReceipt);
                      const startingBalance = await accounts[2].getBalance();
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.events[1].args.requestId,
                          raffle.address
                      );
                  });
              });
          });
      });
