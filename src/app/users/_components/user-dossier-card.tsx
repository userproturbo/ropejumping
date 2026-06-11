import Link from "next/link";

type UserDossierCardProfile = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  city: string | null;
  selfReportedJumpCount: number | null;
  avatarMedia?: {
    alt: string | null;
  } | null;
  user: {
    name: string | null;
    _count: {
      badges: number;
      createdObjects: number;
    };
  };
};

type UserDossierCardProps = {
  profile: UserDossierCardProfile;
};

export function UserDossierCard({ profile }: UserDossierCardProps) {
  const profileName =
    profile.displayName ??
    (profile.username ? `@${profile.username}` : null) ??
    profile.user.name ??
    "Профиль";
  const avatarAlt =
    profile.avatarMedia?.alt ??
    profile.displayName ??
    profile.username ??
    "Аватар пользователя";
  const city = profile.city ?? "Город не указан";
  const jumpsCount = profile.selfReportedJumpCount ?? 0;
  const objectsCount = profile.user._count.createdObjects ?? 0;
  const card = (
    <article className="user-dossier-card">
      <div className="user-dossier-card__capsule">
        <span className="user-dossier-card__scan" />
        <span className="user-dossier-card__flicker" />

        <div className="user-dossier-card__target">
          <span className="user-dossier-card__ring" />
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt={avatarAlt} />
          ) : (
            <div aria-label={avatarAlt}>
              {profileName.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <div className="user-dossier-card__identity">
          <h3>{profileName}</h3>
          <p>
            {profile.username ? `@${profile.username}` : "Публичный профиль"}
          </p>
        </div>

        <dl className="user-dossier-card__stats">
          <DossierStat icon="/svg/City.svg" label="Город" value={city} />
          <DossierStat
            icon="/svg/AwardOutline.svg"
            label="Достижения"
            value={profile.user._count.badges}
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

  if (!profile.username) return card;

  return (
    <Link href={`/u/${profile.username}`} className="user-dossier-card-link">
      {card}
    </Link>
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
    <div className="user-dossier-card__stat">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={icon} alt="" aria-hidden="true" />
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
