import StreamMintNFTFactoryArtifact from './abis/StreamMintNFTFactory.json';
import type { ContractArtifact } from './types';

// Type assertion for the imported JSON
const artifact = StreamMintNFTFactoryArtifact as ContractArtifact;

export const STREAM_MINT_NFT_FACTORY_ADDRESS =
  '0x0b7b69Ab9a71c839E4817E12f1d9069d6d8d81bC' as const; // Replace with your deployed contract address

export const streamMintNFTFactoryConfig = {
  address: STREAM_MINT_NFT_FACTORY_ADDRESS,
  abi: artifact.abi,
} as const;

export { artifact as StreamMintNFTFactoryABI };
