'use client';

import { useRouter } from 'next/navigation';
import { memo } from 'react';
import { Path, Svg } from 'react-native-svg';
import { Grid2x2 } from '@xsolla-zk/icons';
import { getSafeTokenValue, RichIcon, SemanticText, Stack, Input, Button } from '@xsolla-zk/react';
import type { IconProp, RichIconSizes } from '@xsolla-zk/react';
import { Card } from '~/components/card/card';
import { ContentStack } from '~/components/stacks/content-stack';

const Logo1 = memo(LogoXSollaZK) as IconProp;

export default function HomeScreen() {
  const router = useRouter();

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
            <SemanticText variant="paragraphS" textAlign="center" color="$content.neutral-secondary">
              Stream Mint provides a simple no-code interface for creators to create and distribute NFT packs tied to portions of YouTube live stream. Each pack consists of a configurable number of NFTs, where: every NFT corresponds to a unique, equal-length segment of the future video; after the stream concludes, each segment is rendered and attached to its NFT; a "replay score" derived from YouTube's most-replayed statistics is fetched via a trustless oracle and assigned to each token. Higher scores reflect the most-viewed or most-replayed moments, driving scarcity and value in secondary markets.
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
          <SemanticText variant="headerS">
            Create Stream NFT Collection
          </SemanticText>
          <Stack gap="$space.250">
            <Input placeholder="Collection Name" size="$500" />
            <Input placeholder="Description" size="$500" />
            <Input placeholder="YouTube Live Stream URL" size="$500" />
            <Input placeholder="Number of NFTs" size="$500" keyboardType="numeric" />
          </Stack>
          <Button>
            <Button.Text>Create Collection</Button.Text>
          </Button>
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
