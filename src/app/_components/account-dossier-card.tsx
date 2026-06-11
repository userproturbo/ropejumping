type AccountDossierCardUser = {
  name?: string | null;
  image?: string | null;
  email?: string | null;
};

type AccountDossierCardProfile = {
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  city: string | null;
  selfReportedJumpCount: number | null;
  avatarMedia?: {
    alt: string | null;
  } | null;
} | null;

type AccountDossierCardProps = {
  user: AccountDossierCardUser;
  profile: AccountDossierCardProfile;
  achievementsCount: number;
  objectsCount: number;
};

export function AccountDossierCard({
  user,
  profile,
  achievementsCount,
  objectsCount,
}: AccountDossierCardProps) {
  const displayName =
    profile?.displayName ??
    user.name ??
    (profile?.username ? `@${profile.username}` : null) ??
    "Jumper";
  const username = profile?.username
    ? `@${profile.username}`
    : "Публичный профиль";
  const avatarUrl = profile?.avatarUrl ?? user.image;
  const avatarAlt =
    profile?.avatarMedia?.alt ??
    profile?.displayName ??
    profile?.username ??
    user.name ??
    "Аватар пользователя";
  const city = profile?.city ?? "Город не указан";
  const jumpsCount = profile?.selfReportedJumpCount ?? 0;

  return (
    <article className="account-dossier-card" aria-label="Профиль аккаунта">
      <div className="account-dossier-card__top">
        <span className="account-dossier-card__label">ROPEJUMPER</span>
        <h2>{displayName}</h2>
        <p>{username}</p>
      </div>

      <div className="account-dossier-card__capsule">
        <span className="account-dossier-card__scan" />
        <span className="account-dossier-card__flicker" />

        <div className="account-dossier-card__target">
          <span className="account-dossier-card__ring" />
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={avatarAlt} />
          ) : (
            <div aria-label={avatarAlt}>
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <dl className="account-dossier-card__stats">
          <DossierStat icon="/svg/City.svg" label="Город" value={city} />
          <DossierStat
            icon="/svg/AwardOutline.svg"
            label="Достижения"
            value={achievementsCount}
          />
          <DossierStat
            icon="/svg/Копия-роуп.svg"
            label="Прыжки"
            value={jumpsCount}
          />
          <DossierStat
            icon="/svg/BridgeCircleCheck.svg"
            label="Объекты"
            value={objectsCount}
          />
        </dl>
      </div>
    </article>
  );
}

function DossierStat({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="account-dossier-card__stat">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={icon} alt="" aria-hidden="true" />
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
