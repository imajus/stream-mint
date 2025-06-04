import StreamMintNFTFactoryArtifact from './abis/StreamMintNFTFactory.json';
import type { ContractArtifact } from './types';

// Type assertion for the imported JSON
const artifact = StreamMintNFTFactoryArtifact as ContractArtifact;

export const STREAM_MINT_NFT_FACTORY_ADDRESS =
  '0x05c7fc39dE355275F2b29ef4ca41CaB421514477' as const; // Replace with your deployed contract address

export const streamMintNFTFactoryConfig = {
  address: STREAM_MINT_NFT_FACTORY_ADDRESS,
  abi: artifact.abi,
} as const;

export { artifact as StreamMintNFTFactoryABI };
