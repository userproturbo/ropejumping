type PostAuthorAvatarProps = {
  imageUrl: string | null;
  label: string;
  size?: "md" | "sm";
};

export function PostAuthorAvatar({
  imageUrl,
  label,
  size = "md",
}: PostAuthorAvatarProps) {
  const initial = label.trim().charAt(0).toUpperCase() || "?";
  const sizeClass = size === "sm" ? "h-10 w-10" : "h-11 w-11";

  if (imageUrl) {
    return (
      <span
        aria-hidden="true"
        className={`${sizeClass} shrink-0 border border-zinc-200 bg-cover bg-center`}
        style={{ backgroundImage: `url(${JSON.stringify(imageUrl)})` }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`flex ${sizeClass} shrink-0 items-center justify-center border border-zinc-200 bg-zinc-50 text-sm font-medium text-zinc-600`}
    >
      {initial}
    </span>
  );
}
