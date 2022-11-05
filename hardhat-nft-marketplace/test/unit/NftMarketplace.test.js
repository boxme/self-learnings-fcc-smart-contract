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
      });
