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

export function useBookingLocations() {
  const { bookingLocations } = useSiteContent();
  const locations = bookingLocations || DEFAULT_BOOKING_LOCATIONS;

  return useMemo(() => {
    const betweenCities = getActiveCities(locations, 'betweenCities').map(cityOption);
    const hourlyCities = getActiveCities(locations, 'hourly').map(cityOption);
    const ziyaratCities = getActiveCities(locations, 'ziyarat').map(cityOption);
    return {
      locations,
      betweenCities,
      hourlyCities,
      ziyaratCities,
      allCities: getActiveCities(locations).map(cityOption),
      pickupOptions: (lang, formKey = 'oneWay') => getPickupSelectOptions(locations, lang, formKey),
      dropoffOptions: (lang, formKey = 'roundTrip') => getDropoffSelectOptions(locations, lang, formKey),
      findRoute: (routeId) => findPickupRoute(locations, routeId),
      cityName: (id, lang) => getCityLabel(locations, id, lang),
    };
  }, [locations]);
}
