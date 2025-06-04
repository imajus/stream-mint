import StreamMintNFTFactoryArtifact from './abis/StreamMintNFTFactory.json';
import type { ContractArtifact } from './types';

// Type assertion for the imported JSON
const artifact = StreamMintNFTFactoryArtifact as ContractArtifact;

export const STREAM_MINT_NFT_FACTORY_ADDRESS =
  '0x2910F2e8eaDfd5a431FFB3b0426Ae565696005da' as const; // Replace with your deployed contract address

export const streamMintNFTFactoryConfig = {
  address: STREAM_MINT_NFT_FACTORY_ADDRESS,
  abi: artifact.abi,
} as const;

export { artifact as StreamMintNFTFactoryABI };
