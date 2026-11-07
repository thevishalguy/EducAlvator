// Grade-aware study bank.
// Each grade gets its own distinct set of topics per subject. Maths & English
// questions are generated and scaled by grade; Science uses curated themed pools.
// Quiz questions and flashcards are both derived from the same per-topic items,
// so a flashcard's front is a question and its back is the correct answer.

/* ------------------------------------------------------------------ */
/* Deterministic RNG + helpers                                        */
/* ------------------------------------------------------------------ */
function makeRand(seedStr) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ri = (rand, min, max) => Math.floor(rand() * (max - min + 1)) + min;
function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];

// Build 4 numeric options around a correct answer.
function mcNum(rand, answer, spread, allowNeg = false) {
  const s = new Set([answer]);
  let guard = 0;
  while (s.size < 4 && guard++ < 80) {
    const d = answer + ri(rand, -spread, spread);
    if ((allowNeg || d >= 0) && !s.has(d)) s.add(d);
  }
  while (s.size < 4) s.add(answer + s.size); // safety
  const opts = shuffle([...s], rand).map(String);
  return { options: opts, answer: opts.indexOf(String(answer)) };
}
// Build 4 text options from a correct value + a distractor pool.
function mcText(rand, correct, pool) {
  const ds = shuffle(pool.filter((x) => x !== correct), rand).slice(0, 3);
  const opts = shuffle([correct, ...ds], rand);
  return { options: opts, answer: opts.indexOf(correct) };
}

/* ------------------------------------------------------------------ */
/* Maths generators (scaled by grade)                                 */
/* ------------------------------------------------------------------ */
const addCap = (g) => (g <= 1 ? 10 : g <= 2 ? 20 : g <= 3 ? 50 : g <= 4 ? 100 : g <= 5 ? 999 : 9999);
const multCap = (g) => (g <= 3 ? 10 : g <= 4 ? 12 : g <= 6 ? 15 : g <= 8 ? 20 : 30);

const GEO_FACTS = [
  { q: "How many sides does a triangle have?", options: ["2", "3", "4", "5"], answer: 1 },
  { q: "How many sides does a square have?", options: ["3", "4", "5", "6"], answer: 1 },
  { q: "A shape with 5 sides is a:", options: ["Hexagon", "Pentagon", "Square", "Octagon"], answer: 1 },
  { q: "How many corners does a cube have?", options: ["6", "8", "10", "12"], answer: 1 },
  { q: "A circle is round and has how many straight sides?", options: ["0", "1", "2", "4"], answer: 0 },
  { q: "A right angle measures:", options: ["45°", "90°", "180°", "360°"], answer: 1 },
  { q: "How many sides does a hexagon have?", options: ["5", "6", "7", "8"], answer: 1 },
  { q: "The angles of a triangle add up to:", options: ["90°", "180°", "270°", "360°"], answer: 1 },
  { q: "A shape with 8 sides is an:", options: ["Octagon", "Pentagon", "Hexagon", "Heptagon"], answer: 0 },
  { q: "A full turn is how many degrees?", options: ["90°", "180°", "270°", "360°"], answer: 3 },
];

const MATHS_GEN = {
  add: (g, r) => {
    const cap = addCap(g);
    const a = ri(r, 2, cap), b = ri(r, 1, cap);
    return { q: `${a} + ${b} = ?`, ...mcNum(r, a + b, Math.max(2, Math.round(cap / 8))) };
  },
  sub: (g, r) => {
    const cap = addCap(g);
    const a = ri(r, 5, cap), b = ri(r, 1, a);
    return { q: `${a} − ${b} = ?`, ...mcNum(r, a - b, Math.max(2, Math.round(cap / 8))) };
  },
  mult: (g, r) => {
    const cap = multCap(g);
    const a = ri(r, 2, cap), b = ri(r, 2, cap);
    return { q: `${a} × ${b} = ?`, ...mcNum(r, a * b, Math.max(2, Math.round((a * b) / 6))) };
  },
  div: (g, r) => {
    const cap = multCap(g);
    const b = ri(r, 2, cap), c = ri(r, 2, cap), a = b * c;
    return { q: `${a} ÷ ${b} = ?`, ...mcNum(r, c, 3) };
  },
  squares: (g, r) => {
    const a = ri(r, 2, g <= 6 ? 12 : 20);
    return { q: `What is ${a}² (${a} squared)?`, ...mcNum(r, a * a, Math.max(3, a)) };
  },
  percent: (g, r) => {
    const p = pick(r, [10, 20, 25, 50]);
    const step = 100 / p;
    const n = step * ri(r, 2, 20);
    return { q: `What is ${p}% of ${n}?`, ...mcNum(r, (n * p) / 100, Math.max(2, Math.round((n * p) / 100 / 3))) };
  },
  integers: (g, r) => {
    const a = ri(r, 1, 20), b = ri(r, 1, 20);
    return { q: `(−${a}) + ${b} = ?`, ...mcNum(r, b - a, 4, true) };
  },
  algebra: (g, r) => {
    const m = ri(r, 2, 6), x = ri(r, 1, 12), b = ri(r, 1, 20), c = m * x + b;
    return { q: `If ${m}x + ${b} = ${c}, what is x?`, ...mcNum(r, x, 3) };
  },
  sequence: (g, r) => {
    const start = ri(r, 1, 9), d = ri(r, 2, 6);
    const terms = [start, start + d, start + 2 * d, start + 3 * d];
    return { q: `What comes next: ${terms.join(", ")}, … ?`, ...mcNum(r, start + 4 * d, d) };
  },
  mean: (g, r) => {
    let a = ri(r, 2, 18), b = ri(r, 2, 18), c = ri(r, 2, 18);
    c += (3 - ((a + b + c) % 3)) % 3;
    return { q: `What is the mean (average) of ${a}, ${b} and ${c}?`, ...mcNum(r, (a + b + c) / 3, 3) };
  },
  fractions: (g, r) => {
    const n = ri(r, 1, 4), d = ri(r, n + 1, 6), k = ri(r, 2, 3);
    const correct = `${n * k}/${d * k}`;
    const pool = [`${n + 1}/${d + 1}`, `${n}/${d + k}`, `${n * k}/${d}`, `${n}/${d * k}`, `${n + k}/${d}`];
    return { q: `Which fraction is equal to ${n}/${d}?`, ...mcText(r, correct, pool) };
  },
  decimals: (g, r) => {
    const a = ri(r, 11, 98) / 10, b = ri(r, 11, 98) / 10;
    const ans = (a + b).toFixed(1);
    const pool = [(a + b + 0.1).toFixed(1), (a + b - 0.1).toFixed(1), (a + b + 1).toFixed(1), (a + b - 0.2).toFixed(1)];
    return { q: `${a.toFixed(1)} + ${b.toFixed(1)} = ?`, ...mcText(r, ans, pool) };
  },
  geo: (g, r, i) => GEO_FACTS[i % GEO_FACTS.length],
};

/* ------------------------------------------------------------------ */
/* English word banks + generators                                    */
/* ------------------------------------------------------------------ */
const SYN_EASY = [["big", "large"], ["small", "tiny"], ["happy", "glad"], ["fast", "quick"], ["cold", "chilly"], ["begin", "start"], ["end", "finish"], ["smart", "clever"], ["angry", "mad"], ["scared", "afraid"], ["pretty", "lovely"], ["quiet", "silent"], ["brave", "bold"], ["rich", "wealthy"], ["easy", "simple"]];
const SYN_HARD = [["abundant", "plentiful"], ["brief", "concise"], ["candid", "honest"], ["diligent", "hardworking"], ["eager", "keen"], ["fragile", "delicate"], ["generous", "giving"], ["hostile", "unfriendly"], ["immense", "huge"], ["jovial", "cheerful"], ["lenient", "easygoing"], ["meagre", "scanty"], ["novice", "beginner"], ["obstinate", "stubborn"], ["prudent", "careful"]];
const ANT_EASY = [["hot", "cold"], ["up", "down"], ["big", "small"], ["fast", "slow"], ["happy", "sad"], ["day", "night"], ["open", "shut"], ["full", "empty"], ["light", "dark"], ["high", "low"], ["wet", "dry"], ["hard", "soft"], ["old", "new"], ["rich", "poor"], ["true", "false"]];
const ANT_HARD = [["expand", "contract"], ["ancient", "modern"], ["generous", "selfish"], ["victory", "defeat"], ["praise", "criticise"], ["humble", "arrogant"], ["scarce", "abundant"], ["temporary", "permanent"], ["transparent", "opaque"], ["optimist", "pessimist"], ["include", "exclude"], ["artificial", "natural"], ["major", "minor"], ["accept", "reject"], ["brave", "cowardly"]];
const SPELL_EASY = [["because", ["becuase", "becos", "becawse"]], ["friend", ["freind", "frend", "freend"]], ["school", ["skool", "schol", "schoool"]], ["people", ["peeple", "peepul", "poeple"]], ["which", ["wich", "whitch", "wiche"]], ["every", ["evry", "everey", "evrey"]], ["little", ["littel", "litle", "liytle"]], ["pretty", ["prity", "prettty", "prettie"]], ["family", ["familly", "famly", "fammily"]], ["animal", ["anmal", "animel", "aminal"]], ["water", ["watar", "watter", "wotter"]], ["happy", ["hapy", "happi", "hapyy"]]];
const SPELL_HARD = [["necessary", ["neccessary", "necesary", "necessery"]], ["separate", ["seperate", "separete", "seperrate"]], ["definitely", ["definately", "definatly", "definetly"]], ["embarrass", ["embarass", "embaras", "embarras"]], ["rhythm", ["rythm", "rhythem", "rythem"]], ["government", ["goverment", "govenment", "govermnent"]], ["occurrence", ["occurence", "occurrance", "ocurrence"]], ["privilege", ["priviledge", "privelege", "privilige"]], ["conscience", ["conscence", "concience", "consience"]], ["maintenance", ["maintainance", "maintnance", "maintenence"]], ["accommodate", ["acommodate", "accomodate", "acomodate"]], ["millennium", ["millenium", "milennium", "millenneum"]]];
const POS_EASY = { noun: ["table", "dog", "city", "apple", "book", "river", "chair", "ball"], verb: ["run", "jump", "sing", "eat", "swim", "read", "play", "write"], adjective: ["bright", "tall", "cold", "soft", "happy", "quick", "tiny", "brave"], adverb: ["quickly", "slowly", "loudly", "gently", "soon", "often", "here", "away"] };
const POS_HARD = { noun: ["democracy", "courage", "scientist", "journey", "freedom", "theory", "evidence", "climate"], verb: ["analyse", "construct", "persuade", "illustrate", "evaluate", "negotiate", "emphasise", "distribute"], adjective: ["efficient", "reluctant", "ambitious", "fragile", "generous", "obvious", "sincere", "vivid"], adverb: ["frequently", "rarely", "precisely", "eagerly", "briefly", "deliberately", "cautiously", "thoroughly"] };
const RHYME_POOL = [
  { q: "Which word rhymes with 'cat'?", options: ["dog", "hat", "cup", "sun"], answer: 1 },
  { q: "Which word rhymes with 'tree'?", options: ["bee", "car", "top", "man"], answer: 0 },
  { q: "Which word rhymes with 'star'?", options: ["sit", "car", "moon", "leg"], answer: 1 },
  { q: "Which word rhymes with 'light'?", options: ["night", "lamp", "road", "book"], answer: 0 },
  { q: "Which word rhymes with 'play'?", options: ["day", "pin", "cow", "egg"], answer: 0 },
  { q: "Which word rhymes with 'mouse'?", options: ["mice", "house", "farm", "milk"], answer: 1 },
  { q: "Which word rhymes with 'ball'?", options: ["bell", "tall", "boot", "ring"], answer: 1 },
  { q: "Which word rhymes with 'bake'?", options: ["bark", "cake", "book", "bite"], answer: 1 },
  { q: "Which word rhymes with 'frog'?", options: ["fish", "dog", "duck", "deer"], answer: 1 },
  { q: "Which word rhymes with 'rain'?", options: ["train", "rock", "rope", "roof"], answer: 0 },
];
const IDIOM_POOL = [
  { q: "'A piece of cake' means something that is:", options: ["Delicious", "Very easy", "Expensive", "Round"], answer: 1 },
  { q: "'Break the ice' means to:", options: ["Start a conversation", "Feel cold", "Break something", "Go skating"], answer: 0 },
  { q: "'Under the weather' means feeling:", options: ["Happy", "Unwell", "Wet", "Angry"], answer: 1 },
  { q: "'Once in a blue moon' means:", options: ["Very often", "At night", "Very rarely", "Never"], answer: 2 },
  { q: "'Hit the books' means to:", options: ["Study hard", "Throw books", "Read slowly", "Buy books"], answer: 0 },
  { q: "'Let the cat out of the bag' means to:", options: ["Free a cat", "Reveal a secret", "Make noise", "Tell a lie"], answer: 1 },
  { q: "'Cost an arm and a leg' means something is:", options: ["Dangerous", "Very cheap", "Very expensive", "Heavy"], answer: 2 },
  { q: "'Bite the bullet' means to:", options: ["Eat quickly", "Face something hard bravely", "Get hurt", "Give up"], answer: 1 },
  { q: "'The ball is in your court' means it's your turn to:", options: ["Play sport", "Decide or act", "Lose", "Rest"], answer: 1 },
  { q: "'Spill the beans' means to:", options: ["Make a mess", "Cook food", "Reveal information", "Waste money"], answer: 2 },
];

function synGen(bank) {
  const words = bank.flatMap(([a, b]) => [a, b]);
  return (g, r) => {
    const [w, s] = pick(r, bank);
    return { q: `Which word means the same as '${w}'?`, ...mcText(r, s, words.filter((x) => x !== w && x !== s)) };
  };
}
function antGen(bank) {
  const words = bank.flatMap(([a, b]) => [a, b]);
  return (g, r) => {
    const [w, a] = pick(r, bank);
    return { q: `Which word is the opposite of '${w}'?`, ...mcText(r, a, words.filter((x) => x !== w && x !== a)) };
  };
}
function spellGen(bank) {
  return (g, r) => {
    const [correct, wrongs] = pick(r, bank);
    const opts = shuffle([correct, ...wrongs], r);
    return { q: "Which spelling is correct?", options: opts, answer: opts.indexOf(correct) };
  };
}
function posGen(bank) {
  const posList = ["noun", "verb", "adjective", "adverb"];
  const article = (p) => (p === "adjective" || p === "adverb" ? "an" : "a");
  return (g, r) => {
    const target = pick(r, posList);
    const correct = pick(r, bank[target]);
    const others = posList.filter((p) => p !== target).flatMap((p) => bank[p]);
    return { q: `Which of these is ${article(target)} ${target}?`, ...mcText(r, correct, others) };
  };
}
const staticGen = (pool) => (g, r, i) => pool[i % pool.length];

const ENGLISH_GEN = {
  synEasy: synGen(SYN_EASY), synHard: synGen(SYN_HARD),
  antEasy: antGen(ANT_EASY), antHard: antGen(ANT_HARD),
  spellEasy: spellGen(SPELL_EASY), spellHard: spellGen(SPELL_HARD),
  posEasy: posGen(POS_EASY), posHard: posGen(POS_HARD),
  rhyme: staticGen(RHYME_POOL), idiom: staticGen(IDIOM_POOL),
};

/* ------------------------------------------------------------------ */
/* Science themed pools (curated)                                     */
/* ------------------------------------------------------------------ */
const SCIENCE = {
  nature: [
    { q: "Plants make their food using sunlight in a process called:", options: ["Digestion", "Photosynthesis", "Respiration", "Evaporation"], answer: 1 },
    { q: "Which part of a plant takes in water from the soil?", options: ["Leaf", "Flower", "Roots", "Petal"], answer: 2 },
    { q: "A baby frog is called a:", options: ["Puppy", "Tadpole", "Chick", "Calf"], answer: 1 },
    { q: "Which animal gives us milk?", options: ["Hen", "Cow", "Fish", "Snake"], answer: 1 },
    { q: "Birds are covered with:", options: ["Scales", "Fur", "Feathers", "Shells"], answer: 2 },
    { q: "Which of these is a herbivore (eats only plants)?", options: ["Lion", "Tiger", "Cow", "Wolf"], answer: 2 },
    { q: "Bees collect ___ from flowers.", options: ["Water", "Nectar", "Soil", "Leaves"], answer: 1 },
    { q: "A group of trees growing together is a:", options: ["Desert", "Forest", "River", "Hill"], answer: 1 },
    { q: "Which animal can fly?", options: ["Elephant", "Sparrow", "Crocodile", "Dog"], answer: 1 },
    { q: "The green colour in leaves is caused by:", options: ["Water", "Chlorophyll", "Sunlight", "Soil"], answer: 1 },
  ],
  body: [
    { q: "Which organ pumps blood around the body?", options: ["Lungs", "Heart", "Brain", "Liver"], answer: 1 },
    { q: "We use our ___ to breathe.", options: ["Lungs", "Kidneys", "Stomach", "Bones"], answer: 0 },
    { q: "How many senses do humans have?", options: ["3", "4", "5", "6"], answer: 2 },
    { q: "Which part of the body helps us think?", options: ["Heart", "Brain", "Stomach", "Hand"], answer: 1 },
    { q: "Teeth are used to:", options: ["See", "Chew food", "Hear", "Smell"], answer: 1 },
    { q: "The framework of bones in our body is the:", options: ["Muscle", "Skeleton", "Skin", "Nerve"], answer: 1 },
    { q: "Which food group gives us energy quickly?", options: ["Carbohydrates", "Vitamins", "Water", "Fibre"], answer: 0 },
    { q: "We see with our:", options: ["Ears", "Eyes", "Nose", "Tongue"], answer: 1 },
    { q: "The basic building block of the body is the:", options: ["Atom", "Cell", "Bone", "Organ"], answer: 1 },
    { q: "Which vitamin do we get from sunlight?", options: ["Vitamin A", "Vitamin C", "Vitamin D", "Vitamin K"], answer: 2 },
  ],
  earth_space: [
    { q: "Which planet do we live on?", options: ["Mars", "Earth", "Venus", "Jupiter"], answer: 1 },
    { q: "What is Earth's natural satellite?", options: ["The Sun", "The Moon", "Mars", "A star"], answer: 1 },
    { q: "The Sun is a:", options: ["Planet", "Star", "Moon", "Comet"], answer: 1 },
    { q: "Day and night are caused by Earth's:", options: ["Rotation", "Size", "Colour", "Clouds"], answer: 0 },
    { q: "Which planet is closest to the Sun?", options: ["Venus", "Mercury", "Earth", "Mars"], answer: 1 },
    { q: "Water that falls from clouds is called:", options: ["Evaporation", "Precipitation", "Condensation", "Erosion"], answer: 1 },
    { q: "How many planets are in our solar system?", options: ["7", "8", "9", "10"], answer: 1 },
    { q: "Which is the largest planet?", options: ["Earth", "Saturn", "Jupiter", "Mars"], answer: 2 },
    { q: "Most of Earth's surface is covered by:", options: ["Land", "Water", "Ice", "Forest"], answer: 1 },
    { q: "Mars is often called the ___ planet.", options: ["Blue", "Red", "Green", "White"], answer: 1 },
  ],
  materials: [
    { q: "Ice, water and steam are the three ___ of water.", options: ["Colours", "States", "Shapes", "Sizes"], answer: 1 },
    { q: "Which of these is a solid?", options: ["Air", "Milk", "Rock", "Steam"], answer: 2 },
    { q: "When water is heated it turns into:", options: ["Ice", "Steam", "Snow", "Oil"], answer: 1 },
    { q: "Which material is transparent (you can see through it)?", options: ["Wood", "Glass", "Metal", "Stone"], answer: 1 },
    { q: "A material that lets electricity pass through is a:", options: ["Insulator", "Conductor", "Liquid", "Gas"], answer: 1 },
    { q: "Which of these is a natural material?", options: ["Plastic", "Cotton", "Nylon", "Glass"], answer: 1 },
    { q: "Melting changes a solid into a:", options: ["Gas", "Liquid", "Powder", "Crystal"], answer: 1 },
    { q: "A mixture of sand and water can be separated by:", options: ["Boiling", "Filtering", "Freezing", "Burning"], answer: 1 },
    { q: "Which material is magnetic?", options: ["Plastic", "Iron", "Wood", "Rubber"], answer: 1 },
    { q: "Gas has:", options: ["A fixed shape", "No fixed shape", "A fixed colour", "A hard surface"], answer: 1 },
  ],
  forces: [
    { q: "The force that pulls objects toward Earth is:", options: ["Friction", "Gravity", "Magnetism", "Push"], answer: 1 },
    { q: "A force that slows down a moving object is:", options: ["Gravity", "Friction", "Lift", "Thrust"], answer: 1 },
    { q: "A push or a pull is called a:", options: ["Force", "Mass", "Speed", "Weight"], answer: 0 },
    { q: "Which simple machine is a seesaw an example of?", options: ["Pulley", "Lever", "Screw", "Wedge"], answer: 1 },
    { q: "A moving object has ___ energy.", options: ["Kinetic", "Chemical", "Sound", "Light"], answer: 0 },
    { q: "Magnets attract objects made of:", options: ["Wood", "Iron", "Plastic", "Glass"], answer: 1 },
    { q: "The speed of an object is how fast it changes its:", options: ["Colour", "Position", "Mass", "Shape"], answer: 1 },
    { q: "Which force helps a parachute fall slowly?", options: ["Gravity", "Air resistance", "Magnetism", "Tension"], answer: 1 },
    { q: "Two like poles of a magnet will:", options: ["Attract", "Repel", "Melt", "Stick"], answer: 1 },
    { q: "A ramp used to lift loads is an example of a:", options: ["Lever", "Inclined plane", "Pulley", "Gear"], answer: 1 },
  ],
  energy: [
    { q: "The main source of light and heat for Earth is the:", options: ["Moon", "Sun", "Stars", "Fire"], answer: 1 },
    { q: "Light travels in:", options: ["Curves", "Straight lines", "Circles", "Zigzags"], answer: 1 },
    { q: "We hear sounds because they travel as:", options: ["Light", "Waves", "Heat", "Colours"], answer: 1 },
    { q: "A shadow forms when light is:", options: ["Reflected", "Blocked", "Bent", "Absorbed"], answer: 1 },
    { q: "Heat flows from a ___ object to a cooler one.", options: ["Hotter", "Lighter", "Bigger", "Harder"], answer: 0 },
    { q: "Which surface reflects light the best?", options: ["Black cloth", "A mirror", "Wood", "Paper"], answer: 1 },
    { q: "Sound cannot travel through a:", options: ["Solid", "Liquid", "Gas", "Vacuum"], answer: 3 },
    { q: "Energy stored in food is ___ energy.", options: ["Light", "Chemical", "Sound", "Electrical"], answer: 1 },
    { q: "A rainbow is caused by light being:", options: ["Blocked", "Split into colours", "Absorbed", "Slowed"], answer: 1 },
    { q: "Solar panels change sunlight into ___ energy.", options: ["Sound", "Electrical", "Chemical", "Nuclear"], answer: 1 },
  ],
  electricity: [
    { q: "The unit of electric current is the:", options: ["Volt", "Ampere", "Watt", "Ohm"], answer: 1 },
    { q: "A complete path for electricity to flow is a:", options: ["Switch", "Circuit", "Battery", "Wire"], answer: 1 },
    { q: "Which material is a good conductor of electricity?", options: ["Rubber", "Copper", "Plastic", "Wood"], answer: 1 },
    { q: "A device that stores electrical energy is a:", options: ["Bulb", "Battery", "Switch", "Fuse"], answer: 1 },
    { q: "Opening a switch will ___ the circuit.", options: ["Complete", "Break", "Charge", "Heat"], answer: 1 },
    { q: "Like electric charges:", options: ["Attract", "Repel", "Vanish", "Combine"], answer: 1 },
    { q: "A material that does NOT let electricity pass is an:", options: ["Conductor", "Insulator", "Element", "Alloy"], answer: 1 },
    { q: "The unit of electrical resistance is the:", options: ["Volt", "Ohm", "Ampere", "Joule"], answer: 1 },
    { q: "An electromagnet is made by passing current through a:", options: ["Coil of wire", "Glass rod", "Wooden stick", "Plastic sheet"], answer: 0 },
    { q: "Voltage is measured in:", options: ["Amperes", "Volts", "Watts", "Ohms"], answer: 1 },
  ],
  chemistry: [
    { q: "The smallest particle of an element is an:", options: ["Atom", "Cell", "Molecule", "Mixture"], answer: 0 },
    { q: "Water is made of hydrogen and:", options: ["Nitrogen", "Oxygen", "Carbon", "Helium"], answer: 1 },
    { q: "Lemon juice is an example of an:", options: ["Acid", "Base", "Salt", "Metal"], answer: 0 },
    { q: "Which gas do we need to breathe to live?", options: ["Carbon dioxide", "Oxygen", "Nitrogen", "Hydrogen"], answer: 1 },
    { q: "A substance made of two or more elements chemically joined is a:", options: ["Mixture", "Compound", "Atom", "Solution"], answer: 1 },
    { q: "The chemical symbol for gold is:", options: ["Go", "Gd", "Au", "Ag"], answer: 2 },
    { q: "Rusting of iron needs oxygen and:", options: ["Water", "Salt", "Sand", "Oil"], answer: 0 },
    { q: "Bases turn red litmus paper:", options: ["Blue", "Green", "Yellow", "Black"], answer: 0 },
    { q: "Common salt is sodium and:", options: ["Chlorine", "Carbon", "Oxygen", "Sulphur"], answer: 0 },
    { q: "The centre of an atom is called the:", options: ["Electron", "Nucleus", "Proton shell", "Orbit"], answer: 1 },
  ],
  biology: [
    { q: "The basic unit of life is the:", options: ["Atom", "Cell", "Tissue", "Organ"], answer: 1 },
    { q: "Which process releases energy from food in cells?", options: ["Photosynthesis", "Respiration", "Digestion", "Evaporation"], answer: 1 },
    { q: "Groups of similar cells form a:", options: ["Organ", "Tissue", "System", "Molecule"], answer: 1 },
    { q: "The part of a plant where photosynthesis mainly happens:", options: ["Root", "Stem", "Leaf", "Flower"], answer: 2 },
    { q: "Humans reproduce by:", options: ["Budding", "Sexual reproduction", "Binary fission", "Spores"], answer: 1 },
    { q: "Which blood cells fight infection?", options: ["Red cells", "White cells", "Platelets", "Plasma"], answer: 1 },
    { q: "Genes are made of a molecule called:", options: ["DNA", "ATP", "RNA only", "Protein"], answer: 0 },
    { q: "Breathing supplies the body with:", options: ["Carbon dioxide", "Oxygen", "Nitrogen", "Water"], answer: 1 },
    { q: "The green pigment that traps light energy is:", options: ["Haemoglobin", "Chlorophyll", "Melanin", "Keratin"], answer: 1 },
    { q: "Which organ system includes the heart and blood vessels?", options: ["Digestive", "Circulatory", "Nervous", "Skeletal"], answer: 1 },
  ],
};

/* ------------------------------------------------------------------ */
/* Per-grade topic sets                                               */
/* Each entry: [key, label, kind]  (kind -> generator / science theme) */
/* ------------------------------------------------------------------ */
const MATHS_TOPICS = {
  1: [["add", "Counting & Addition", "add"], ["sub", "Taking Away", "sub"], ["shapes", "Shapes", "geo"]],
  2: [["add", "Addition", "add"], ["sub", "Subtraction", "sub"], ["tables", "Times Tables", "mult"]],
  3: [["mult", "Multiplication", "mult"], ["div", "Division", "div"], ["frac", "Fractions", "fractions"]],
  4: [["lmult", "Long Multiplication", "mult"], ["div", "Division", "div"], ["sq", "Square Numbers", "squares"]],
  5: [["frac", "Fractions", "fractions"], ["dec", "Decimals", "decimals"], ["pct", "Percentages", "percent"]],
  6: [["int", "Integers", "integers"], ["dec", "Decimals", "decimals"], ["pct", "Ratios & Percentages", "percent"]],
  7: [["int", "Integers", "integers"], ["eqn", "Simple Equations", "algebra"], ["frac", "Fractions", "fractions"]],
  8: [["alg", "Algebraic Expressions", "algebra"], ["sq", "Squares & Cubes", "squares"], ["pct", "Percentages", "percent"]],
  9: [["poly", "Polynomials", "algebra"], ["seq", "Number Patterns", "sequence"], ["stat", "Mean & Average", "mean"]],
  10: [["linq", "Linear & Quadratic", "algebra"], ["stat", "Statistics", "mean"], ["ap", "Arithmetic Sequences", "sequence"]],
  11: [["seq", "Sequences & Series", "sequence"], ["stat", "Statistics", "mean"], ["alg", "Algebra", "algebra"]],
  12: [["prob", "Probability & Stats", "mean"], ["seq", "Progressions", "sequence"], ["alg", "Advanced Algebra", "algebra"]],
};
const ENGLISH_TOPICS = {
  1: [["rhyme", "Rhyming Words", "rhyme"], ["opp", "Opposites", "antEasy"], ["name", "Naming Words", "posEasy"]],
  2: [["opp", "Opposites", "antEasy"], ["same", "Same Meaning", "synEasy"], ["spell", "Spelling", "spellEasy"]],
  3: [["syn", "Synonyms", "synEasy"], ["ant", "Antonyms", "antEasy"], ["spell", "Spelling", "spellEasy"]],
  4: [["syn", "Synonyms", "synEasy"], ["spell", "Spelling", "spellEasy"], ["pos", "Parts of Speech", "posEasy"]],
  5: [["ant", "Antonyms", "antEasy"], ["spell", "Spelling", "spellEasy"], ["pos", "Parts of Speech", "posEasy"]],
  6: [["vocab", "Vocabulary", "synHard"], ["gram", "Grammar", "posHard"], ["spell", "Spelling", "spellHard"]],
  7: [["syn", "Synonyms", "synHard"], ["ant", "Antonyms", "antHard"], ["spell", "Spelling", "spellHard"]],
  8: [["vocab", "Vocabulary", "synHard"], ["gram", "Parts of Speech", "posHard"], ["idiom", "Idioms", "idiom"]],
  9: [["vocab", "Vocabulary", "synHard"], ["ant", "Antonyms", "antHard"], ["idiom", "Idioms", "idiom"]],
  10: [["syn", "Synonyms", "synHard"], ["gram", "Grammar", "posHard"], ["idiom", "Idioms", "idiom"]],
  11: [["vocab", "Advanced Vocabulary", "synHard"], ["ant", "Antonyms", "antHard"], ["spell", "Spelling", "spellHard"]],
  12: [["vocab", "Advanced Vocabulary", "synHard"], ["idiom", "Idioms", "idiom"], ["ant", "Antonyms", "antHard"]],
};
const SCIENCE_TOPICS = {
  1: [["nat", "Plants & Animals", "nature"], ["body", "My Body", "body"], ["sky", "Earth & Sky", "earth_space"]],
  2: [["nat", "Living Things", "nature"], ["mat", "Things Around Us", "materials"], ["sky", "Sky & Weather", "earth_space"]],
  3: [["nat", "Plants & Animals", "nature"], ["body", "Our Body", "body"], ["mat", "Materials", "materials"]],
  4: [["body", "Food & Health", "body"], ["mat", "States of Matter", "materials"], ["force", "Push & Pull", "forces"]],
  5: [["force", "Forces & Motion", "forces"], ["energy", "Light & Sound", "energy"], ["sky", "Earth & Space", "earth_space"]],
  6: [["body", "Food & Nutrition", "body"], ["mat", "Materials & Matter", "materials"], ["force", "Motion & Forces", "forces"]],
  7: [["energy", "Heat & Light", "energy"], ["chem", "Acids & Bases", "chemistry"], ["body", "Our Body", "body"]],
  8: [["force", "Force & Pressure", "forces"], ["energy", "Light", "energy"], ["bio", "Cells & Microbes", "biology"]],
  9: [["mat", "Matter", "materials"], ["force", "Motion & Force", "forces"], ["bio", "Cells & Tissues", "biology"]],
  10: [["chem", "Chemical Reactions", "chemistry"], ["energy", "Light & Electricity", "energy"], ["bio", "Life Processes", "biology"]],
  11: [["phys", "Physics: Mechanics", "forces"], ["chem", "Chemistry: Atoms", "chemistry"], ["bio", "Biology: The Cell", "biology"]],
  12: [["phys", "Physics: Electricity", "electricity"], ["chem", "Chemistry", "chemistry"], ["bio", "Biology", "biology"]],
};

const SUBJECTS = [
  { key: "maths", label: "Maths", topics: MATHS_TOPICS, resolve: (kind) => MATHS_GEN[kind] },
  { key: "english", label: "English", topics: ENGLISH_TOPICS, resolve: (kind) => ENGLISH_GEN[kind] },
  { key: "science", label: "Science", topics: SCIENCE_TOPICS, resolve: (theme) => staticGen(SCIENCE[theme]) },
];

function clampGrade(grade) {
  const g = Number(grade) || 5;
  return Math.min(12, Math.max(1, g));
}

// Build up to `count` unique items for a topic (deterministic per grade/topic).
function buildItems(grade, subjectKey, topicKey, gen, count) {
  const rand = makeRand(`${grade}:${subjectKey}:${topicKey}`);
  const items = [];
  const seen = new Set();
  let guard = 0;
  while (items.length < count && guard++ < count * 25) {
    const it = gen(grade, rand, items.length);
    if (it && !seen.has(it.q)) {
      seen.add(it.q);
      items.push(it);
    }
  }
  return items;
}

function subjectData(grade, subject, count) {
  const g = clampGrade(grade);
  const defs = subject.topics[g] || subject.topics[5];
  const topics = {};
  defs.forEach(([key, label, kind]) => {
    topics[key] = { label, items: buildItems(g, subject.key, key, subject.resolve(kind), count) };
  });
  return { label: subject.label, topics };
}

// Quiz: 10 questions per topic.
export function getQuizData(grade) {
  const out = {};
  SUBJECTS.forEach((s) => {
    const data = subjectData(grade, s, 10);
    out[s.key] = {
      label: data.label,
      topics: Object.fromEntries(
        Object.entries(data.topics).map(([k, t]) => [k, { label: t.label, questions: t.items }])
      ),
    };
  });
  return out;
}

// Flashcards: 3 cards per topic (front = question, back = correct answer).
export function getFlashcardData(grade) {
  const out = {};
  SUBJECTS.forEach((s) => {
    const data = subjectData(grade, s, 3);
    out[s.key] = {
      label: data.label,
      topics: Object.fromEntries(
        Object.entries(data.topics).map(([k, t]) => [
          k,
          { label: t.label, cards: t.items.slice(0, 3).map((it) => ({ front: it.q, back: it.options[it.answer] })) },
        ])
      ),
    };
  });
  return out;
}
