import { SemanticText, Stack } from '@xsolla-zk/react';
import { useNFTMetadata } from '~/contracts/hooks';

export function NFTToken({ tokenId, contractAddress }) {
  const { metadata, isLoading, error } = useNFTMetadata(contractAddress, tokenId);

  return (
    <Stack
      borderRadius="$radius.300"
      borderColor="$border.neutral-secondary"
      borderWidth="$stroke.100"
      padding="$space.300"
      backgroundColor="$layer.floor-0"
      gap="$space.200"
      minHeight={120}
      justifyContent="space-between"
    >
      <SemanticText variant="paragraphM" fontWeight="600">
        {metadata?.name || `Token #${tokenId}`}
      </SemanticText>
      
      <Stack 
        gap="$space.200" 
        alignItems="center" 
        justifyContent="center"
        flex={1}
      >
        {isLoading ? (
          <>
            <SemanticText 
              variant="paragraphS" 
              color="$content.neutral-secondary"
              textAlign="center"
            >
              Wait a bit while the video metadata is being extracted
            </SemanticText>
          </>
        ) : error ? (
          <SemanticText 
            variant="paragraphS" 
            color="$content.error"
            textAlign="center"
          >
            {error}
          </SemanticText>
        ) : metadata ? (
          <Stack gap="$space.150" width="100%">
            <SemanticText 
              variant="paragraphS" 
              color="$content.neutral-secondary"
            >
              {metadata.description}
            </SemanticText>
            {metadata.image && (
              <img
                src={metadata.image.startsWith('ipfs://') ? metadata.image.replace('ipfs://', 'https://majus.mypinata.cloud/ipfs/') : metadata.image}
                alt={metadata.name || `Token #${tokenId}`}
                style={{ width: '100%', borderRadius: 8, objectFit: 'cover' }}
              />
            )}
            <Stack gap="$space.100">
              {metadata.attributes?.map((attr, index) => (
                <SemanticText 
                  key={index}
                  variant="paragraphS" 
                  color="$content.neutral-tertiary"
                >
                  {attr.trait_type}: {attr.value}
                </SemanticText>
              ))}
            </Stack>
          </Stack>
        ) : null}
      </Stack>
    </Stack>
  );
} 