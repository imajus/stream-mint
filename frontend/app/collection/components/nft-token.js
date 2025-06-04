import { SemanticText, Stack } from '@xsolla-zk/react';
import { useNFTMetadata } from '~/contracts/hooks';

// Helper function to convert seconds to hh:mm:ss format
const formatTime = (seconds) => {
  if (!seconds && seconds !== 0) return '';
  const totalSeconds = Math.floor(parseFloat(seconds));
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export function NFTToken({ tokenId, contractAddress }) {
  const { metadata, isLoading, error } = useNFTMetadata(contractAddress, tokenId);
  
  // Determine quality score and label
  const qualityScore = metadata?.attributes?.find(attr => attr.trait_type === "Quality Score")?.value;
  const getQualityInfo = (score) => {
    const numScore = parseFloat(score);
    if (numScore >= 0.75) return { label: "Epic 🎉", color: "#FF6B35" };
    if (numScore >= 0.5) return { label: "Rare 🤩", color: "#8B5CF6" };
    return { label: "Usual 😐", color: "#6B7280" };
  };
  
  const qualityInfo = qualityScore ? getQualityInfo(qualityScore) : null;
  const isEpic = qualityInfo?.label === "Epic";

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
      style={isEpic ? { boxShadow: "0 0 4px 4px rgba(255, 107, 53, 0.75)" } : {}}
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
              {(() => {
                const startTime = metadata?.attributes?.find(attr => attr.trait_type === "Start Time")?.value;
                const endTime = metadata?.attributes?.find(attr => attr.trait_type === "End Time")?.value;

                return (
                  <>
                    {startTime && endTime && (
                      <SemanticText 
                        variant="paragraphS" 
                        color="$content.neutral-tertiary"
                      >
                        Timeframe: {formatTime(startTime)} - {formatTime(endTime)}
                      </SemanticText>
                    )}
                    {qualityInfo && (
                      <SemanticText 
                      variant="paragraphS" 
                      color="$content.neutral-tertiary"
                    >
                      Rarity: {qualityInfo.label}
                    </SemanticText>
                    )}
                  </>
                );
              })()}
            </Stack>
          </Stack>
        ) : null}
      </Stack>
    </Stack>
  );
} 