// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./ERC721Enumerable.sol";
import "./Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract NFT is ERC721Enumerable, Ownable {
    using Strings for uint256;
    
    uint256 public cost;
    uint256 public maxSupply;
    uint256 public allowMintingOn;
    uint256 public maxMintAmountPerTx;
    string public baseURI;
    string public baseExtension = ".json";
    bool public paused = false;
    
    // Merkle tree for allowed addresses
    bytes32 public allowedAddressesRoot;

    event Mint(uint256 indexed mintAmount, address indexed minter);
    event Withdraw(uint256 indexed amount, address indexed sender);
    event Paused(address indexed account);
    event Unpaused(address indexed account);
    event AllowedAddressesRootSet(bytes32 indexed root);

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier onlyAllowedAddress(bytes32[] calldata _merkleProof) {
        require(
            isAddressAllowed(msg.sender, _merkleProof) || allowedAddresses[msg.sender],
            "Address not in allowed list"
        );
        _;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _cost,
        uint256 _maxSupply,
        uint256 _allowMintingOn,
        uint256 _maxMintAmountPerTx,
        string memory _baseURI
    ) ERC721(_name, _symbol) {
        cost = _cost;
        maxSupply = _maxSupply;
        allowMintingOn = _allowMintingOn;
        maxMintAmountPerTx = _maxMintAmountPerTx;
        baseURI = _baseURI;
    }

    function mint(uint256 _mintAmount, bytes32[] calldata _merkleProof) public payable whenNotPaused onlyAllowedAddress(_merkleProof) {
        // Only allow minting after specified time
        require(block.timestamp >= allowMintingOn, "Minting not allowed yet");

        // Must mint at least 1 token
        require(_mintAmount > 0, "Mint amount must be greater than 0");

        // Do not let them mint more tokens than allowed per transaction
        require(_mintAmount <= maxMintAmountPerTx, "Mint amount exceeds max per transaction");

        // Require enough payment
        require(msg.value >= cost * _mintAmount, "Insufficient funds");

        uint256 supply = totalSupply();

        // Do not let them mint more tokens than available
        require(supply + _mintAmount <= maxSupply, "Max supply exceeded");

        // Create tokens
        for (uint256 i = 1; i <= _mintAmount; i++) {
            _safeMint(msg.sender, supply + i);
        }

        emit Mint(_mintAmount, msg.sender);
    }

    function isAddressAllowed(address _address, bytes32[] calldata _merkleProof) public view returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(_address));
        return MerkleProof.verify(_merkleProof, allowedAddressesRoot, leaf);
    }

    function tokenURI(uint256 _tokenId) public view virtual override returns (string memory) {
        require(_exists(_tokenId), "Token does not exist");
        return string(abi.encodePacked(baseURI, _tokenId.toString(), baseExtension));
    }
    
    function walletOfOwner(address _owner) public view returns(uint256[] memory) {
        uint256 ownerTokenCount = balanceOf(_owner);
        uint256[] memory tokenIds = new uint256[](ownerTokenCount);
        for(uint256 i; i < ownerTokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(_owner, i);
        }
        return tokenIds;
    }

    // Owner functions

    function pause() public onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() public onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;

        (bool success, ) = payable(msg.sender).call{value: balance}("");
        require(success);

        emit Withdraw(balance, msg.sender);
    }

    function setCost(uint256 _newCost) public onlyOwner {
        cost = _newCost;
    }

    function setAllowedAddressesRoot(bytes32 _root) public onlyOwner {
        allowedAddressesRoot = _root;
        emit AllowedAddressesRootSet(_root);
    }
}