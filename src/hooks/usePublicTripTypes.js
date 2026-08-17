import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Clock,
  Plane,
  Route,
  Tag,
} from 'lucide-react';
import { getActiveTripTypesForForm, getFormFieldsForForm } from '../data/bookingTripTypes';
import { useSiteContent } from '../context/SiteContentContext';

export const TRIP_TYPE_MODE_ICONS = {
  between_cities: Route,
  one_way: Plane,
  round_trip: ArrowLeftRight,
  hourly: Clock,
  custom_price: Tag,
};

/**
 * Shared SuperAdmin-controlled trip tabs for public booking forms.
 * @param {'booking' | 'instantPrice' | 'religiousTours'} formId
 */
export function usePublicTripTypes(formId, lang = 'en') {
  const { bookingTripTypes } = useSiteContent();

  const tripTypes = useMemo(
    () =>
      getActiveTripTypesForForm(bookingTripTypes, formId, lang).map((opt) => ({
        ...opt,
        Icon: TRIP_TYPE_MODE_ICONS[opt.value] || Route,
        gold: opt.value === 'custom_price',
      })),
    [bookingTripTypes, formId, lang],
  );

  const formFields = useMemo(
    () => getFormFieldsForForm(bookingTripTypes, formId, lang),
    [bookingTripTypes, formId, lang],
  );

  const defaultTripType = tripTypes[0]?.value || 'round_trip';
  const [tripType, setTripType] = useState(defaultTripType);

  useEffect(() => {
    if (!tripTypes.length) return;
    if (!tripTypes.some((opt) => opt.value === tripType)) {
      setTripType(tripTypes[0].value);
    }
  }, [tripTypes, tripType]);

  return { tripTypes, tripType, setTripType, defaultTripType, formFields };
}
