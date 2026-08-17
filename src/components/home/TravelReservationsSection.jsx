import { useTranslation } from 'react-i18next';
import { CONTACT } from '../../data/staticData';
import { useSiteContent } from '../../context/SiteContentContext';
import {
  DEFAULT_TRAVEL_RESERVATIONS,
  travelAccentClass,
} from '../../data/travelReservations';

function WhatsAppGlyph({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function TravelReservationsSection() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const { travelReservations } = useSiteContent();
  const reservations = (travelReservations?.length
    ? travelReservations
    : DEFAULT_TRAVEL_RESERVATIONS
  ).filter((item) => item.image || item.title?.[lang] || item.title?.en);

  if (!reservations.length) return null;

  return (
    <section className="travel-reservations" aria-labelledby="travel-reservations-title">
      <div className="travel-reservations__glow travel-reservations__glow--gold" aria-hidden="true" />
      <div className="travel-reservations__glow travel-reservations__glow--brand" aria-hidden="true" />
      <div className="travel-reservations__glow travel-reservations__glow--green" aria-hidden="true" />

      <div className="section-container">
        <div className="travel-reservations__header" data-aos="fade-up">
          <span className="travel-reservations__eyebrow">
            <WhatsAppGlyph className="h-3.5 w-3.5" />
            {lang === 'ar' ? 'حجز مباشر عبر واتساب' : 'Direct WhatsApp Booking'}
          </span>
          <h2 id="travel-reservations-title" className="travel-reservations__title">
            {lang === 'ar' ? 'خطّط لرحلتك بكل سهولة' : 'Plan Your Journey With Ease'}
          </h2>
          <p className="travel-reservations__subtitle">
            {lang === 'ar'
              ? 'اختر الخدمة المطلوبة وسيتواصل معك فريقنا عبر واتساب.'
              : 'Choose a service and our team will assist you instantly on WhatsApp.'}
          </p>
        </div>

        <div className="travel-reservations__grid" data-aos="fade-up" data-aos-delay="70">
          {reservations.map((item) => {
            const title = item.title?.[lang] || item.title?.en || '';
            const hint = item.hint?.[lang] || item.hint?.en || '';
            const message = item.message?.[lang] || item.message?.en || title;
            const href = `${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`;

            return (
              <a
                key={item.id}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`travel-reservation ${travelAccentClass(item.accent)}`}
                aria-label={`${title} — WhatsApp`}
              >
                <span className="travel-reservation__visual">
                  <span className="travel-reservation__bloom" aria-hidden="true" />
                  <span className="travel-reservation__orbit" aria-hidden="true" />
                  <span className="travel-reservation__circle">
                    <span className="travel-reservation__shine" aria-hidden="true" />
                    {item.image ? (
                      <img
                        src={item.image}
                        alt=""
                        className="travel-reservation__image"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                    <span className="travel-reservation__whatsapp" aria-hidden="true">
                      <WhatsAppGlyph className="h-[55%] w-[55%]" />
                    </span>
                  </span>
                </span>
                <span className="travel-reservation__copy">
                  <strong>{title}</strong>
                  {hint ? <small>{hint}</small> : null}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
