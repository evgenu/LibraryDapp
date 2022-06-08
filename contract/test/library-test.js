const { expect } = require("chai");
const { ethers } = require("hardhat");
describe("Library", () => {
	let shop;
	
	beforeEach(async () => {
		const Library = await ethers.getContractFactory("Library");
		library = await Library.deploy();

		await library.deployed();

	});
	
	describe("Owner operations", () => {
		it("List non-existent book", async () => {
			expect(await library.listBookQuantity(1)).to.equal(0);
		});
		it("Add book for the first time", async () => {
			await library.addBooks(1, 3);
			expect(await library.listBookQuantity(1)).to.equal(3);
		});

		it("Add to present book", async () => {
			await library.addBooks(1, 3);
			await library.addBooks(1, 5);
			expect(await library.listBookQuantity(1)).to.equal(8);
		});
	});

	describe("Client operations", () => {
		it("Buy book", async () => {
			const [owner, buyer] = await ethers.getSigners();

			await library.addBooks(1, 3);
			await library.connect(buyer).buyBook(1);
			expect(await library.listBookQuantity(1)).to.equal(2);
			expect(await library.listClientBooks(buyer.address, 1)).to.equal(1);
		});

		it("Return book", async () => {
			const [owner, buyer] = await ethers.getSigners();

			// Under 100 units of block time
			await library.addBooks(1, 3);
			await library.connect(buyer).buyBook(1);
			await library.connect(buyer).returnBook(1);
			expect(await library.listBookQuantity(1)).to.equal(3);
			expect(await library.listClientBooks(buyer.address, 1)).to.equal(0);

			// Over 100 units of block time;
			await library.connect(buyer).buyBook(1);
			for(let i = 2; i < 102; i++) {
				await library.addBooks(i, 1);
				await library.connect(buyer).buyBook(i);
			}
			expect(await library.listBookQuantity(1)).to.equal(2);
		});

		it("List all clients", async () => {
			const [owner, buyer1, buyer2] = await ethers.getSigners();
			
			await library.addBooks(1, 3);
			await library.connect(buyer1).buyBook(1);
			await library.connect(buyer2).buyBook(1);
			expect(await library.numberOfClients()).to.equal(2);
			expect(await library.clientAddress(0)).to.equal(buyer1.address);
			// expect(await library.listClients()).to.eql([buyer1.address, buyer2.address]);
		});
	});
});