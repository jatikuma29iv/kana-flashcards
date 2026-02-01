import { Asset } from "expo-asset";

export async function loadTSV(moduleRef: number): Promise<string> {
  const asset = Asset.fromModule(moduleRef);
  await asset.downloadAsync();

  if (!asset.localUri) {
    throw new Error("TSV asset not available");
  }

  const response = await fetch(asset.localUri);
  return await response.text();
}