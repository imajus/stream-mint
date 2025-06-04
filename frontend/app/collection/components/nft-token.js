import { Star } from '@xsolla-zk/icons';
import { SemanticText, Stack, Badge, Loader } from '@xsolla-zk/react';
import { useNFTMetadata } from '~/contracts/hooks';
import { useState } from 'react';

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
  const [showVideo, setShowVideo] = useState(false);
  
  // Determine quality score and label
  const qualityScore = metadata?.attributes?.find(attr => attr.trait_type === "Quality Score")?.value;
  const getQualityInfo = (score) => {
    const numScore = parseFloat(score);
    if (numScore >= 0.75) return { label: "Epic 🎉", tone: "negative" }; // Orange/red for epic
    if (numScore >= 0.5) return { label: "Rare 🤩", tone: "brand" }; // Purple for rare
    return { label: "Usual 😐", tone: "warning" }; // Gray/yellow for usual
  };
  
  const qualityInfo = qualityScore ? getQualityInfo(qualityScore) : null;
  const isEpic = qualityInfo?.label === "Epic";

  // Helper function to convert IPFS URLs
  const convertIpfsUrl = (url) => {
    if (!url) return '';
    return url.startsWith('ipfs://') ? url.replace('ipfs://', 'https://majus.mypinata.cloud/ipfs/') : url;
  };

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
            <Loader />
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
          <Stack gap="$space.300" width="100%">
            <SemanticText 
              variant="paragraphS" 
              color="$content.neutral-secondary"
            >
              {metadata.description}
            </SemanticText>
            <Stack flexDirection="row" gap="$space.300">
              {metadata.image && (
                <div style={{ position: 'relative', width: "60%" }}>
                  {showVideo && metadata.animation_url && (
                    <video
                      src={convertIpfsUrl(metadata.animation_url)}
                      controls={false}
                      autoPlay={true}
                      loop={true}
                      muted={true}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        borderRadius: 8,
                        objectFit: 'cover',
                        zIndex: 10,
                        backgroundColor: 'black'
                      }}
                      onMouseLeave={() => setShowVideo(false)}
                    />
                  )}
                  <img
                    src={convertIpfsUrl(metadata.image)}
                    alt={metadata.name || `Token #${tokenId}`}
                    style={{ width: '100%', borderRadius: 8, objectFit: 'cover', cursor: metadata.animation_url ? 'pointer' : 'default' }}
                    onMouseEnter={() => metadata.animation_url && setShowVideo(true)}
                    onClick={() => metadata.animation_url && setShowVideo(!showVideo)}
                  />
                </div>
              )}
              <Stack gap="$space.100">
                {(() => {
                  const startTime = metadata?.attributes?.find(attr => attr.trait_type === "Start Time")?.value;
                  const endTime = metadata?.attributes?.find(attr => attr.trait_type === "End Time")?.value;
                  const duration = metadata?.attributes?.find(attr => attr.trait_type === "Duration")?.value;
                  return (
                    <>
                      {qualityInfo && (
                        <Badge tone={qualityInfo.tone} size="$500">
                          <Badge.Icon>
                            <Star />
                          </Badge.Icon>
                          <Badge.Text>{qualityInfo.label}</Badge.Text>
                        </Badge>
                      )}
                      {startTime && endTime && (
                        <SemanticText 
                          variant="paragraphS" 
                          color="$content.neutral-tertiary"
                        >
                          Timeframe: {formatTime(startTime)} - {formatTime(endTime)}
                        </SemanticText>
                      )}
                      {duration && (
                        <SemanticText 
                          variant="paragraphS" 
                          color="$content.neutral-tertiary"
                        >
                          Duration: {formatTime(duration)}
                        </SemanticText>
                      )}
                    </>
                  );
                })()}
              </Stack>
            </Stack>
          </Stack>
        ) : null}
      </Stack>
    </Stack>
  );
} 