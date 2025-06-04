'use client';

import { Grid2x2 } from '@xsolla-zk/icons';
import { getSafeTokenValue, RichIcon, SemanticText, Stack, Input, Button } from '@xsolla-zk/react';
import { useRouter } from 'next/navigation';
import { memo, useState } from 'react';
import { Path, Svg } from 'react-native-svg';
import type { IconProp, RichIconSizes } from '@xsolla-zk/react';
import { ContentStack } from '~/components/stacks/content-stack';
import {
  useCreateCollection,
  useNewCollectionEvents,
  useNFTContractMetadata,
} from '~/contracts/hooks';

const Logo1 = memo(LogoXSollaZK) as IconProp;

function CollectionCard({ contractAddress, index }: { contractAddress: string; index: number }) {
  const router = useRouter();
  const { metadata, isLoading } = useNFTContractMetadata(contractAddress);
  const handleCardPress = () => {
    router.push(`/collection?address=${contractAddress}`);
  };
  return (
    <Stack
      borderRadius="$radius.300"
      borderColor="$border.neutral-secondary"
      borderWidth="$stroke.100"
      padding="$space.300"
      backgroundColor="$layer.floor-0"
      gap="$space.200"
      pressStyle={{ backgroundColor: '$layer.floor-1' }}
      onPress={handleCardPress}
      cursor="pointer"
    >
      <SemanticText variant="paragraphS" fontWeight="600">
        {isLoading ? `Collection #${index + 1}` : metadata?.name || `Collection #${index + 1}`}
      </SemanticText>
      {isLoading ? (
        <SemanticText variant="paragraphS" color="$content.neutral-secondary">
          Loading metadata...
        </SemanticText>
      ) : metadata ? (
        <>
          <SemanticText variant="paragraphS" color="$content.neutral-secondary">
            {metadata.description}
          </SemanticText>
          <Stack gap="$space.150">
            <SemanticText variant="paragraphS" color="$content.neutral-secondary">
              Symbol: {metadata.symbol}
            </SemanticText>
            <SemanticText variant="paragraphS" color="$content.neutral-secondary">
              Minted: {metadata.totalSupply?.toString() || '0'} /{' '}
              {metadata.maxSupply?.toString() || '0'}
            </SemanticText>
            <SemanticText variant="paragraphS" color="$content.neutral-secondary">
              Video: {metadata.videoUrl}
            </SemanticText>
          </Stack>
        </>
      ) : (
        <SemanticText variant="paragraphS" color="$content.neutral-secondary">
          Failed to load metadata
        </SemanticText>
      )}
      <SemanticText variant="paragraphS" color="$content.neutral-tertiary">
        Contract: {contractAddress}
      </SemanticText>
    </Stack>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { createCollection, isPending, isConfirming, isSuccess, error } = useCreateCollection();
  const {
    events: collectionEvents,
    isLoading: eventsLoading,
    error: eventsError,
  } = useNewCollectionEvents();
  const [formData, setFormData] = useState({
    collectionName: '',
    symbol: '',
    description: '',
    youtubeUrl: '',
    numberOfNFTs: '',
  });
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  const handleCreateCollection = () => {
    if (
      !formData.collectionName ||
      !formData.symbol ||
      !formData.description ||
      !formData.youtubeUrl ||
      !formData.numberOfNFTs
    ) {
      return;
    }
    createCollection({
      collectionName: formData.collectionName,
      symbol: formData.symbol,
      description: formData.description,
      youtubeUrl: formData.youtubeUrl,
      numberOfNFTs: parseInt(formData.numberOfNFTs),
    });
  };
  return (
    <>
      <Stack gap="$space.400">
        <Stack
          borderRadius="$radius.550"
          borderColor="$border.neutral-tertiary"
          gap="$space.350"
          borderWidth="$stroke.100"
          paddingVertical="$space.400"
          backgroundColor="$layer.floor-1"
        >
          <Stack position="relative" width={160} marginHorizontal="auto">
            <RichIcon
              size="$800"
              shape="squircle"
              rotate="5deg"
              backgroundColor="$background.brand-high"
            >
              <RichIcon.Icon icon={Grid2x2} color="$content.on-brand" />
            </RichIcon>
            <RichIcon
              size="$800"
              shape="squircle"
              rotate="-5deg"
              backgroundColor="$background.brand-extra-high"
              position="absolute"
            >
              <RichIcon.Icon icon={Logo1} />
            </RichIcon>
          </Stack>
          <ContentStack>
            <SemanticText variant="headerS" textAlign="center">
              Stream Mint
            </SemanticText>
            <SemanticText
              variant="paragraphS"
              textAlign="center"
              color="$content.neutral-secondary"
            >
              Stream Mint provides a simple no-code interface for creators to create and distribute
              NFT packs tied to portions of YouTube live stream. Each pack consists of a
              configurable number of NFTs, where: every NFT corresponds to a unique, equal-length
              segment of the future video; after the stream concludes, each segment is rendered and
              attached to its NFT; a "replay score" derived from YouTube's most-replayed statistics
              is fetched via a trustless oracle and assigned to each token. Higher scores reflect
              the most-viewed or most-replayed moments, driving scarcity and value in secondary
              markets.
            </SemanticText>
          </ContentStack>
        </Stack>
        <Stack
          borderRadius="$radius.550"
          borderColor="$border.neutral-tertiary"
          borderWidth="$stroke.100"
          padding="$space.400"
          backgroundColor="$layer.floor-1"
          gap="$space.300"
        >
          {!isSuccess && (
            <>
              <SemanticText variant="headerS">Create Stream NFT Collection</SemanticText>
              <Stack gap="$space.250">
                <Input
                  placeholder="Collection Name"
                  size="$500"
                  value={formData.collectionName}
                  onChangeText={(text) => handleInputChange('collectionName', text)}
                />
                <Input
                  placeholder="Symbol"
                  size="$500"
                  value={formData.symbol}
                  onChangeText={(text) => handleInputChange('symbol', text)}
                />
                <Input
                  placeholder="Description"
                  size="$500"
                  value={formData.description}
                  onChangeText={(text) => handleInputChange('description', text)}
                />
                <Input
                  placeholder="YouTube Live Stream URL"
                  size="$500"
                  value={formData.youtubeUrl}
                  onChangeText={(text) => handleInputChange('youtubeUrl', text)}
                />
                <Input
                  placeholder="Number of NFTs"
                  size="$500"
                  keyboardType="numeric"
                  value={formData.numberOfNFTs}
                  onChangeText={(text) => handleInputChange('numberOfNFTs', text)}
                />
              </Stack>
            </>
          )}
          {error && (
            <SemanticText variant="paragraphS">Error: {error.message}</SemanticText>
          )}
          {isSuccess && (
            <SemanticText variant="paragraphS">Collection created successfully!</SemanticText>
          )}
          {!isSuccess && (
            <Button onPress={handleCreateCollection} disabled={isPending || isConfirming}>
              <Button.Text>
                {isPending
                  ? 'Confirm in Wallet...'
                  : isConfirming
                    ? 'Creating...'
                    : 'Create Collection'}
              </Button.Text>
            </Button>
          )}
        </Stack>
        <Stack
          borderRadius="$radius.550"
          borderColor="$border.neutral-tertiary"
          borderWidth="$stroke.100"
          padding="$space.400"
          backgroundColor="$layer.floor-1"
          gap="$space.300"
        >
          <SemanticText variant="headerS">Created NFT Collections</SemanticText>
          {eventsLoading && (
            <SemanticText variant="paragraphS" color="$content.neutral-secondary">
              Loading collections...
            </SemanticText>
          )}
          {eventsError && (
            <SemanticText variant="paragraphS">
              Error loading collections: {eventsError.message}
            </SemanticText>
          )}
          {!eventsLoading && !eventsError && collectionEvents.length === 0 && (
            <SemanticText variant="paragraphS" color="$content.neutral-secondary">
              No collections created yet. Create your first collection above!
            </SemanticText>
          )}
          {!eventsLoading && !eventsError && collectionEvents.length > 0 && (
            <Stack gap="$space.250">
              {collectionEvents.map((event, index) => (
                <CollectionCard
                  key={`${event.transactionHash}-${index}`}
                  contractAddress={event.args?.newCollectionAddress || ''}
                  index={index}
                />
              ))}
            </Stack>
          )}
        </Stack>
      </Stack>
    </>
  );
}

function LogoXSollaZK({ size }: { size?: RichIconSizes }) {
  const sizeValue = getSafeTokenValue(size) || 24;
  return (
    <Svg viewBox="0 0 24 24" width={sizeValue} height={sizeValue} fill="none">
      <Path
        d="M11.1769 2.94678L20.7242 8.11436L12.7562 20.9991L2.67188 9.69378L11.1769 2.94678Z"
        fill="white"
      />
      <Path
        d="M11.9608 11.9084L20.7272 8.14893L12.7561 20.9979L2.6748 9.72829L11.9608 11.9084Z"
        fill="#D2CEFD"
      />
      <Path d="M11.2139 2.94354L20.7247 8.11432L12.7932 20.9959L11.2139 2.94354Z" fill="#E7E6FE" />
      <Path d="M11.9971 11.9053L20.7269 8.14893L12.7923 20.9947L11.9971 11.9053Z" fill="#AA9CFC" />
    </Svg>
  );
}
