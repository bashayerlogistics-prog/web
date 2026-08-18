import { useMemo } from 'react';
import { useSiteContent } from '../context/SiteContentContext';
import {
  DEFAULT_BOOKING_LOCATIONS,
  cityOption,
  getActiveCities,
  getCityLabel,
  getPickupSelectOptions,
  getDropoffSelectOptions,
  findPickupRoute,
} from '../data/bookingLocations';

export function useBookingLocations(siteFormId) {
  const { bookingLocations } = useSiteContent();
  const locations = bookingLocations || DEFAULT_BOOKING_LOCATIONS;

  return useMemo(() => {
    const betweenCities = getActiveCities(locations, 'betweenCities', siteFormId).map(cityOption);
    const hourlyCities = getActiveCities(locations, 'hourly', siteFormId).map(cityOption);
    const ziyaratCities = getActiveCities(locations, 'ziyarat', siteFormId).map(cityOption);
    return {
      locations,
      betweenCities,
      hourlyCities,
      ziyaratCities,
      allCities: getActiveCities(locations, null, siteFormId).map(cityOption),
      pickupOptions: (lang, formKey = 'oneWay') => getPickupSelectOptions(locations, lang, formKey, siteFormId),
      dropoffOptions: (lang, formKey = 'roundTrip') => getDropoffSelectOptions(locations, lang, formKey, siteFormId),
      findRoute: (routeId) => findPickupRoute(locations, routeId),
      cityName: (id, lang) => getCityLabel(locations, id, lang),
    };
  }, [locations, siteFormId]);
}
