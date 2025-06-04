import StreamMintNFTArtifact from './abis/StreamMintNFT.json';
import type { ContractArtifact } from './types';

// Type assertion for the imported JSON
const artifact = StreamMintNFTArtifact as ContractArtifact;

// Function to create config for any StreamMintNFT contract address
export const getStreamMintNFTConfig = (address: string) =>
  ({
    address: address as `0x${string}`,
    abi: artifact.abi,
  }) as const;

export { artifact as StreamMintNFTABI }; 