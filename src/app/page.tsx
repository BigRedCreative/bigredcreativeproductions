const services = [
  {
    number: "01",
    title: "Brand Strategy",
    text: "Naming, positioning, identity systems and brand direction with enough personality to own the room.",
    tags: ["Identity", "Naming", "Direction"],
  },
  {
    number: "02",
    title: "Design & Packaging",
    text: "Logos, product packaging, labels, menus and campaign artwork built for shelf impact and street-level recognition.",
    tags: ["Packaging", "Labels", "Graphics"],
  },
  {
    number: "03",
    title: "Print Production",
    text: "Stickers, signage, banners, collateral and production-ready files made to hit hard in the real world.",
    tags: ["Stickers", "Signs", "Collateral"],
  },
  {
    number: "04",
    title: "Promotions",
    text: "Campaign concepts, social drops, launch visuals and promotional systems that build momentum and attention.",
    tags: ["Campaigns", "Social", "Launches"],
  },
  {
    number: "05",
    title: "Event Management",
    text: "Event identity, artist and vendor promotion, guest communication, marketing assets and creative execution.",
    tags: ["Events", "Vendors", "Culture"],
  },
  {
    number: "06",
    title: "Digital Experiences",
    text: "Modern websites and digital touchpoints that move like your brand and turn attention into action.",
    tags: ["Web", "UX", "Digital"],
  },
];

const projects = [
  {
    title: "SP Juices",
    type: "Brand identity · Packaging · Print",
    copy: "A loud, flavor-forward juice identity across labels, menus and promotional art.",
    className: "project-red",
    stamp: "FRESH DROP",
  },
  {
    title: "Crash The Stove",
    type: "Event identity · Promotions · Production",
    copy: "A culture-first event campaign spanning artist promotion, vendor communication and live-event graphics.",
    className: "project-dark",
    stamp: "LIVE CULTURE",
  },
  {
    title: "Product Packaging",
    type: "Creative direction · Labels · Finishing",
    copy: "High-impact packaging systems designed for shelf presence, brand recall and production readiness.",
    className: "project-cream",
    stamp: "BUILT TO MOVE",
  },
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="logo" href="#top" aria-label="Big Red Creative Productions home">
          <img src="/brand/logo-horizontal.svg" alt="Big Red Creative Productions" />
        </a>
        <nav aria-label="Primary navigation">
          <a href="#services">Services</a>
          <a href="#work">Work</a>
          <a href="#studio">Studio</a>
          <a href="#contact">Contact</a>
        </nav>
        <a className="header-cta" href="#contact">Book the vision</a>
      </header>

      <section className="hero grain" id="top">
        <div className="hero-sticker sticker-one">BUILT DIFFERENT</div>
        <div className="hero-sticker sticker-two">EST. MICHIGAN</div>
        <div className="hero-meta">
          <span>Independent creative production company</span>
          <span>Michigan · Available nationwide</span>
        </div>

        <h1>
          We make brands
          <span>move culture.</span>
        </h1>

        <div className="hero-tagline">BRANDING · PRINT · PROMOTIONS · EVENTS</div>

        <div className="hero-foot">
          <p>
            Strategy, design, print, promotion and event execution with premium
            polish, hip-hop energy and enough grit to be remembered.
          </p>
          <a href="#work" className="round-button" aria-label="View selected work">
            <span>See the work</span>
            <b>↘</b>
          </a>
        </div>
      </section>

      <div className="ticker" aria-hidden="true">
        <div>
          BIG IDEAS ✦ BOLD DESIGNS ✦ UNFORGETTABLE EVENTS ✦ BIG IDEAS ✦
          BOLD DESIGNS ✦ UNFORGETTABLE EVENTS ✦
        </div>
      </div>

      <section className="manifesto">
        <div className="kicker">The mission</div>
        <p>
          We turn raw ideas into brands with presence—visual systems that feel
          polished enough for the boardroom and real enough for the block.
        </p>
      </section>

      <section className="services section" id="services">
        <div className="section-top">
          <span className="kicker">What we bring</span>
          <h2>Full-service creative. No watered-down energy.</h2>
        </div>
        <div className="services-list">
          {services.map((service) => (
            <article className="service-row" key={service.number}>
              <span className="service-number">{service.number}</span>
              <h3>{service.title}</h3>
              <p>{service.text}</p>
              <div className="tags">
                {service.tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="statement grain">
        <div className="statement-label">NO GENERIC BRANDS</div>
        <span className="kicker">Our point of view</span>
        <h2>
          Clean strategy.
          <br />
          Raw energy.
        </h2>
        <p>
          High-end creative direction with the confidence, rhythm and visual
          punch of hip-hop culture.
        </p>
      </section>

      <section className="work section" id="work">
        <div className="section-top">
          <span className="kicker">Selected work</span>
          <h2>Made to stop the scroll and own the room.</h2>
        </div>
        <div className="project-grid">
          {projects.map((project, index) => (
            <article className={`project-card ${project.className}`} key={project.title}>
              <div className="project-topline">
                <span className="project-index">0{index + 1}</span>
                <span className="project-stamp">{project.stamp}</span>
              </div>
              <div className="project-art">
                <span>{project.title.split(" ")[0]}</span>
                <b>{project.title.split(" ").slice(1).join(" ")}</b>
              </div>
              <div className="project-info">
                <div>
                  <p>{project.type}</p>
                  <h3>{project.title}</h3>
                </div>
                <p>{project.copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="studio section" id="studio">
        <div className="studio-title">
          <span className="kicker">The studio</span>
          <h2>One team. One vision. Every touchpoint connected.</h2>
        </div>
        <div className="studio-copy">
          <p>
            Big Red Creative Productions works with entrepreneurs, artists,
            product brands, venues and event organizers that need more than
            isolated design files.
          </p>
          <p>
            We bring brand identity, physical production, campaign thinking and
            live-event creative under one roof so the whole experience hits
            with one voice.
          </p>
          <div className="principles">
            <span>Bold, never reckless.</span>
            <span>Urban, never cliché.</span>
            <span>Professional, never boring.</span>
          </div>
        </div>
      </section>

      <section className="process section">
        <span className="kicker">The rollout</span>
        <div className="process-grid">
          <article><b>01</b><h3>Tap In</h3><p>We learn the idea, audience, goals and energy.</p></article>
          <article><b>02</b><h3>Set Direction</h3><p>Strategy, creative direction and a clear plan.</p></article>
          <article><b>03</b><h3>Build It</h3><p>Design, revise, refine and prep for production.</p></article>
          <article><b>04</b><h3>Drop It</h3><p>Launch, deliver and keep the momentum moving.</p></article>
        </div>
      </section>

      <section className="contact grain" id="contact">
        <div>
          <span className="kicker">Start a project</span>
          <h2>Let’s make noise.</h2>
          <p>Tell us what you’re building and where you need creative support.</p>
        </div>
        <form action="mailto:hello@bigredcreativeproductions.com" method="post" encType="text/plain">
          <label>
            Your name
            <input name="name" required placeholder="Name or company" />
          </label>
          <label>
            Email
            <input name="email" type="email" required placeholder="you@company.com" />
          </label>
          <label>
            Service
            <select name="service" defaultValue="">
              <option value="" disabled>Select a service</option>
              <option>Branding</option>
              <option>Packaging & Labels</option>
              <option>Print Production</option>
              <option>Promotions</option>
              <option>Event Management</option>
              <option>Website</option>
              <option>Multiple Services</option>
            </select>
          </label>
          <label>
            Project details
            <textarea name="details" required placeholder="Tell us about the vision, timing and budget." />
          </label>
          <button type="submit">Send the vision ↗</button>
        </form>
      </section>

      <footer>
        <img src="/brand/logo-white.svg" alt="Big Red Creative Productions" />
        <a href="mailto:hello@bigredcreativeproductions.com">
          hello@bigredcreativeproductions.com
        </a>
        <div className="footer-bottom">
          <span>Big Red Creative Productions LLC</span>
          <span>Branding · Print · Promotions · Events</span>
          <a href="#top">Back to top ↑</a>
        </div>
      </footer>
    </main>
  );
}