const { network } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const { storeImages, storeTokenUriMetadata } = require("../utils/uploadToPinata")

const imagesLocation = "./images/randomNft"

//creating metadata template
//we want to store attributes onchain
//so our contrac can programmatically interact wit these att
const metadataTemplate = {
    name: "",
    descriptiom: "",
    image: "",
    attributes: [
        {
            trait_type: "Cuteness",
            value: 100,
        },
    ],
}
let tokenUris = [
    "ipfs://QmR67oXLp6HJMsJNFJQboAXymsMYo7YbuqEja4J97KF6Y5",
    "ipfs://QmT1YqALF7dNMRJ1iMmyuBPkCHt3aW6W5Cos6VomE1YNMH",
    "ipfs://QmZEfYqjnryp3hYZZ8fnmpRNqWwncEHELWNmJaT4DpE2xA",
]
const FUND_AMOUNT = "1000000000000000000000"

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    const chainId = network.config.chainId
    let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock

    //get the IPFS hashes of our images
    if (process.env.UPLOAD_TO_PINATA == "true") {
        tokenUris = await handleTokenUris()
    }

    // 1. With our own IPFS node
    // 2. Pinata https://www.pinata.cloud/
    // 3. Nft storage https://nft.storage/

    if (developmentChains.includes(network.name)) {
        // create VRFV2 Subscription
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const txResponse = await vrfCoordinatorV2Mock.createSubscription()
        const txReceipt = await txResponse.wait(1)
        subscriptionId = txReceipt.events[0].args.subId
        // Fund the subscription
        // Our mock makes it so we don't actually have to worry about sending fund
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2
        subscriptionId = networkConfig[chainId].subscriptionId
    }
    log("---------------------")

    //await storeImages(imagesLocation)
    //args from constructor..must be same order!
    const arguments = [
        vrfCoordinatorV2Address,
        subscriptionId,
        networkConfig[chainId].gasLane,
        networkConfig[chainId].callbackGasLimit,
        tokenUris,
        networkConfig[chainId].mintFee,
    ]
    const randomIpfsNft = await deploy("RandomIpfsNft", {
        from: deployer,
        args: arguments,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (chainId == 31337) {
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, randomIpfsNft.address)
    }

    // Verify the deployment
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(randomIpfsNft.address, arguments)
    }
}

//Upload our code to Pinata
//Will return array with token Uris for us to upload
async function handleTokenUris() {
    tokenUris = []
    // store the Image in IPFS
    // Store the metadata

    const { responses: imageUploadResponses, files } = await storeImages(imagesLocation)
    //responses will be a list of responses from pinata and has a hash of uploaded files

    //we are goinga loop through each image upload response index
    for (imageUploadResponseIndex in imageUploadResponses) {
        //create metadata
        //upload metadata

        let tokenUriMetadata = { ...metadataTemplate } //...means unpack-> will looks like metadataTemplate from above
        //pub.png, st-bernard.png
        tokenUriMetadata.name = files[imageUploadResponseIndex].replace(".png", "")
        tokenUriMetadata.description = `An adorable ${tokenUriMetadata.name} pup!`
        //ipfs hash what we get from the response
        tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`
        console.log(`Uploading ${tokenUriMetadata.name}...`)
        //store JSON to pinata/Ipfs
        const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetadata)
        //final we have all data to push
        //we have array of IPFS hashes that points to the metadata
        //each one of these metadata are pointing to image
        tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`)
    }
    console.log("Token URIs uploaded! They are:")
    console.log(tokenUris)

    return tokenUris
}

module.exports.tags = ["all", "randomipfs", "main"]
