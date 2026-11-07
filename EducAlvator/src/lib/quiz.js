// Hardcoded quiz bank for the same-page quiz feature.
// Shape: { [subjectKey]: { label, topics: { [topicKey]: { label, questions: [...] } } } }
// Each question: { q: string, options: string[], answer: index of correct option }
// Every topic has 10 questions.

export const QUIZ_DATA = {
  maths: {
    label: "Maths",
    topics: {
      fractions: {
        label: "Fractions",
        questions: [
          { q: "Which fraction is equal to one half?", options: ["2/4", "2/5", "1/3", "3/5"], answer: 0 },
          { q: "What is 1/4 + 1/4?", options: ["1/8", "1/2", "2/8", "1/16"], answer: 1 },
          { q: "Which fraction is the largest?", options: ["1/2", "1/3", "1/4", "1/5"], answer: 0 },
          { q: "3/6 simplified is:", options: ["1/2", "1/3", "2/3", "3/4"], answer: 0 },
          { q: "What is 1/2 of 10?", options: ["2", "5", "10", "20"], answer: 1 },
          { q: "Which fraction is equivalent to 2/3?", options: ["4/6", "2/6", "3/4", "1/3"], answer: 0 },
          { q: "What is 1/2 + 1/4?", options: ["2/6", "3/4", "1/6", "2/4"], answer: 1 },
          { q: "Which fraction is closest to 1?", options: ["1/2", "3/4", "1/4", "1/10"], answer: 1 },
          { q: "What does 5/5 equal?", options: ["0", "1/2", "1", "5"], answer: 2 },
          { q: "What is 3/4 as a percentage?", options: ["25%", "50%", "75%", "100%"], answer: 2 },
        ],
      },
      arithmetic: {
        label: "Arithmetic",
        questions: [
          { q: "What is 7 × 8?", options: ["54", "56", "64", "48"], answer: 1 },
          { q: "What is 144 ÷ 12?", options: ["11", "12", "13", "14"], answer: 1 },
          { q: "What is 15% of 200?", options: ["20", "25", "30", "35"], answer: 2 },
          { q: "Which number is a prime number?", options: ["21", "27", "29", "33"], answer: 2 },
          { q: "What is 9 × 6?", options: ["54", "56", "45", "63"], answer: 0 },
          { q: "What is 100 − 37?", options: ["53", "63", "67", "73"], answer: 1 },
          { q: "What is 2 cubed (2³)?", options: ["6", "8", "9", "4"], answer: 1 },
          { q: "What is 25 + 48?", options: ["63", "73", "72", "83"], answer: 1 },
          { q: "Which number is even?", options: ["17", "23", "38", "41"], answer: 2 },
          { q: "What is 1000 ÷ 100?", options: ["1", "10", "100", "1000"], answer: 1 },
        ],
      },
      geometry: {
        label: "Geometry",
        questions: [
          { q: "How many degrees are in a right angle?", options: ["45°", "90°", "180°", "360°"], answer: 1 },
          { q: "A triangle's interior angles add up to:", options: ["90°", "180°", "270°", "360°"], answer: 1 },
          { q: "How many sides does a hexagon have?", options: ["5", "6", "7", "8"], answer: 1 },
          { q: "The distance around a circle is its:", options: ["Area", "Radius", "Circumference", "Diameter"], answer: 2 },
          { q: "A shape with 4 equal sides and 4 right angles is a:", options: ["Rectangle", "Square", "Triangle", "Circle"], answer: 1 },
          { q: "How many degrees are in a full circle?", options: ["90°", "180°", "270°", "360°"], answer: 3 },
          { q: "A 3D shape with 6 square faces is a:", options: ["Sphere", "Cube", "Cone", "Cylinder"], answer: 1 },
          { q: "How many sides does a pentagon have?", options: ["4", "5", "6", "7"], answer: 1 },
          { q: "Lines that never meet are called:", options: ["Perpendicular", "Parallel", "Curved", "Diagonal"], answer: 1 },
          { q: "The longest side of a right-angled triangle is the:", options: ["Base", "Height", "Hypotenuse", "Vertex"], answer: 2 },
        ],
      },
    },
  },
  english: {
    label: "English",
    topics: {
      grammar: {
        label: "Grammar",
        questions: [
          { q: "Which word is a noun?", options: ["Quickly", "Happiness", "Run", "Blue"], answer: 1 },
          { q: "Choose the correct spelling:", options: ["Recieve", "Receive", "Receeve", "Receve"], answer: 1 },
          { q: "What is the past tense of 'go'?", options: ["Goed", "Gone", "Went", "Going"], answer: 2 },
          { q: "Which is a complete sentence?", options: ["Running fast.", "The dog barked.", "In the park.", "Very tall."], answer: 1 },
          { q: "Which word is a verb?", options: ["Table", "Jump", "Happy", "Slowly"], answer: 1 },
          { q: "The plural of 'child' is:", options: ["Childs", "Children", "Childes", "Child"], answer: 1 },
          { q: "Which word is an adjective?", options: ["Sing", "Bright", "Quickly", "Chair"], answer: 1 },
          { q: "Choose the correct article: '___ apple'.", options: ["A", "An", "The", "No article"], answer: 1 },
          { q: "Which pronoun fits: '___ are my friends.'", options: ["He", "She", "They", "It"], answer: 2 },
          { q: "Which punctuation mark ends a statement?", options: ["?", "!", ".", ","], answer: 2 },
        ],
      },
      vocabulary: {
        label: "Vocabulary",
        questions: [
          { q: "What is a synonym for 'happy'?", options: ["Sad", "Joyful", "Angry", "Tired"], answer: 1 },
          { q: "What is an antonym for 'begin'?", options: ["Start", "Open", "End", "Continue"], answer: 2 },
          { q: "A group of wolves is called a:", options: ["Herd", "Pack", "Flock", "School"], answer: 1 },
          { q: "'Enormous' means:", options: ["Tiny", "Huge", "Fast", "Quiet"], answer: 1 },
          { q: "What is a synonym for 'fast'?", options: ["Slow", "Rapid", "Heavy", "Dark"], answer: 1 },
          { q: "What is an antonym for 'ancient'?", options: ["Old", "Modern", "Historic", "Aged"], answer: 1 },
          { q: "A baby dog is called a:", options: ["Kitten", "Cub", "Puppy", "Calf"], answer: 2 },
          { q: "'Generous' means:", options: ["Mean", "Giving", "Shy", "Loud"], answer: 1 },
          { q: "What is a synonym for 'brave'?", options: ["Fearful", "Courageous", "Weak", "Calm"], answer: 1 },
          { q: "A group of fish is called a:", options: ["Pack", "Pride", "School", "Herd"], answer: 2 },
        ],
      },
    },
  },
  science: {
    label: "Science",
    topics: {
      life: {
        label: "Life Science",
        questions: [
          { q: "Plants make their food through:", options: ["Respiration", "Photosynthesis", "Digestion", "Evaporation"], answer: 1 },
          { q: "Which organ pumps blood around the body?", options: ["Lungs", "Brain", "Heart", "Liver"], answer: 2 },
          { q: "The basic unit of life is the:", options: ["Atom", "Cell", "Organ", "Tissue"], answer: 1 },
          { q: "Which gas do humans breathe in to survive?", options: ["Carbon dioxide", "Nitrogen", "Oxygen", "Hydrogen"], answer: 2 },
          { q: "Which part of a plant absorbs water?", options: ["Leaf", "Flower", "Roots", "Stem"], answer: 2 },
          { q: "How many lungs do humans have?", options: ["1", "2", "3", "4"], answer: 1 },
          { q: "How many legs does an insect have?", options: ["4", "6", "8", "10"], answer: 1 },
          { q: "Which animal is a mammal?", options: ["Shark", "Frog", "Whale", "Eagle"], answer: 2 },
          { q: "A caterpillar changing into a butterfly is called:", options: ["Migration", "Metamorphosis", "Hibernation", "Germination"], answer: 1 },
          { q: "What do bees collect from flowers?", options: ["Water", "Nectar", "Soil", "Seeds"], answer: 1 },
        ],
      },
      physics: {
        label: "Physics",
        questions: [
          { q: "What force pulls objects toward the Earth?", options: ["Friction", "Gravity", "Magnetism", "Tension"], answer: 1 },
          { q: "Light travels fastest through:", options: ["Water", "Glass", "Air", "A vacuum"], answer: 3 },
          { q: "The unit of electric current is the:", options: ["Volt", "Watt", "Ampere", "Ohm"], answer: 2 },
          { q: "Sound cannot travel through a:", options: ["Solid", "Liquid", "Gas", "Vacuum"], answer: 3 },
          { q: "Which material is magnetic?", options: ["Wood", "Iron", "Plastic", "Glass"], answer: 1 },
          { q: "Water boils at what temperature (°C at sea level)?", options: ["50°", "90°", "100°", "120°"], answer: 2 },
          { q: "Which state of matter has a fixed shape?", options: ["Solid", "Liquid", "Gas", "Plasma"], answer: 0 },
          { q: "Energy from the Sun is called:", options: ["Sound energy", "Solar energy", "Chemical energy", "Nuclear energy"], answer: 1 },
          { q: "A simple machine with a wheel and a rope is a:", options: ["Lever", "Pulley", "Ramp", "Screw"], answer: 1 },
          { q: "The force that slows a sliding object is:", options: ["Gravity", "Friction", "Magnetism", "Buoyancy"], answer: 1 },
        ],
      },
      space: {
        label: "Earth & Space",
        questions: [
          { q: "Which planet is closest to the Sun?", options: ["Venus", "Mercury", "Earth", "Mars"], answer: 1 },
          { q: "What is the Earth's natural satellite?", options: ["The Sun", "Mars", "The Moon", "Venus"], answer: 2 },
          { q: "How many planets are in our solar system?", options: ["7", "8", "9", "10"], answer: 1 },
          { q: "What causes day and night?", options: ["Earth's rotation", "The Moon", "Clouds", "The tides"], answer: 0 },
          { q: "Which is the largest planet?", options: ["Earth", "Jupiter", "Saturn", "Neptune"], answer: 1 },
          { q: "The star at the centre of our solar system is:", options: ["The Moon", "The Sun", "Mars", "Polaris"], answer: 1 },
          { q: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Mercury"], answer: 1 },
          { q: "Water that falls from clouds is called:", options: ["Evaporation", "Precipitation", "Condensation", "Collection"], answer: 1 },
          { q: "Which gas makes up most of Earth's atmosphere?", options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Helium"], answer: 2 },
          { q: "A scientist who studies space is an:", options: ["Astronomer", "Geologist", "Biologist", "Chemist"], answer: 0 },
        ],
      },
    },
  },
};

// Number of questions served per quiz.
export const QUIZ_LENGTH = 10;

// Points for a correct answer.
export const QUIZ_CORRECT = 10;

// Fair (guessing-corrected) negative marking: a wrong answer on a question with
// k options deducts correct/(k-1) points, so the expected score of random
// guessing is zero. Rounded to a whole number for clean scoring.
export function penaltyFor(optionCount) {
  return Math.round(QUIZ_CORRECT / Math.max(1, optionCount - 1));
}
