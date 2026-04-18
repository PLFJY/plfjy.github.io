function Section({ title, children, contentClassName = "" }) {
  const className = contentClassName ? `section-content ${contentClassName}` : "section-content";

  return (
    <section className="section">
      <h2 className="section-title">{title}</h2>
      <div className={className}>{children}</div>
    </section>
  );
}

export default Section;
