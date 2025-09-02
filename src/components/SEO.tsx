import { Helmet, HelmetProvider } from "react-helmet-async";

type SEOProps = {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  noindex?: boolean;
  schemaJsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
};

const DEFAULT_TITLE = "PTRN — Custom Apparel for Organizations & Businesses";
const DEFAULT_DESCRIPTION =
  "Transparent custom apparel for organizations and businesses. Real-time pricing, designer collaboration, and full production tracking.";
const DEFAULT_OG_IMAGE = "/logo.png";

export function SEO({
  title,
  description,
  canonicalUrl,
  ogImage,
  noindex,
  schemaJsonLd,
}: SEOProps) {
  const resolvedTitle = title ? `${title} | PTRN` : DEFAULT_TITLE;
  const resolvedDescription = description ?? DEFAULT_DESCRIPTION;
  const resolvedOgImage = ogImage ?? DEFAULT_OG_IMAGE;

  return (
    <HelmetProvider>
      <Helmet prioritizeSeoTags>
        <title>{resolvedTitle}</title>
        <meta name="description" content={resolvedDescription} />
        {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}

        {/* Open Graph */}
        <meta property="og:title" content={resolvedTitle} />
        <meta property="og:description" content={resolvedDescription} />
        <meta property="og:type" content="website" />
        {canonicalUrl ? <meta property="og:url" content={canonicalUrl} /> : null}
        <meta property="og:image" content={resolvedOgImage} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        {/* Set your brand handle via env to avoid hardcoding */}
        {import.meta.env.VITE_TWITTER_SITE ? (
          <meta name="twitter:site" content={import.meta.env.VITE_TWITTER_SITE} />
        ) : null}
        <meta name="twitter:title" content={resolvedTitle} />
        <meta name="twitter:description" content={resolvedDescription} />
        <meta name="twitter:image" content={resolvedOgImage} />

        {noindex ? <meta name="robots" content="noindex, nofollow" /> : null}

        {schemaJsonLd ? (
          Array.isArray(schemaJsonLd) ? (
            schemaJsonLd.map((schema, idx) => (
              <script
                // eslint-disable-next-line react/no-array-index-key
                key={idx}
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
              />
            ))
          ) : (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaJsonLd) }}
            />
          )
        ) : null}
      </Helmet>
    </HelmetProvider>
  );
}

export default SEO;

