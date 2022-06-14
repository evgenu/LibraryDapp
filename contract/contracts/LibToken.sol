pragma solidity ^0.8.4;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";

contract LibToken is ERC20PresetMinterPauser {
	constructor() ERC20PresetMinterPauser("LIB", "LibToken") {
		
	}
}