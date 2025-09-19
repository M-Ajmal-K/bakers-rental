// components/seo/JsonLd.tsx
"use client";

import * as React from "react";

type Props = {
  data: any;     // object or array
  id?: string;   // optional DOM id to avoid duplicates
};

export default function JsonLd({ data, id }: Props) {
  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      {...(id ? { id } : {})}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
