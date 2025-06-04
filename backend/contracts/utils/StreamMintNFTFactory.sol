// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IERC721 } from '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import { Ownable } from '@openzeppelin/contracts/access/Ownable.sol';

import { StreamMintNFT } from './StreamMintNFT.sol';

/// @title StreamMintNFTFactory
/// @author Oleg Bedrin <o.bedrin@xsolla.com> - Xsolla Web3
/// @notice A factory contract for deploying ERC721 collections with default or custom configurations.
contract StreamMintNFTFactory is Ownable {
    /// @notice Emitted when a new collection is deployed.
    /// @param newCollectionAddress The address of the newly deployed collection.
    event NewCollectionDeployed(address indexed newCollectionAddress);

    /// @notice Deploys a new collection with custom configurations.
    /// @param _name The name of the collection.
    /// @param _symbol The symbol of the collection.
    /// @param _chunksCount The number of chunks in the collection.
    /// @param _videoUrl The video URL for the collection.
    /// @param _description The description of the collection.
    function deployCollection(
        string memory _name,
        string memory _symbol,
        uint256 _chunksCount,
        string memory _videoUrl,
        string memory _description
    ) external {
        StreamMintNFT collection = new StreamMintNFT(address(this), _name, _symbol, _chunksCount, _videoUrl, _description);
        collection.transferOwnership(msg.sender);
        emit NewCollectionDeployed(address(collection));
    }
}
