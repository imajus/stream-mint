import { getDefaultConfig } from '@rainbow-me/rainbowkit';

const xsollaZkSepoliaTestnet = {
  id: 555272,
  name: 'Xsolla ZK Sepolia Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://zkrpc.xsollazk.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Xsolla Explorer',
      url: 'https://x.la/explorer',
    },
  },
  testnet: true,
};

export const config = getDefaultConfig({
  appName: 'Stream Mint App',
  projectId: 'a5f4d6b34a9ed736ba968cff04c1d811', // Replace with your WalletConnect project ID
  chains: [xsollaZkSepoliaTestnet],
  ssr: false,
});