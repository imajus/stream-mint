import { useState, useEffect } from 'react';
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useWatchContractEvent,
  usePublicClient,
} from 'wagmi';
import { streamMintNFTFactoryConfig } from './StreamMintNFTFactory';
import { getStreamMintNFTConfig } from './StreamMintNFT';

// Hook for creating a new NFT collection
export function useCreateCollection() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });
  const createCollection = (args) => {
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
    receipt,
  };
}

// Hook for reading contract data
export function useFactoryData() {
  const { data: totalCollections } = useReadContract({
    ...streamMintNFTFactoryConfig,
    functionName: 'getTotalCollections',
  });
  return {
    totalCollections,
  };
}

// Hook for fetching NewCollectionDeployed events
export function useNewCollectionEvents() {
  const [allEvents, setAllEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const publicClient = usePublicClient();
  
  useEffect(() => {
    const fetchHistoricalEvents = async () => {
      if (!publicClient) return;  
      setIsLoading(true);
      setError(null);
      try {
        const logs = await publicClient.getLogs({
          ...streamMintNFTFactoryConfig,
          event: {
            type: 'event',
            name: 'NewCollectionDeployed',
            inputs: [
              {
                indexed: true,
                name: 'newCollectionAddress',
                type: 'address',
              },
            ],
          },
          fromBlock: 3997145n,
          toBlock: 'latest',
        });
        const formattedEvents = logs.map(log => ({
          address: log.address,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          args: {
            newCollectionAddress: log.args?.newCollectionAddress,
          },
        }));
        setAllEvents(formattedEvents);
      } catch (err) {
        console.error('Error fetching historical events:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHistoricalEvents();
  }, [publicClient]);
  
  //FIXME: This is not working as expected
  // useWatchContractEvent({
  //   ...streamMintNFTFactoryConfig,
  //   fromBlock: 3997145n,
  //   eventName: 'NewCollectionDeployed',
  //   pollingInterval: 1000,
  //   onLogs(logs) {
  //     setAllEvents((prevEvents) => {
  //       const newEvents = logs.filter((log) =>
  //         !prevEvents.some(
  //           (existingEvent) =>
  //             existingEvent.transactionHash === log.transactionHash,
  //         ),
  //       );
  //       return [...prevEvents, ...newEvents];
  //     });
  //   },
  //   onError(error) {
  //     console.error('❌ Error in useWatchContractEvent:', error);
  //     // setError(error instanceof Error ? error.message : 'Unknown error');
  //   },
  // });
  
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
export function useNFTContractMetadata(contractAddress) {
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
  const metadata = contractAddress && name && description && videoUrl && maxSupply
    ? {
        name,
        description,
        videoUrl,
        maxSupply,
        symbol,
        totalSupply,
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

// Hook for fetching individual NFT metadata
export function useNFTMetadata(contractAddress, tokenId) {
  const [metadata, setMetadata] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const config = contractAddress ? getStreamMintNFTConfig(contractAddress) : null;
  const { data: tokenURI } = useReadContract({
    ...config,
    functionName: 'tokenURI',
    args: [tokenId],
    query: { enabled: !!config && tokenId !== undefined },
  });

  useEffect(() => {
    async function fetchMetadata() {
      if (!tokenURI) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Extract IPFS hash from the URI
        const ipfsHash = String(tokenURI).replace('ipfs://', '');
        const response = await fetch(`https://majus.mypinata.cloud/ipfs/${ipfsHash}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch metadata');
        }
        
        const data = await response.json();
        setMetadata(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMetadata();
  }, [tokenURI]);

  return {
    metadata,
    isLoading,
    error,
  };
}

// Function to generate a random Ethereum address
function generateRandomAddress() {
  const randomBytes = new Uint8Array(20);
  crypto.getRandomValues(randomBytes);
  return '0x' + Array.from(randomBytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

// Hook for minting NFTs from a collection
export function useMintNFT(contractAddress) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  const config = contractAddress ? getStreamMintNFTConfig(contractAddress) : null;
  const mintNFT = () => {
    if (!config) return;
    const randomAddress = generateRandomAddress();
    writeContract({
      ...config,
      functionName: 'mint',
      args: [randomAddress],
    });
  };
  return {
    mintNFT,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
} 