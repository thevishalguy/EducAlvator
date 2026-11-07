// Hardcoded flashcard bank for the same-page flashcard feature.
// Shape: { [subjectKey]: { label, topics: { [topicKey]: { label, cards: [{ front, back }] } } } }
// Every topic has exactly 3 cards.

export const FLASHCARD_DATA = {
  maths: {
    label: "Maths",
    topics: {
      fractions: {
        label: "Fractions",
        cards: [
          { front: "What is a fraction?", back: "A number that shows part of a whole, written as a/b — the numerator over the denominator." },
          { front: "Simplify 4/8", back: "1/2 — divide the top and bottom by their common factor, 4." },
          { front: "1/2 + 1/4 = ?", back: "3/4 — rewrite 1/2 as 2/4, then add the numerators: 2/4 + 1/4." },
        ],
      },
      arithmetic: {
        label: "Arithmetic",
        cards: [
          { front: "What is a prime number?", back: "A whole number greater than 1 with exactly two factors — 1 and itself (e.g., 2, 3, 5, 7)." },
          { front: "What does BODMAS stand for?", back: "Brackets, Orders (powers), Division & Multiplication, Addition & Subtraction — the order of operations." },
          { front: "What is 7 × 8?", back: "56." },
        ],
      },
      geometry: {
        label: "Geometry",
        cards: [
          { front: "What do the angles in a triangle add up to?", back: "Always 180°." },
          { front: "What is the circumference of a circle?", back: "The distance all the way around the circle." },
          { front: "What is a right angle?", back: "An angle of exactly 90°." },
        ],
      },
    },
  },
  english: {
    label: "English",
    topics: {
      grammar: {
        label: "Grammar",
        cards: [
          { front: "What is a noun?", back: "A word for a person, place, thing, or idea — e.g., teacher, city, happiness." },
          { front: "What is a verb?", back: "A word that shows an action or a state of being — e.g., run, jump, is." },
          { front: "What is the past tense of 'go'?", back: "Went." },
        ],
      },
      vocabulary: {
        label: "Vocabulary",
        cards: [
          { front: "What is a synonym?", back: "A word with the same or a similar meaning — e.g., happy and joyful." },
          { front: "What is an antonym?", back: "A word with the opposite meaning — e.g., hot and cold." },
          { front: "What does 'enormous' mean?", back: "Extremely large; huge." },
        ],
      },
    },
  },
  science: {
    label: "Science",
    topics: {
      life: {
        label: "Life Science",
        cards: [
          { front: "What is photosynthesis?", back: "The process plants use to make food from sunlight, water, and carbon dioxide." },
          { front: "What is a cell?", back: "The basic building block of all living things." },
          { front: "What does the heart do?", back: "It pumps blood all around the body." },
        ],
      },
      physics: {
        label: "Physics",
        cards: [
          { front: "What is gravity?", back: "The force that pulls objects toward each other — and pulls things down to Earth." },
          { front: "What is friction?", back: "A force that slows down objects as they move against each other." },
          { front: "What is the unit of electric current?", back: "The ampere (A)." },
        ],
      },
      space: {
        label: "Earth & Space",
        cards: [
          { front: "How many planets are in our solar system?", back: "Eight — Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune." },
          { front: "What is Earth's natural satellite?", back: "The Moon." },
          { front: "What causes day and night?", back: "The Earth spinning (rotating) on its axis." },
        ],
      },
    },
  },
};

// Number of flashcards shown per topic.
export const FLASHCARD_COUNT = 3;
