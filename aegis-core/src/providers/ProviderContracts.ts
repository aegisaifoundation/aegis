export interface ProviderCapabilities {
  supportsStreaming: boolean;
  supportsEmbeddings: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsLoRA: boolean;
}

export interface ProviderManifest {
  name: string;
  category: string;
  description: string;
  version: string;
  entry: string;
  capabilities?: Partial<ProviderCapabilities>;
}
