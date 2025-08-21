"use client";

type MapEmbedProps = {
  lat: number;
  lng: number;
  zoom?: number;
  title?: string;
};

export default function MapEmbed({ lat, lng, zoom = 15, title = "Bakers Rentals Location" }: MapEmbedProps) {
  const src = `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;
  return (
    <div className="w-full h-48 sm:h-56 md:h-64 rounded-xl overflow-hidden border border-white/20">
      <iframe
        title={title}
        src={src}
        width="100%"
        height="100%"
        loading="lazy"
        style={{ border: 0 }}
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
