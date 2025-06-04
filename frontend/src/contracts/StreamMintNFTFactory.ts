import StreamMintNFTFactoryArtifact from './abis/StreamMintNFTFactory.json';
import type { ContractArtifact } from './types';

// Type assertion for the imported JSON
const artifact = StreamMintNFTFactoryArtifact as ContractArtifact;

export const STREAM_MINT_NFT_FACTORY_ADDRESS =
  '0x77E17D9Ba79079B6377A1F5b69c3b5611c5D0939' as const; // Replace with your deployed contract address

export const streamMintNFTFactoryConfig = {
  address: STREAM_MINT_NFT_FACTORY_ADDRESS,
  abi: artifact.abi,
} as const;

export { artifact as StreamMintNFTFactoryABI };
