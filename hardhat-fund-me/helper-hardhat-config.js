const networkConfig = {
    31337: {
        name: "localhost",
    },
    4: {
        name: "rinkeby",
        ethUsdPriceFeed: "0x2bA49Aaa16E6afD2a993473cfB70Fa8559B523cF",
    },
    5: {
        name: "goerli",
        ethUsdPriceFeed: "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e",
    },
}

const developmentChains = ["hardhat", "localhost"];

module.exports = {
    networkConfig,
    developmentChains,
}