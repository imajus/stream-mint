'use client';

import { useEffect, Suspense } from 'react';
import { SemanticText, Stack, Button } from '@xsolla-zk/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useNFTContractMetadata, useMintNFT } from '~/contracts/hooks';
import { ContentStack } from '~/components/stacks/content-stack';
import { NFTToken } from './components/nft-token';

function CollectionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contractAddress = searchParams.get('address');
  const { metadata, isLoading } = useNFTContractMetadata(contractAddress || '');
  const { mintNFT, isPending, isConfirming, isSuccess, error, hash } = useMintNFT(contractAddress || '');

  useEffect(() => {
    fetch(`https://n8n.majus.org/webhook/127b5f8a-86bf-4928-9338-f060f561f292?address=${contractAddress}`, {
      method: 'GET',
      // headers: {
      //   'Content-Type': 'application/json'
      // },
      // body: JSON.stringify({ address: contractAddress })
    })
      .then(response => response.json())
      .then(data => {
        console.log('Oracle response:', data);
      })
      .catch(error => {
        console.error('Oracle error:', error);
      });
  }, []);
  
  if (!contractAddress) {
    return (
      <ContentStack>
        <SemanticText variant="headerM">Collection Not Found</SemanticText>
        <SemanticText variant="paragraphM" color="$content.neutral-secondary">
          No collection address provided in the URL.
        </SemanticText>
        <Button onPress={() => router.push('/')}>
          <Button.Text>Go Back Home</Button.Text>
        </Button>
      </ContentStack>
    );
  }
  
  const handleMintNFT = () => {
    mintNFT();
  };
  
  const isMaxSupplyReached = metadata && metadata.totalSupply !== undefined && metadata.totalSupply >= metadata.maxSupply;
  
  return (
    <Stack gap="$space.400">
      <Button onPress={() => router.push('/')}>
        <Button.Text>← Back to Collections</Button.Text>
      </Button>
      
      <Stack
        borderRadius="$radius.550"
        borderColor="$border.neutral-tertiary"
        borderWidth="$stroke.100"
        padding="$space.400"
        backgroundColor="$layer.floor-1"
        gap="$space.300"
      >
        <SemanticText variant="headerM">
          {isLoading ? 'Loading Collection...' : metadata?.name || 'Unknown Collection'}
        </SemanticText>
        
        {isLoading ? (
          <SemanticText variant="paragraphM" color="$content.neutral-secondary">
            Loading collection metadata...
          </SemanticText>
        ) : metadata ? (
          <Stack gap="$space.300">
            <SemanticText variant="paragraphM" color="$content.neutral-secondary">
              {metadata.description}
            </SemanticText>
            
            <Stack gap="$space.200">
              <SemanticText variant="paragraphM" fontWeight="600">
                Collection Details
              </SemanticText>
              
              <Stack gap="$space.150">
                <SemanticText variant="paragraphS" color="$content.neutral-secondary">
                  <SemanticText variant="paragraphS" fontWeight="600">Symbol:</SemanticText> {metadata.symbol}
                </SemanticText>
                <SemanticText variant="paragraphS" color="$content.neutral-secondary">
                  <SemanticText variant="paragraphS" fontWeight="600">Minted:</SemanticText> {metadata.totalSupply?.toString() || '0'} / {metadata.maxSupply?.toString() || '0'}
                </SemanticText>
                <SemanticText variant="paragraphS" color="$content.neutral-secondary">
                  <SemanticText variant="paragraphS" fontWeight="600">Video URL:</SemanticText> {metadata.videoUrl}
                </SemanticText>
                <SemanticText variant="paragraphS" color="$content.neutral-tertiary">
                  <SemanticText variant="paragraphS" fontWeight="600">Contract Address:</SemanticText> {contractAddress}
                </SemanticText>
              </Stack>
            </Stack>
            
            <Stack gap="$space.200">
              <Button 
                onPress={handleMintNFT} 
                disabled={isPending || isConfirming || !!isMaxSupplyReached}
                variant={isMaxSupplyReached ? "secondary" : "primary"}
              >
                <Button.Text>
                  {isPending 
                    ? 'Confirm in Wallet...' 
                    : isConfirming 
                      ? 'Minting...' 
                      : isMaxSupplyReached
                        ? 'Max Supply Reached'
                        : 'Mint Next'
                  }
                </Button.Text>
              </Button>
              
              {error && (
                <SemanticText variant="paragraphS" color="$content.negative-primary">
                  Error: {error.message}
                </SemanticText>
              )}
              
              {isSuccess && hash && (
                <SemanticText variant="paragraphS" color="$content.positive-primary">
                  NFT minted successfully! Transaction: {hash}
                </SemanticText>
              )}
            </Stack>
          </Stack>
        ) : (
          <SemanticText variant="paragraphM" color="$content.neutral-secondary">
            Failed to load collection metadata. The contract address might be invalid or the contract might not be deployed.
          </SemanticText>
        )}
      </Stack>
      
      {metadata && metadata.totalSupply !== undefined && metadata.totalSupply > 0 && (
        <Stack
          borderRadius="$radius.550"
          borderColor="$border.neutral-tertiary"
          borderWidth="$stroke.100"
          padding="$space.400"
          backgroundColor="$layer.floor-1"
          gap="$space.300"
        >
          <SemanticText variant="headerM">
            Minted NFTs ({metadata.totalSupply.toString()})
          </SemanticText>
          
          <Stack gap="$space.300">
            {Array.from({ length: Number(metadata.totalSupply) }, (_, index) => (
              <NFTToken key={index + 1} tokenId={index} contractAddress={contractAddress} />
            ))}
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}

export default function CollectionPage() {
  return (
    <Suspense fallback={
      <ContentStack>
        <SemanticText variant="headerM">Loading Collection...</SemanticText>
      </ContentStack>
    }>
      <CollectionPageContent />
    </Suspense>
  );
} 