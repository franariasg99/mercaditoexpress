type Props = {
  src?: string | null | undefined;
  alt: string;
  emoji?: string;
  className?: string;
  emojiClassName?: string;
  priority?: boolean;
};

/**
 * Muestra la foto real del producto. Si todavía no hay imagen cargada,
 * usa el emoji como marcador para no romper el diseño.
 */
export function ProductImage({
  src,
  alt,
  emoji = "🛒",
  className = "",
  emojiClassName = "text-4xl",
  priority = false,
}: Props) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={`size-full object-contain ${className}`}
      />
    );
  }
  return (
    <span aria-hidden className={emojiClassName}>
      {emoji}
    </span>
  );
}
