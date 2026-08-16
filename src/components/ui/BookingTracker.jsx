import { useTranslation } from 'react-i18next';
import { ClipboardList, CheckCircle, Flag, XCircle } from 'lucide-react';

const steps = [
  { key: 'pending', icon: ClipboardList },
  { key: 'confirmed', icon: CheckCircle },
  { key: 'completed', icon: Flag },
];

const stepOrder = { pending: 0, confirmed: 1, completed: 2, cancelled: -1 };

export default function BookingTracker({ status }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <XCircle className="w-8 h-8 text-red-500" />
        <div>
          <p className="font-bold text-red-700 dark:text-red-300">{t('ui.status.cancelled')}</p>
          <p className="text-sm text-red-600/80 dark:text-red-400/80">{t('ui.cancelledDesc')}</p>
        </div>
      </div>
    );
  }

  const currentStep = stepOrder[status] ?? 0;

  return (
    <div className="relative">
      <div className="absolute top-6 start-6 end-6 h-1 bg-gray-200 dark:bg-dark-600 rounded-full hidden sm:block">
        <div
          className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-700"
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-0">
        {steps.map((step, idx) => {
          const done = idx <= currentStep;
          const active = idx === currentStep;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex sm:flex-col items-center gap-3 sm:gap-2 relative">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                  done
                    ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30'
                    : 'bg-gray-100 dark:bg-dark-700 text-gray-400'
                } ${active ? 'ring-4 ring-primary-200 dark:ring-primary-800 scale-110' : ''}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="sm:text-center">
                <p className={`font-bold text-sm ${done ? 'text-dark-800 dark:text-white' : 'text-gray-400'}`}>
                  {t(`ui.steps.${step.key}`)}
                </p>
                {active && (
                  <p className="text-xs text-primary-600 dark:text-primary-400 mt-0.5 animate-pulse">
                    {t('ui.currentStep')}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
