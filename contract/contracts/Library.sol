// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./LibToken.sol";

contract Library is Ownable {

	LibToken public LibraryToken;

	struct soldBook {
		uint quantity;
		uint blockNumber;
		address clientAddress;
	}

	mapping(uint => uint) public books;
	mapping(address => mapping(uint => soldBook)) public clientPurchases;
	mapping(uint => address) public clients;
	mapping(address => bool) public paidFee;
	uint clientsNumber = 0;

	receive() external payable {
		payFee();
	}

	fallback() external payable {
		payFee();
	}

	modifier onlyClient() {
		require(msg.sender != owner(), "This operation can be executed only by a client");
		_;
	}

	function addBooks(uint _id, uint _quantity) public onlyOwner {
		books[_id] += _quantity;
	}

	function listBookQuantity(uint _id) public view returns(uint) {
		return books[_id];
	}

	function buyBook(uint _id) public payable onlyClient {
		require(books[_id] > 0, "This book is out of stock");
		require(clientPurchases[msg.sender][_id].quantity == 0, "You can't have more than one book of the same type");
		require(paidFee[msg.sender] == true, "You must pay the fee of 0.1 LIB");

		clientPurchases[msg.sender][_id].quantity++;
		clientPurchases[msg.sender][_id].blockNumber = block.number;
		clientPurchases[msg.sender][_id].clientAddress = msg.sender;
		books[_id]--;
		clients[clientsNumber] = msg.sender;
		clientsNumber++;
		paidFee[msg.sender] = false;
	}

	function returnBook(uint _id) public payable onlyClient {
		require(clientPurchases[msg.sender][_id].quantity > 0, "No items to return");
		require(block.number - clientPurchases[msg.sender][_id].blockNumber <= 100, "You missed the returning period");

		delete clientPurchases[msg.sender][_id];
		books[_id]++;
	}

	function listClientBooks(address _client, uint _id) public view returns(uint){
		return clientPurchases[_client][_id].quantity;
	}

	function numberOfClients() public view returns(uint) {
		return clientsNumber;
	}

	function clientAddress(uint _id) public view returns(address) {
		return clients[_id];
	}

	function payFee() public payable onlyClient {
		require(msg.value > 0, "You did not pay the fee of 0.1 LIB");
		paidFee[msg.sender] = true;
		LibraryToken.burn(msg.value);
	}

	function mintLIB() public payable onlyClient {
		require(msg.value > 0, "There must be at least 1 wei");
		LibraryToken.mint(msg.sender, msg.value);
	}

	function withdraw(uint value) public payable onlyOwner {
		payable(msg.sender).transfer(value);
	}
}