import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Star,
  Clock3,
  Award,
  Car,
  ShieldCheck,
  MapPinned,
  Sparkles,
  Layers3,
} from 'lucide-react';
import { buildHomeStats } from '../../data/staticData';
import { useSiteContent } from '../../context/SiteContentContext';

const STAT_ICONS = [Star, Clock3, Award, Car, ShieldCheck, MapPinned, Sparkles, Layers3];

function parseStatValue(raw) {
  const text = String(raw ?? '');
  const match = text.match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (!match) return { target: null, suffix: text, decimals: 0 };
  const num = Number(match[1]);
  const decimals = match[1].includes('.') ? match[1].split('.')[1].length : 0;
  return { target: Number.isFinite(num) ? num : null, suffix: match[2] || '', decimals };
}

function useCountUp(raw, active, duration = 700) {
  const { target, suffix, decimals } = useMemo(() => parseStatValue(raw), [raw]);
  const [display, setDisplay] = useState(() => (target == null ? String(raw) : `0${suffix}`));

  useEffect(() => {
    if (!active) return undefined;
    if (target == null) {
      setDisplay(String(raw));
      return undefined;
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setDisplay(`${target.toFixed(decimals)}${suffix}`);
      return undefined;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const current = target * eased;
      setDisplay(`${current.toFixed(decimals)}${suffix}`);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, target, suffix, decimals, duration, raw]);

  return display;
}

function StatCard({ stat, lang, index, Icon }) {
  const cardRef = useRef(null);
  const [inView, setInView] = useState(false);
  const value = useCountUp(stat.value, inView, 650 + index * 40);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return undefined;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setInView(true);
        io.disconnect();
      },
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <article
      ref={cardRef}
      className={`home-stat-card${inView ? ' is-inview' : ''}`}
      style={{ '--stat-delay': `${Math.min(index * 45, 280)}ms` }}
    >
      <div className="home-stat-card__glow" aria-hidden="true" />
      <div className="home-stat-card__accent" aria-hidden="true" />

      <div className="home-stat-card__icon" aria-hidden="true">
        <Icon className="home-stat-card__icon-svg" strokeWidth={2.1} />
      </div>

      <p className="home-stat-card__value">{value}</p>
      <h3 className="home-stat-card__label">{stat.label[lang]}</h3>
      <p className="home-stat-card__desc">{stat.desc[lang]}</p>
    </article>
  );
}

export default function StatsSection() {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const { services, fleetRoutes } = useSiteContent();

  const stats = useMemo(
    () => buildHomeStats({ services, fleetRoutes }),
    [services, fleetRoutes],
  );

  return (
    <section className="home-stats section-padding overflow-hidden">
      <div className="home-stats__bg" aria-hidden="true" />
      <div className="section-container relative z-[1]">
        <div className="home-stats__grid">
          {stats.map((stat, i) => {
            const Icon = STAT_ICONS[i % STAT_ICONS.length];
            return (
              <StatCard
                key={`${stat.label.en}-${stat.value}`}
                stat={stat}
                lang={lang}
                index={i}
                Icon={Icon}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
