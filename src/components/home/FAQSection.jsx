import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  HelpCircle,
  ChevronDown,
  Calendar,
  Headphones,
  Route,
  Info,
  MessageCircle,
  Phone,
} from 'lucide-react';
import { CONTACT } from '../../data/staticData';
import { useSiteContent } from '../../context/SiteContentContext';

const faqIconMap = {
  calendar: Calendar,
  concierge: Headphones,
  route: Route,
  info: Info,
};

const faqColorMap = {
  primary: { bg: 'bg-brand/10', text: 'text-brand', border: 'border-brand/25' },
  secondary: { bg: 'bg-gold/15', text: 'text-gold-dark', border: 'border-gold/30' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/25' },
  green: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/25' },
};

const CATEGORIES = ['all', 'booking', 'services', 'trips', 'general'];

function FaqAccordionItem({ item, lang, isOpen, onToggle }) {
  const Icon = faqIconMap[item.icon] || HelpCircle;
  const colors = faqColorMap[item.color] || faqColorMap.primary;

  return (
    <div className={`faq-accordion ${isOpen ? 'faq-accordion--open' : ''}`}>
      <button
        type="button"
        onClick={onToggle}
        className="faq-accordion__trigger w-full flex items-start sm:items-center gap-3 md:gap-4 p-3.5 sm:p-4 md:p-5 text-start min-h-[3.25rem] sm:min-h-0"
        aria-expanded={isOpen}
      >
        <div className={`w-9 h-9 md:w-10 md:h-10 mt-0.5 sm:mt-0 ${colors.bg} ${colors.text} rounded-xl flex items-center justify-center shrink-0 border ${colors.border}`}>
          <Icon className="w-4 h-4 md:w-5 md:h-5" />
        </div>
        <span className="flex-1 font-bold text-brand-dark text-[13px] sm:text-sm md:text-base leading-snug pe-1">
          {item.question[lang]}
        </span>
        <span
          className={`faq-accordion__toggle shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border transition-colors ${
            isOpen ? 'bg-brand/10 border-brand/25 text-brand' : 'bg-gray-50 border-gray-200 text-gray-400'
          }`}
          aria-hidden="true"
        >
          <ChevronDown className="faq-accordion__chevron w-4 h-4 sm:w-5 sm:h-5" />
        </span>
      </button>
      <div
        className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="faq-accordion__body px-3.5 sm:px-4 md:px-5 pb-4 md:pb-5 ps-3.5 sm:ps-[3.75rem] md:ps-[4.5rem]">
            {item.image ? (
              <div className="faq-accordion__image mb-3 sm:mb-4">
                <img
                  src={item.image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width={900}
                  height={506}
                />
              </div>
            ) : null}
            <p className="text-gray-500 text-sm md:text-base leading-relaxed">{item.answer[lang]}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FAQSection() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { faqItems } = useSiteContent();
  const [activeCategory, setActiveCategory] = useState('all');
  const [openId, setOpenId] = useState(null);

  const filteredFaqs =
    activeCategory === 'all' ? faqItems : faqItems.filter((item) => item.category === activeCategory);

  const toggleItem = (id) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section id="faq" className="section-padding relative">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 start-10 w-48 sm:w-72 h-48 sm:h-72 bg-brand/5 rounded-full blur-[80px] sm:blur-[120px]" />
        <div className="absolute bottom-10 end-10 w-40 sm:w-64 h-40 sm:h-64 bg-gold/8 rounded-full blur-[60px] sm:blur-[100px]" />
      </div>

      <div className="section-container relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-8 md:mb-10" data-aos="fade-up">
          <span className="text-xs font-bold text-brand tracking-widest uppercase bg-brand/5 border border-brand/10 px-3 py-1 rounded-full">
            {t('faq.badge')}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-brand-dark mt-4 mb-3 leading-tight section-heading">
            {t('faq.title1')}{' '}
            <span className="text-gold">{t('faq.titleHighlight')}</span>
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-gray-500 leading-relaxed">{t('faq.subtitle')}</p>
        </div>

        <div className="filter-chips mb-6 sm:mb-8 md:mb-10" data-aos="fade-up" data-aos-delay="60">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setActiveCategory(cat);
                setOpenId(null);
              }}
              className={`filter-chip ${activeCategory === cat ? 'filter-chip--active' : ''}`}
            >
              {t(`faq.${cat}`)}
            </button>
          ))}
        </div>

        <div className="space-y-3 md:space-y-4 max-w-4xl mx-auto mb-10 md:mb-14" data-aos="fade-up" data-aos-delay="120">
          {filteredFaqs.map((item) => (
            <FaqAccordionItem
              key={item.id}
              item={item}
              lang={lang}
              isOpen={openId === item.id}
              onToggle={() => toggleItem(item.id)}
            />
          ))}
        </div>

        <div
          className="premium-card overflow-hidden"
          data-aos="fade-up"
          data-aos-delay="160"
        >
          <div className="premium-card__glow opacity-60" aria-hidden="true" />
          <div className="bg-gradient-to-l from-brand-dark via-brand to-brand-light rtl:bg-gradient-to-r p-6 md:p-8 text-center relative z-1">
            <h3 className="text-lg md:text-xl font-black text-white mb-2">{t('faq.notFound')}</h3>
            <p className="text-white/80 text-sm md:text-base mb-5">{t('faq.teamReady')}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={CONTACT.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="premium-card__cta inline-flex items-center gap-2 bg-gold text-brand-dark font-bold px-5 py-2.5 rounded-xl hover:bg-gold-light text-sm w-full sm:w-auto justify-center"
              >
                <MessageCircle className="w-4 h-4" />
                {t('services.whatsappDirect')}
              </a>
              <a
                href={`tel:${CONTACT.phone}`}
                className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/30 font-bold px-5 py-2.5 rounded-xl hover:bg-white/20 transition-all duration-300 text-sm w-full sm:w-auto justify-center"
              >
                <Phone className="w-4 h-4" />
                {t('howToBook.callNow')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
