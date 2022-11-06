const { assert, expect } = require("chai");
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip // Skip testing if we're not on development chain
    : describe("Nft Marketplace Unit Tests", async () => {
          let nftMarketplace, nftMarketplaceContract, basicNft, basicNftContract;
          const PRICE = ethers.utils.parseEther("0.1");
          const TOKEN_ID = 0;

          beforeEach(async () => {
              // Get a list of accounts in the node, which in this case is on Hardhat Network
              accounts = await ethers.getSigners(); // Can also use getNamedAccounts
              deployer = accounts[0];
              user = accounts[1];

              await deployments.fixture(["all"]);
              nftMarketplaceContract = await ethers.getContract("NftMarketplace");
              // Reconnect to a different signer or provider
              nftMarketplace = nftMarketplaceContract.connect(deployer);

              basicNftContract = await ethers.getContract("BasicNft");
              // Reconnect to a different signer or provider
              basicNft = await basicNftContract.connect(deployer);

              await basicNft.mintNft();
              // NFT must approve marketplace to transact for it. Doing this is we can avoid
              // transferring ownership of NFT to marketplace
              await basicNft.approve(nftMarketplaceContract.address, TOKEN_ID);
          });

          describe("listItem", async () => {
              it("emits an event after listing an item", async () => {
                  expect(await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)).to.emit(
                      "ItemListed"
                  );
              });
              it("exclusively items that haven't been listed", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);

                  // await has to be outside expect() https://ethereum.stackexchange.com/questions/123391/testing-for-custom-error-reverts-in-hardhat
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NftMarketplace__AlreadyListed");
              });
              it("exclusively allows owners to list", async () => {
                  nftMarketplace = nftMarketplace.connect(user);
                  await basicNft.approve(user.address, TOKEN_ID);
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NftMarketplace__NotOwner");
              });
              it("needs approval to list items", async () => {
                  await basicNft.approve(ethers.constants.AddressZero, TOKEN_ID);
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NftMarketplace__NotApprovedForMarketplace");
              });
              it("updates listing with seller and price", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
                  const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID);
                  assert(listing.price.toString() == PRICE.toString());
                  assert(listing.seller.toString() == deployer.address);
              });
          });

          describe("cancelListing", async () => {
              it("reverts if there's no llisting", async () => {
                  await expect(
                      nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWith("NftMarketplace__NotListed");
              });
              it("reverts if anyone but the owner tries to call", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
                  nftMarketplace = nftMarketplaceContract.connect(user);
                  await basicNft.approve(user.address, TOKEN_ID);
                  await expect(
                      nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWith("NftMarketplace__NotOwner");
              });
              it("emits event and removes listing", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
                  expect(await nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)).to.emit(
                      "ItemCanceled"
                  );
                  const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID);
                  assert(listing.price.toString() == "0");
              });
          });

          describe("buyItem", async () => {
              it("reverts if the item isn't listed", async () => {
                  await expect(
                      nftMarketplace.buyItem(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWith("NftMarketplace__NotListed");
              });
              it("reverts if the price isn't met", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
                  const buyingPrice = ethers.utils.parseEther("0.01");
                  await expect(
                      nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: buyingPrice })
                  ).to.be.revertedWith("NftMarketplace__PriceNotMet");
              });
              it("transfer the nft to the buyer and updates internal proceeds record", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
                  nftMarketplace = nftMarketplaceContract.connect(user);
                  // user is buying from deployer
                  expect(
                      await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
                  ).to.emit("ItemBought");
                  const newOwner = await basicNft.ownerOf(TOKEN_ID);
                  const deployerProceeds = await nftMarketplace.getProceeds(deployer.address);
                  assert(newOwner.toString() == user.address);
                  assert(deployerProceeds.toString() == PRICE.toString());
              });
          });

          describe("updateListing", async () => {
              it("must be owner and listed", async () => {
                  await expect(
                      nftMarketplace.updateListing(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NftMarketplace__NotListed");
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
                  nftMarketplace = nftMarketplaceContract.connect(user);
                  await expect(
                      nftMarketplace.updateListing(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NotOwner");
              });

              it("updates the price of the item", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
                  const updatedPrice = ethers.utils.parseEther("0.2");
                  expect(
                      await nftMarketplace.updateListing(basicNft.address, TOKEN_ID, updatedPrice)
                  ).to.emit("ItemListed");
                  const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID);
                  assert(listing.price.toString() == updatedPrice.toString());
              });
          });

          describe("withdraw proceeds", async () => {
              it("doesn't allow 0 proceeds withdrawal", async () => {
                  await expect(nftMarketplace.withdrawProceeds()).to.be.revertedWith(
                      "NftMarketplace__NoProceeds"
                  );
              });

              it("withdraw proceeds", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
                  nftMarketplace = nftMarketplaceContract.connect(user);
                  await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE });

                  // Switch back to using marketplace as deployer
                  nftMarketplace = nftMarketplaceContract.connect(deployer);
                  const deployerProceedsBefore = await nftMarketplace.getProceeds(deployer.address);
                  const deployerBalanceBefore = await deployer.getBalance();

                  const txResponse = await nftMarketplace.withdrawProceeds();
                  const transactionReceipt = await txResponse.wait(1);
                  const { gasUsed, effectiveGasPrice } = transactionReceipt;
                  const gasCost = gasUsed.mul(effectiveGasPrice);
                  const deployerBalanceAfter = await deployer.getBalance();

                  assert(
                      deployerBalanceAfter.add(gasCost).toString() ==
                          deployerBalanceBefore.add(deployerProceedsBefore).toString()
                  );
              });
          });
      });
