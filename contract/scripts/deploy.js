const hre = require('hardhat');
const ethers = hre.ethers;

async function deployLibraryContract() {
	await hre.run('compile');
	const deployer = await ethers.getSigners();

	console.log("Deployed with account: ", deployer.address);

	const Library = await ethers.getContractFactory("Library");
	const library = await Library.deploy();

	await library.deployed();

	console.log("Deployed at: ", library.address);
	console.log("Done")

	return library;
}

module.exports = deployLibraryContract