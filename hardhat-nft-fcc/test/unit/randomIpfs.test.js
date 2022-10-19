const { assert, expect } = require("chai");
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Dynamic NFT Unit Tests", function () {
          let randomNft, deployer, vrfCoordinatorV2Mock;

          beforeEach(async () => {
              accounts = await ethers.getSigners();
              deployer = accounts[0];
              await deployments.fixture(["mocks", "randomipfs"]);
              randomNft = await ethers.getContract("RandomIpfsNft");
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
          });

          describe("Constructor", async () => {
              it("Initialize RandomNft correctly", async () => {
                  const isInitialized = await randomNft.getInitialized();
                  const dogTokenUriZero = await randomNft.getDogTokenUris(2);
                  assert.equal(isInitialized, true);
                  assert(dogTokenUriZero.includes("ipfs://"));
              });
          });

          describe("Request Nft", async () => {
              it("Reject request if min mintFee is not met", async () => {
                  const mintFee = await randomNft.getMintFee();
                  await expect(
                      randomNft.requestNft({ value: mintFee.sub(ethers.utils.parseEther("0.001")) })
                  ).to.be.revertedWith("RandomIpfsNft__NeedMoreETHSent");
              });

              it("Emits an event and kicks off a random word request", async () => {
                  const mintFee = await randomNft.getMintFee();
                  await expect(randomNft.requestNft({ value: mintFee.toString() })).to.emit(
                      randomNft,
                      "NftRequested"
                  );
              });
          });

          describe("fulfillRandomWords", async () => {
              it("mints NFT after random number is returned", async () => {
                  await new Promise(async (resolve, reject) => {
                      randomNft.once("NftMinted", async () => {
                          try {
                              const tokenUri = await randomNft.tokenURI("0");
                              const tokenCounter = await randomNft.getTokenCounter();
                              assert.equal(tokenUri.toString().includes("ipfs://"), true);
                              assert.equal(tokenCounter.toString(), "1");
                              resolve();
                          } catch (e) {
                              console.log(e);
                              reject(e);
                          }
                      });

                      try {
                          const fee = await randomNft.getMintFee();
                          const requestNftResponse = await randomNft.requestNft({
                              value: fee.toString(),
                          });
                          const requestNftReceipt = await requestNftResponse.wait(1);
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              requestNftReceipt.events[1].args.requestId,
                              randomNft.address
                          );
                      } catch (e) {
                          console.log(e);
                          reject(e);
                      }
                  });
              });
          });

          describe("getBreedFromModdedRng", () => {
              it("should return pug if moddedRng < 10", async function () {
                  const expectedValue = await randomNft.getBreedFromModdedRng(7);
                  assert.equal(0, expectedValue);
              });
              it("should return shiba-inu if moddedRng is between 10 - 39", async function () {
                  const expectedValue = await randomNft.getBreedFromModdedRng(21);
                  assert.equal(1, expectedValue);
              });
              it("should return st. bernard if moddedRng is between 40 - 99", async function () {
                  const expectedValue = await randomNft.getBreedFromModdedRng(77);
                  assert.equal(2, expectedValue);
              });
              it("should revert if moddedRng > 99", async function () {
                  await expect(randomNft.getBreedFromModdedRng(100)).to.be.revertedWith(
                      "RandomIpfsNft__RangeOutOfBounds"
                  );
              });
          });
      });
