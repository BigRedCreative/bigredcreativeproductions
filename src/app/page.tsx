const services = [
  "Brand Strategy",
  "Graphic Design",
  "Print Production",
  "Promotional Campaigns",
  "Packaging & Labels",
  "Event Management",
];

const work = [
  { number: "01", title: "Brand Systems", text: "Logos, visual identity, packaging, and brand direction built to scale." },
  { number: "02", title: "Print & Production", text: "Labels, stickers, signage, promotional materials, and production support." },
  { number: "03", title: "Events & Culture", text: "Event identity, marketing, vendor coordination, promotion, and execution." },
];

export default function Home() {
  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="#top">
          <span className="brand-mark">BR</span>
          <span>Big Red Creative</span>
        </a>
        <div className="nav-links">
          <a href="#services">Services</a>
          <a href="#work">Work</a>
          <a href="#about">About</a>
        </div>
        <a className="nav-cta" href="mailto:hello@bigredcreativeproductions.com">
          Start a project
        </a>
      </nav>

      <section className="hero shell" id="top">
        <div className="eyebrow">Independent creative production company · Michigan</div>
        <h1>
          We build brands
          <span> people feel.</span>
        </h1>
        <div className="hero-bottom">
          <p>
            Big Red Creative Productions blends strategy, design, print,
            promotion, and event management into one bold creative partner.
          </p>
          <a className="circle-link" href="#services" aria-label="Explore services">↓</a>
        </div>
      </section>

      <section className="marquee" aria-label="Services">
        <div className="marquee-track">
          BRANDING · DESIGN · PRINT · PROMOTIONS · EVENTS · CULTURE ·
          BRANDING · DESIGN · PRINT · PROMOTIONS · EVENTS · CULTURE ·
        </div>
      </section>

      <section className="services shell" id="services">
        <div className="section-label">What we do</div>
        <div className="service-grid">
          {services.map((service) => (
            <div className="service-card" key={service}>
              <span>+</span>
              <h2>{service}</h2>
            </div>
          ))}
        </div>
      </section>

      <section className="statement">
        <div className="noise" />
        <div className="shell statement-inner">
          <p className="section-label light">Our approach</p>
          <h2>
            Premium thinking.
            <br />
            Street-level energy.
          </h2>
          <p className="statement-copy">
            Clean systems, bold ideas, and visual work with enough edge to be
            remembered.
          </p>
        </div>
      </section>

      <section className="work shell" id="work">
        <div className="section-heading">
          <span className="section-label">Selected capabilities</span>
          <h2>Built to move brands forward.</h2>
        </div>
        <div className="work-list">
          {work.map((item) => (
            <article key={item.number}>
              <span className="work-number">{item.number}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <span className="arrow">↗</span>
            </article>
          ))}
        </div>
      </section>

      <section className="about shell" id="about">
        <div className="about-block">
          <span className="section-label">Who we are</span>
          <h2>
            Creative production for businesses, artists, founders, and events
            that refuse to look ordinary.
          </h2>
        </div>
        <div className="about-copy">
          <p>
            We help ideas become identities, campaigns, physical products, and
            real-world experiences.
          </p>
          <p>
            From the first sketch to the final print run or event launch, Big
            Red Creative Productions brings every piece together.
          </p>
        </div>
      </section>

      <footer className="footer">
        <div className="shell footer-inner">
          <div>
            <span className="footer-kicker">Let’s build something unforgettable.</span>
            <a className="footer-email" href="mailto:hello@bigredcreativeproductions.com">
              hello@bigredcreativeproductions.com
            </a>
          </div>
          <div className="footer-bottom">
            <span>Big Red Creative Productions LLC</span>
            <span>Branding · Print · Promotions · Events</span>
          </div>
        </div>
      </footer>
    </main>
  );
}