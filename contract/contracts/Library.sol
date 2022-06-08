// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Library is Ownable{

	struct soldBook {
		uint quantity;
		uint blockNumber;
	}

	mapping(uint => uint) public books;
	mapping(address => mapping(uint => soldBook)) public clientPurchases;
	mapping(uint => address) public clients;
	uint clientsNumber = 0;


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

	function buyBook(uint _id) public onlyClient {
		require(books[_id] > 0, "This book is out of stock");
		require(clientPurchases[msg.sender][_id].quantity == 0, "You can't have more than one book of the same type");

		clientPurchases[msg.sender][_id].quantity++;
		clientPurchases[msg.sender][_id].blockNumber = block.number;
		books[_id]--;
		clients[clientsNumber] = msg.sender;
		clientsNumber++;
	}

	function returnBook(uint _id) public onlyClient {
		require(clientPurchases[msg.sender][_id].quantity > 0, "No items to return");
		require(block.number - clientPurchases[msg.sender][_id].blockNumber <= 100, "You missed the returning period");

		delete clientPurchases[msg.sender][_id];
		books[_id]++;
	}

	function listClientBooks(address _client, uint _id) public view returns(uint){
		return clientPurchases[_client][_id].quantity;
	}

	function listClients() public view returns(address[] memory) {
		address[] memory clientsInStore = new address[](clientsNumber);
		for(uint i; i < clientsNumber; i++) {
			clientsInStore[i] = clients[i];
		}

		return clientsInStore;
	}
}