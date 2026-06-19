import coverDragon from "@/assets/cover-dragon.jpg";
import coverForest from "@/assets/cover-forest.jpg";
import coverSpace from "@/assets/cover-space.jpg";

const COVERS = {
  dragon: coverDragon,
  forest: coverForest,
  space: coverSpace,
} as const;

export type CoverKey = keyof typeof COVERS;

export function coverSrc(key: CoverKey) {
  return COVERS[key];
}

export function StoryCover({
  coverKey,
  className = "",
  priority = false,
  alt = "",
}: {
  coverKey: CoverKey;
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  return (
    <img
      src={COVERS[coverKey]}
      alt={alt}
      width={1024}
      height={1024}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={`object-cover ${className}`}
    />
  );
}