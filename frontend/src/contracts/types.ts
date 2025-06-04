export interface ContractArtifact {
  sourceName: string;
  contractName: string;
  abi: readonly unknown[];
  bytecode?: string;
  deployedBytecode?: string;
} 