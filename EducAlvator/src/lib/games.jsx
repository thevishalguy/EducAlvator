// Game Center catalog — labels & copy taken from the reference chatbot page.
export const GAMES = [
  {
    no: "01",
    subject: "Maths",
    name: "EduRunner",
    slug: "maths",
    desc: "Take off with numbers & fractions",
    long: "Solve each question to keep your plane soaring. A flight game that turns arithmetic and fractions into momentum.",
    color: "yellow",
    icon: "plane",
    src: "/games/maths/index.html",
  },
  {
    no: "02",
    subject: "English",
    name: "EduJumper",
    slug: "english",
    desc: "Race through vocabulary & grammar",
    long: "Build vocabulary as you dash, dodge, and discover. A word-run adventure through new words and grammar.",
    color: "coral",
    icon: "book",
    src: "/games/english/index.html",
  },
  {
    no: "03",
    subject: "Science",
    name: "EduSurfer",
    slug: "science",
    desc: "Catch a science wave & physics concepts",
    long: "Explore big ideas one curious question at a time. Ride the wave through science and physics concepts.",
    color: "green",
    icon: "wave",
    src: "/games/science/index.html",
  },
];

export function gameBySlug(slug) {
  return GAMES.find((g) => g.slug === slug);
}

export function GameIcon({ type, size = 26 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  if (type === "plane")
    return (
      <svg {...common}>
        <path d="M17.8 19.2 16 11l3.5-3.5a2.1 2.1 0 0 0-3-3L13 8 4.8 6.2a.5.5 0 0 0-.5.8l4.4 4.4-2.1 3.5-2.4-.3a.4.4 0 0 0-.3.7L6 20l1.7 1.6a.4.4 0 0 0 .7-.3l-.3-2.4 3.5-2.1 4.4 4.4a.5.5 0 0 0 .8-.5Z" />
      </svg>
    );
  if (type === "book")
    return (
      <svg {...common}>
        <path d="M4 5a2 2 0 0 1 2-2h7v16H6a2 2 0 0 0-2 2V5Z" />
        <path d="M20 5a2 2 0 0 0-2-2h-5v16h5a2 2 0 0 1 2 2V5Z" />
      </svg>
    );
  // wave
  return (
    <svg {...common}>
      <path d="M2 8c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2" />
      <path d="M2 14c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2" />
    </svg>
  );
}
