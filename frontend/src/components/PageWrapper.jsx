/**
 * PageWrapper.jsx
 *
 * Wraps every non-hero page with a consistent top-padding that
 * accounts for the fixed navbar height (≈64px on mobile, 72px desktop).
 *
 * Usage:
 *   import PageWrapper from "../components/PageWrapper";
 *   <PageWrapper>  ...page content...  </PageWrapper>
 *
 * For pages that have their own full-viewport hero (Home, Login, Register)
 * do NOT wrap with PageWrapper — those sections handle spacing themselves
 * via min-h-screen / h-screen positioning.
 */

const PageWrapper = ({ children, className = "" }) => (
  <div
    className={`pt-16 md:pt-[72px] min-h-screen ${className}`}
  >
    {children}
  </div>
);

export default PageWrapper;