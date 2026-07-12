export interface CommandManifest {
  name: string;
  category: string;
  description: string;
  version: string;
  entry: string;
  permissions?: string[];
}
