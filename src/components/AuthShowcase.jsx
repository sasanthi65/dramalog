/** Cinematic collage panel shared by the login and signup screens. */
export default function AuthShowcase({ quote }) {
  return (
    <section className="auth-showcase" aria-hidden="true">
      <div className="auth-showcase__grid">
        <div className="auth-showcase__tile" />
        <div className="auth-showcase__tile" />
        <div className="auth-showcase__tile" />
      </div>
      <div className="auth-showcase__scrim" />
      <div className="auth-showcase__content">
        <p className="auth-showcase__brand">DramaLog</p>
        <p className="auth-showcase__quote">{quote}</p>
      </div>
    </section>
  );
}
