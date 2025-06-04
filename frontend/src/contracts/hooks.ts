import { useState, useEffect } from 'react';
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useWatchContractEvent,
} from 'wagmi';
import { streamMintNFTFactoryConfig } from './StreamMintNFTFactory';
import { getStreamMintNFTConfig } from './StreamMintNFT';

// Type for NFT contract event logs
interface ContractEventLog {
  address: string;
  blockNumber: bigint | null;
  transactionHash: string | null;
  args?: {
    newCollectionAddress?: string;
  };
}

// Type for NFT contract metadata
interface NFTContractMetadata {
  name: string;
  description: string;
  videoUrl: string;
  maxSupply: bigint;
  symbol?: string;
  totalSupply?: bigint;
}

// Hook for creating a new NFT collection
export function useCreateCollection() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  const createCollection = (args: {
    collectionName: string;
    symbol: string;
    numberOfNFTs: number;
    youtubeUrl: string;
    description: string;
  }) => {
    writeContract({
      ...streamMintNFTFactoryConfig,
      functionName: 'deployCollection',
      args: [
        args.collectionName,
        args.symbol,
        args.numberOfNFTs,
        args.youtubeUrl,
        args.description,
      ],
    });
  };
  return {
    createCollection,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

// Hook for reading contract data (if needed)
export function useFactoryData() {
  // Example: reading total collections created
  const { data: totalCollections } = useReadContract({
    ...streamMintNFTFactoryConfig,
    functionName: 'getTotalCollections', // Adjust based on your contract
  });
  return {
    totalCollections,
  };
}

// Hook for fetching NewCollectionDeployed events
export function useNewCollectionEvents() {
  const [allEvents, setAllEvents] = useState<ContractEventLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // Watch for new NewCollectionDeployed events
  useWatchContractEvent({
    ...streamMintNFTFactoryConfig,
    fromBlock: 3997145n,
    eventName: 'NewCollectionDeployed',
    onLogs(logs) {
      setAllEvents((prevEvents) => {
        const newEvents = logs.filter((log) =>
          !prevEvents.some(
            (existingEvent) =>
              existingEvent.transactionHash === log.transactionHash,
          ),
        );
        return [...prevEvents, ...newEvents];
      });
    },
  });
  // Set initial loading state on mount
  useEffect(() => {
    const initializeEvents = () => {
      setIsLoading(true);
      // This would typically use a web3 provider to fetch past events
      // For now, we'll start with an empty array and rely on the watch hook
      setAllEvents([]);
      setError(null);
      setIsLoading(false);
    };
    initializeEvents();
  }, []);
  return {
    events: allEvents,
    isLoading,
    error,
    refetch: () => {
      setAllEvents([]);
      setIsLoading(true);
    },
  };
}

// Hook for fetching NFT contract metadata by address
export function useNFTContractMetadata(contractAddress?: string) {
  const config = contractAddress ? getStreamMintNFTConfig(contractAddress) : null;
  const { data: name } = useReadContract({
    ...config,
    functionName: 'name',
    query: { enabled: !!config },
  });
  const { data: description } = useReadContract({
    ...config,
    functionName: 'description',
    query: { enabled: !!config },
  });
  const { data: videoUrl } = useReadContract({
    ...config,
    functionName: 'videoUrl',
    query: { enabled: !!config },
  });
  const { data: maxSupply } = useReadContract({
    ...config,
    functionName: 'maxSupply',
    query: { enabled: !!config },
  });
  const { data: symbol } = useReadContract({
    ...config,
    functionName: 'symbol',
    query: { enabled: !!config },
  });
  const { data: totalSupply } = useReadContract({
    ...config,
    functionName: 'totalSupply',
    query: { enabled: !!config },
  });
  const isLoading = !name && !description && !videoUrl && !maxSupply && !!contractAddress;
  const metadata: NFTContractMetadata | null =
    contractAddress && name && description && videoUrl && maxSupply
      ? {
          name: name as string,
          description: description as string,
          videoUrl: videoUrl as string,
          maxSupply: maxSupply as bigint,
          symbol: symbol as string,
          totalSupply: totalSupply as bigint,
        }
      : null;
  return {
    metadata,
    isLoading,
    name,
    description,
    videoUrl,
    maxSupply,
    symbol,
    totalSupply,
  };
}
