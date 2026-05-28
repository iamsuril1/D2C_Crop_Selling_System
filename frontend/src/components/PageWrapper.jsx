const PageWrapper = ({ children, className = "" }) => (
  <div
    className={`pt-[60px] sm:pt-16 md:pt-[72px] min-h-screen ${className}`}
  >
    {children}
  </div>
);

export default PageWrapper;