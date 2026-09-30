import Script from "next/script";

/**
 * Google Tag Manager + Microsoft Clarity loaders — the Next.js equivalent of
 * the JSP app's:
 *   <c:if test="${DEPLOYMENT_MODE=='PROD'}"> ...GTM + Clarity inline scripts... </c:if>
 *
 * Only renders when NEXT_PUBLIC_DEPLOYMENT_MODE === "PROD", so trackers never
 * fire in dev/staging (same gate as the JSP). IDs come from env
 * (NEXT_PUBLIC_GTM_ID / NEXT_PUBLIC_CLARITY_ID), not hardcoded.
 *
 * Uses next/script with strategy "afterInteractive" — the framework-correct
 * way to inject third-party tags (loads after hydration, same intent as the
 * legacy async inline snippets). The GTM <noscript> iframe is rendered too,
 * mirroring the JSP's <noscript> fallback at the top of <body>.
 */
export function AnalyticsScripts() {
  const isProd = process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === "PROD";
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;

  if (!isProd) return null;

  return (
    <>
      {gtmId && (
        <>
          {/* Google Tag Manager */}
          <Script id="gtm-loader" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`}
          </Script>
          {/* Google Tag Manager (noscript) */}
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
              title="gtm"
            />
          </noscript>
        </>
      )}

      {clarityId && (
        <Script id="clarity-loader" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window,document,"clarity","script","${clarityId}");`}
        </Script>
      )}
    </>
  );
}
