// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import { ERC721 } from '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import { ERC721Enumerable } from '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';
import { Ownable } from '@openzeppelin/contracts/access/Ownable.sol';
import { IERC4906 } from '@openzeppelin/contracts/interfaces/IERC4906.sol';
import { IERC165 } from '@openzeppelin/contracts/interfaces/IERC165.sol';

/// @title StreamMintNFT
/// @author Oleg Bedrin <o.bedrin@xsolla.com> - Xsolla Web3
/// @notice StreamMintNFT is a base contract for ERC721 tokens with IPFS support.
/// @custom:include-in-addresses-report false
contract StreamMintNFT is ERC721, ERC721Enumerable, IERC4906, Ownable {
    /// @notice Base URI for token metadata.
    string public baseURI;

    /// @notice Video URL for the collection.
    string public videoUrl;

    /// @notice Description of the collection.
    string public description;

    /// @notice Tracks the next token ID to be minted.
    uint256 public nextTokenId;

    /// @notice Maximum supply of tokens.
    uint256 public immutable maxSupply;

    /// @notice Indicates whether an address has been minted to once.
    mapping(address => bool) public isMintedOnce;

    /// @notice Mapping for token URIs
    mapping(uint256 => string) private _tokenURIs;

    /// @dev Error thrown when max supply is reached.
    error MaxSupplyReached();

    /// @dev Error thrown when an address has already minted once.
    error AlreadyMintedOnce(address sender);

    /// @notice Initializes the contract with the given parameters.
    /// @param _factoryAddress Address of the factory contract.
    /// @param _name Name of the token.
    /// @param _symbol Symbol of the token.
    /// @param _chunksCount Number of chunks in the collection.
    /// @param _videoUrl Video URL for the collection.
    /// @param _description Description of the collection.
    constructor(
        address _factoryAddress,
        string memory _name,
        string memory _symbol,
        uint256 _chunksCount,
        string memory _videoUrl,
        string memory _description
    ) ERC721(_name, _symbol) {
        maxSupply = _chunksCount;
        videoUrl = _videoUrl;
        description = _description;
        transferOwnership(_factoryAddress);
    }

    /// @notice Sets the token URI for a specific token ID.
    /// @param tokenId ID of the token.
    /// @param _tokenURI URI to set for the token.
    function setTokenUri(uint256 tokenId, string memory _tokenURI) external onlyOwner {
        _tokenURIs[tokenId] = _tokenURI;
        emit MetadataUpdate(tokenId);
    }

    /// @notice Sets the base URI for token metadata.
    /// @param _newBaseURI Base URI to set.
    function setBaseUri(string memory _newBaseURI) external onlyOwner {
        baseURI = _newBaseURI;
    }

    /// @notice Mints a new token to the specified address.
    /// @param to Address to mint the token to.
    /// @dev Reverts if the total supply exceeds the max supply.
    function mint(address to) external {
        _safeMint(to, ++nextTokenId);
        if (isMintedOnce[to]) {
            revert AlreadyMintedOnce(to);
        }
        isMintedOnce[to] = true;
        if (totalSupply() > maxSupply) {
            revert MaxSupplyReached();
        }
    }

    /// @notice Mints a new token to the TX sender.
    /// @dev Reverts if the total supply exceeds the max supply.
    function mint() external {
        address sender = _msgSender();
        _safeMint(sender, ++nextTokenId);
        if (isMintedOnce[sender]) {
            revert AlreadyMintedOnce(sender);
        }
        isMintedOnce[sender] = true;
        if (totalSupply() > maxSupply) {
            revert MaxSupplyReached();
        }
    }

    /// @inheritdoc ERC721Enumerable
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable, IERC165) returns (bool) {
        return interfaceId == type(IERC4906).interfaceId || super.supportsInterface(interfaceId);
    }

    /// @inheritdoc ERC721
    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    /// @inheritdoc ERC721Enumerable
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal virtual override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
    }

    /// @notice Returns the token URI for a given token ID.
    /// @param tokenId ID of the token.
    /// @return The token URI.
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        string memory _tokenURI = _tokenURIs[tokenId];
        string memory base = _baseURI();

        // If there is no base URI, return the token URI.
        if (bytes(base).length == 0) {
            return _tokenURI;
        }
        // If both are set, concatenate the baseURI and tokenURI (via abi.encodePacked).
        if (bytes(_tokenURI).length > 0) {
            return string(abi.encodePacked(base, _tokenURI));
        }

        return super.tokenURI(tokenId);
    }

    /// @notice Burns a token and cleans up its URI.
    /// @param tokenId ID of the token to burn.
    function _burn(uint256 tokenId) internal virtual override {
        super._burn(tokenId);
        if (bytes(_tokenURIs[tokenId]).length != 0) {
            delete _tokenURIs[tokenId];
        }
    }
}
