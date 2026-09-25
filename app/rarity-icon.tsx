import type { RarityKind } from "../lib/rarity";

export default function RarityIcon({ kind }: { kind: RarityKind }) {
  return <span className={`rarity-icon rarity-icon-${kind}`} aria-hidden="true" />;
}
