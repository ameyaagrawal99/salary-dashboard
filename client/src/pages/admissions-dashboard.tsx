import { motion } from "framer-motion";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BookOpenText,
  Building2,
  CheckCircle2,
  Globe2,
  GraduationCap,
  Leaf,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import "./admissions-dashboard.css";

const ASSETS = {
  logo: "https://admissions.wpugoa.edu.in/assets/images/logo.webp",
  campus: "https://admissions.wpugoa.edu.in/assets/images/campusImg.webp",
  lifeReadiness: "https://admissions.wpugoa.edu.in/assets/images/lifeReadinessSection.webp",
  prepare: "https://admissions.wpugoa.edu.in/assets/images/prepareSectionBg.webp",
  scholarship: "https://admissions.wpugoa.edu.in/assets/images/excellence-1.webp",
  legacy: "https://admissions.wpugoa.edu.in/assets/images/legacy.webp",
};

const NAV_LINKS = [
  { href: "#programs", label: "Programs" },
  { href: "#experience", label: "Campus Life" },
  { href: "#admission-process", label: "Admissions" },
  { href: "#scholarships", label: "Scholarships" },
];

const TRUST_POINTS = [
  "43+ years of MIT-WPU Pune legacy",
  "1,00,000+ alumni across the globe",
  "2000+ industry connects",
  "A fully residential campus",
];

const PROGRAMS = [
  {
    title: "B.Tech Computer Science & Engineering",
    image: "https://admissions.wpugoa.edu.in/assets/images/program-btech-1.webp",
    points: [
      "Artificial Intelligence & Machine Learning",
      "Data Science & Analytics",
      "Cybersecurity & System Design",
    ],
  },
  {
    title: "B.Tech Electronics & Semiconductor Engineering",
    image: "https://admissions.wpugoa.edu.in/assets/images/program-btech-2.webp",
    points: [
      "VLSI Design & Fabrication",
      "Embedded & IoT Systems",
      "Semiconductor Manufacturing & Process Technology",
    ],
  },
  {
    title: "B.Tech Energy Systems Engineering",
    image: "https://admissions.wpugoa.edu.in/assets/images/program-btech-3.webp",
    points: [
      "Renewable & Sustainable Energy Systems",
      "Smart Grids & Energy Analytics",
      "Energy Storage & Electrification Technologies",
    ],
  },
  {
    title: "Bachelor of Management Studies (BMS)",
    image: "https://admissions.wpugoa.edu.in/assets/images/program-bms-1.webp",
    points: [
      "Entrepreneurship & Innovation Management",
      "Fintech & Financial Analysis",
      "Business Strategy & Systems Design",
    ],
  },
];

const FOUNDATIONS = [
  {
    title: "Collaboratively Designed",
    body: "Created through the shared thinking of scholars, experts, and practitioners.",
    icon: Users,
  },
  {
    title: "Globally Informed",
    body: "Shaped by international perspectives and worldwide academic dialogue.",
    icon: Globe2,
  },
  {
    title: "Locally Rooted",
    body: "Grounded in local realities and real-world relevance.",
    icon: Leaf,
  },
];

const OUTCOME_TILES = [
  { label: "Living Learning Scholar Communities", value: "Interdisciplinary peer communities" },
  { label: "24x7 Integrated Learning Environment", value: "Learning continues beyond classrooms" },
  { label: "Mentorship & Personal Development", value: "Academic and leadership guidance" },
  { label: "Safe, Purpose-Led Campus Design", value: "Security and focus by design" },
];

const ADMISSION_STEPS = [
  "Create an online account on the website",
  "Fill the registration form",
  "Appear for the entrance exam (as applicable)",
  "Appear for the personal interaction",
  "Check the merit list",
  "Complete fee payment and verification",
];

const SCHOLARSHIP_POINTS = [
  "For top incoming students with national or international academic distinction",
  "100% tuition fee waiver for up to 4 years",
  "Minimum GPA of 7 required each semester",
  "Participation in immersions and internships required",
];

const METRICS = [
  { value: "43+", label: "Years of MIT-WPU legacy" },
  { value: "100+", label: "Student clubs" },
  { value: "240+", label: "Modern labs" },
  { value: "45+", label: "Nationalities" },
  { value: "2000+", label: "Industry connects" },
  { value: "540+", label: "Patents" },
];

type RevealProps = {
  children: ReactNode;
  className?: string;
  id?: string;
  delay?: number;
};

function RevealSection({ children, className, id, delay = 0 }: RevealProps) {
  return (
    <motion.section
      id={id}
      className={className}
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, ease: "easeOut", delay }}
    >
      {children}
    </motion.section>
  );
}

export default function AdmissionsDashboardPage() {
  return (
    <div className="wpu-landing">
      <div className="wpu-top-strip">Admissions Open for 2026 Intake</div>

      <header className="wpu-nav-shell">
        <div className="wpu-nav">
          <a className="wpu-brand" href="#top" aria-label="WPU Goa home">
            <img src={ASSETS.logo} alt="WPU Goa" loading="lazy" />
          </a>
          <nav className="wpu-nav-links">
            {NAV_LINKS.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
          <a className="wpu-cta wpu-cta-small" href="#admission-form">
            Apply Now
            <ArrowRight size={16} />
          </a>
        </div>
      </header>

      <main className="wpu-main" id="top">
        <section className="wpu-hero">
          <div className="wpu-hero-image" aria-hidden />
          <div className="wpu-hero-overlay" aria-hidden />
          <div className="wpu-container wpu-hero-grid">
            <motion.div
              className="wpu-hero-copy"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            >
              <p className="wpu-kicker">India's First Transdisciplinary University</p>
              <h1>WPU Goa</h1>
              <p className="wpu-hero-sub">
                Reimagining higher education with integrated learning across technology, design, and
                management.
              </p>
              <div className="wpu-chip-row">
                <span>B.Tech.</span>
                <span>B.Des.</span>
                <span>B.Sc. (Hons.)</span>
                <span>BMS (Hons.)</span>
              </div>
              <div className="wpu-hero-actions">
                <a className="wpu-cta" href="#admission-form">
                  Register Now
                  <ArrowRight size={16} />
                </a>
                <a className="wpu-link-button" href="#programs">
                  Explore Programs
                </a>
              </div>
              <div className="wpu-hero-metrics">
                {TRUST_POINTS.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="wpu-hero-card-wrap"
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.12 }}
            >
              <div className="wpu-glass-card">
                <img src={ASSETS.campus} alt="WPU Goa campus" loading="lazy" />
                <div className="wpu-glass-card-body">
                  <p>A campus built for the next 50 years</p>
                  <h3>Fully residential, future-ready learning ecosystem</h3>
                </div>
              </div>
              <form className="wpu-form-card" id="admission-form">
                <h2>Enquire Now / Register Now</h2>
                <label htmlFor="name">Full Name</label>
                <input id="name" name="name" placeholder="Enter name" />
                <label htmlFor="email">Email Address</label>
                <input id="email" name="email" placeholder="Enter email address" type="email" />
                <label htmlFor="phone">Mobile Number</label>
                <input id="phone" name="phone" placeholder="+91 Enter mobile number" />
                <label htmlFor="program">Select Program</label>
                <select id="program" name="program" defaultValue="">
                  <option disabled value="">
                    Choose an option
                  </option>
                  <option>B.Tech.</option>
                  <option>B.Des.</option>
                  <option>B.Sc. (Hons.)</option>
                  <option>BMS (Hons.)</option>
                </select>
                <button type="button">
                  Submit
                  <ArrowRight size={16} />
                </button>
              </form>
            </motion.div>
          </div>
        </section>

        <div className="wpu-trust-strip">
          <div className="wpu-container">
            {TRUST_POINTS.map((point) => (
              <p key={point}>{point}</p>
            ))}
          </div>
        </div>

        <RevealSection className="wpu-container wpu-section wpu-why" id="why" delay={0.04}>
          <div className="wpu-section-head">
            <p className="wpu-kicker">Why WPU Goa</p>
            <h2>
              Reimagining the Future of Higher Education with India's First Transdisciplinary University
            </h2>
            <p>
              Today's continuously evolving world demands people who can think beyond one subject. At WPU
              Goa, students build depth in one discipline while learning to work across domains.
            </p>
          </div>
          <div className="wpu-three-up">
            {FOUNDATIONS.map((item) => (
              <article key={item.title} className="wpu-surface-card">
                <item.icon size={20} />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </RevealSection>

        <RevealSection className="wpu-container wpu-section" id="programs" delay={0.06}>
          <div className="wpu-section-head">
            <p className="wpu-kicker">Program Portfolio</p>
            <h2>One Degree. Many Possibilities.</h2>
            <p>
              Each 4-year programme helps students build strong knowledge in one main field while learning
              how it connects with other areas.
            </p>
          </div>
          <div className="wpu-program-grid">
            {PROGRAMS.map((program) => (
              <article key={program.title} className="wpu-program-card">
                <img src={program.image} alt={program.title} loading="lazy" />
                <div className="wpu-program-body">
                  <h3>{program.title}</h3>
                  <ul>
                    {program.points.map((point) => (
                      <li key={point}>
                        <CheckCircle2 size={16} />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </RevealSection>

        <RevealSection className="wpu-container wpu-section wpu-experience" id="experience" delay={0.08}>
          <div className="wpu-section-head">
            <p className="wpu-kicker">The World Is Your Campus</p>
            <h2>Global exposure, immersive learning, and life-readiness in every year</h2>
          </div>
          <div className="wpu-experience-grid">
            <div className="wpu-image-panel">
              <img src={ASSETS.campus} alt="The world is your campus at WPU Goa" loading="lazy" />
            </div>
            <div className="wpu-outcome-list">
              {OUTCOME_TILES.map((tile) => (
                <article key={tile.label}>
                  <h3>{tile.label}</h3>
                  <p>{tile.value}</p>
                </article>
              ))}
            </div>
          </div>
        </RevealSection>

        <RevealSection className="wpu-section wpu-life-ready" delay={0.1}>
          <div className="wpu-container wpu-life-ready-inner">
            <div className="wpu-life-copy">
              <p className="wpu-kicker">Residential Learning</p>
              <h2>A Residential Ecosystem Designed for Life-Readiness</h2>
              <p>
                WPU Goa is fully residential by intent. Conversations extend beyond classrooms, and the
                campus functions as a living curriculum that shapes independence, responsibility, and
                well-being.
              </p>
            </div>
            <div className="wpu-life-media">
              <img src={ASSETS.lifeReadiness} alt="Life readiness ecosystem at WPU Goa" loading="lazy" />
            </div>
          </div>
        </RevealSection>

        <RevealSection className="wpu-goa-banner" delay={0.12}>
          <div className="wpu-goa-bg" aria-hidden />
          <div className="wpu-container">
            <div className="wpu-goa-card">
              <h2>
                <span>Goa is Changing.</span> Education is Leading the Change.
              </h2>
              <p>
                At WPU Goa, the surrounding ecosystem becomes part of learning. Local enterprises,
                sustainability initiatives, cultural networks, and emerging industries become spaces for
                inquiry, collaboration, and impact.
              </p>
            </div>
          </div>
        </RevealSection>

        <RevealSection className="wpu-container wpu-section" id="admission-process" delay={0.14}>
          <div className="wpu-admission-shell">
            <div className="wpu-section-head">
              <p className="wpu-kicker">Admissions</p>
              <h2>Admission Process</h2>
              <p>
                Candidates are evaluated holistically using the ABC model: Agility & Empathetic
                Responsiveness, Broad-Minded Learning Orientation & Self-Development, and Curiosity for
                Complex Problems & Co-Creation for Change.
              </p>
            </div>
            <div className="wpu-step-grid">
              {ADMISSION_STEPS.map((step, index) => (
                <article key={step}>
                  <span>{`${index + 1}`.padStart(2, "0")}</span>
                  <p>{step}</p>
                </article>
              ))}
            </div>
            <div className="wpu-table-wrap">
              <div className="wpu-table-title">
                <BookOpenText size={18} />
                <span>Assessment Framework Includes</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Past Academic Records</th>
                    <th>Entrance Examination</th>
                    <th>Written Essay</th>
                    <th>Video Essay</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Previous performance and learning journey</td>
                    <td>Assessment of readiness and calibre</td>
                    <td>Aptitude and written expression</td>
                    <td>Recorded response beyond marks</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </RevealSection>

        <RevealSection className="wpu-container wpu-section" id="scholarships" delay={0.16}>
          <div className="wpu-scholarship">
            <div className="wpu-scholarship-copy">
              <p className="wpu-kicker">Funding Support</p>
              <h2>Scholarships that Reward Brilliance</h2>
              <p>
                Excellence takes many forms at WPU Goa. Scholarships recognise high academic achievers and
                students who excel in sports, arts, leadership, and innovation.
              </p>
              <ul>
                {SCHOLARSHIP_POINTS.map((point) => (
                  <li key={point}>
                    <Sparkles size={16} />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <a className="wpu-cta" href="#admission-form">
                Download Brochure
                <ArrowRight size={16} />
              </a>
            </div>
            <div className="wpu-scholarship-media">
              <img src={ASSETS.scholarship} alt="WPU Goa scholarship highlight" loading="lazy" />
            </div>
          </div>
        </RevealSection>

        <RevealSection className="wpu-container wpu-section wpu-metrics" delay={0.18}>
          {METRICS.map((metric) => (
            <article key={metric.label}>
              <h3>{metric.value}</h3>
              <p>{metric.label}</p>
            </article>
          ))}
        </RevealSection>

        <RevealSection className="wpu-container wpu-section wpu-final-cta" delay={0.2}>
          <div className="wpu-final-copy">
            <p className="wpu-kicker">A Four-Decade Legacy</p>
            <h2>Built on trust, academic rigour, and long-term purpose</h2>
            <p>
              WPU Goa carries forward the MIT-WPU legacy with institutional maturity, governance strength,
              and a future-focused learning model designed for new-world careers.
            </p>
            <div className="wpu-final-actions">
              <a className="wpu-cta" href="#admission-form">
                Talk to Us
                <ArrowRight size={16} />
              </a>
              <a className="wpu-link-button" href="https://admissions.wpugoa.edu.in/">
                Visit Current Admissions Site
              </a>
            </div>
            <div className="wpu-signals">
              <span>
                <ShieldCheck size={16} /> Safe, fully residential environment
              </span>
              <span>
                <Building2 size={16} /> Purpose-led campus infrastructure
              </span>
              <span>
                <GraduationCap size={16} /> Integrated transdisciplinary learning
              </span>
            </div>
          </div>
          <div className="wpu-final-media">
            <img src={ASSETS.prepare} alt="WPU Goa academic environment" loading="lazy" />
            <img src={ASSETS.legacy} alt="WPU Goa legacy and outcomes" loading="lazy" />
          </div>
        </RevealSection>
      </main>

      <footer className="wpu-footer">
        <div className="wpu-container">
          <p>
            MAEER's MIT Group of Institutions has over four decades of legacy in professional education
            across India.
          </p>
          <p>Copyright © WPU Goa 2026. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
