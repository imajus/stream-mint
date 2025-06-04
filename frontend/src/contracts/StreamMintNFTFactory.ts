import StreamMintNFTFactoryArtifact from './abis/StreamMintNFTFactory.json';
import type { ContractArtifact } from './types';

// Type assertion for the imported JSON
const artifact = StreamMintNFTFactoryArtifact as ContractArtifact;

export const STREAM_MINT_NFT_FACTORY_ADDRESS =
  '0xefC73Eee3cd3056F66dbED55b371E138fB6Aa6fe' as const; // Replace with your deployed contract address

export const streamMintNFTFactoryConfig = {
  address: STREAM_MINT_NFT_FACTORY_ADDRESS,
  abi: artifact.abi,
} as const;

export { artifact as StreamMintNFTFactoryABI };
