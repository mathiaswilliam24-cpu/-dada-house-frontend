"use client";

import { useEffect, useRef } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

const LIBRARIES: "places"[] = ["places"];

export type ParsedAddress = {
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
};

function parsePlace(place: google.maps.places.PlaceResult): ParsedAddress {
  const components = place.address_components ?? [];
  const get = (type: string) => components.find((c) => c.types.includes(type))?.long_name ?? "";
  const getShort = (type: string) => components.find((c) => c.types.includes(type))?.short_name ?? "";

  const streetNumber = get("street_number");
  const route = get("route");

  return {
    streetAddress: [streetNumber, route].filter(Boolean).join(" "),
    city: get("locality") || get("sublocality") || get("postal_town"),
    state: getShort("administrative_area_level_1"),
    zipCode: get("postal_code"),
  };
}

/**
 * Drop-in replacement for a plain street-address <input> — suggests real
 * addresses via Google Places as the dispatcher types, so a typo doesn't
 * silently save a bad address a technician can't find.
 */
export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  required,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (parsed: ParsedAddress) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey, libraries: LIBRARIES });
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "us" },
      fields: ["address_components", "formatted_address"],
      types: ["address"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.address_components) return;
      onSelect(parsePlace(place));
    });

    autocompleteRef.current = autocomplete;
  }, [isLoaded, onSelect]);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className={className}
      autoComplete="off"
    />
  );
}
