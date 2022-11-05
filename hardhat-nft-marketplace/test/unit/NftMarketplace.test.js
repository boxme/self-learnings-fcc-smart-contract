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
              basicNft = await basicNftContract.connect(user);

              await basicNft.mintNft();
              await basicNft.approva(nftMarketplaceContract.address, TOKEN_ID);
          });

          describe("listItem", async () => {
              it("emits an event after listing an item", async () => {
                  expect(await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)).to.emit(
                      "ItemListed"
                  );
              });
          });
      });
