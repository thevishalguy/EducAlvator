/* EducAlvator: textbook chapters for each grade, taken from the study PDFs in
   /resources (class 5 and class 10 titles were read from each PDF's first page). Where a grade
   has chapters, they are the game's only topics; questions for them come from the
   AI service, with the grade's built-in questions as the hidden fallback.

   Generated from src/lib/*-resources.json. */
window.EduChapters = (function () {
  var DATA = { "3": { "maths": [ "What's in a Name?", "Toy Joy", "Double Century", "Vacation with My Nani Maa", "Fun with Shapes", "House of Hundreds – I", "Raksha Bandhan", "Fair Shares", "How Many Times?", "Fun at Class Party!", "Filling and Lifting", "Give and Take", "Time Goes On", "The Surajkund Fair" ], "english": [ "Fun with Friends", "Badal and Moti", "Best Friends", "Toys and Games", "Talking Toys", "Paper Boats", "Good Food", "Thank God!", "Madhu's Wish", "The Sky", "Chanda Mama Counts the Stars", "Chandrayaan" ], "science": [ "Our Families and Communities", "Going to the Mela", "Celebrating Festivals", "Living Together", "Plants and Animals Live Together", "Living in Harmony", "Gifts of Nature", "Food We Eat", "Staying Healthy and Happy", "Things Around Us", "Making Things", "Taking Charge of Waste" ] }, "4": { "maths": [ "Shapes Around Us", "Hide and Seek", "Patterns Around Us", "Thousands Around Us", "Sharing and Measuring", "Measuring Length", "My School Trip", "Weigh It, Pour It", "Equal Groups", "Numbers up to 10,000", "Fun with Symmetry", "Ticking Clocks and Turning Calendar", "The Transport Museum", "Data Handling" ], "english": [ "Together We Can", "The Tinkling Bells", "Be Smart, Be Safe", "One Thing at a Time", "The Old Stag", "Braille", "Fit Body, Fit Mind, Fit Nation", "The Lagori Champions", "Hekko", "The Swing", "The Mountain Stories", "Maheshwar" ] }, "5": { "maths": [ "We the Travellers – I", "Fractions", "Angles as Turns", "We the Travellers – II", "Far and Near", "The Dairy Farm", "Shapes and Patterns", "Weight and Capacity", "Coconut Farm", "Symmetrical Designs", "Grandmother's Quilt", "Racing Seconds", "Animal Jumps", "Maps and Locations", "Data Through Pictures" ], "science": [ "Water – The Essence of Life", "Journey of a River", "The Mystery of Food", "Our School – A Happy Place", "Our Vibrant Country", "Some Unique Places", "Energy – How Things Work", "Clothes – How Things are Made", "Rhythms of Nature", "Earth – Our Shared Home" ] }, "6": { "maths": [ "Patterns in Mathematics", "Lines and Angles", "Number Play", "Data Handling and Presentation", "Prime Time" ], "english": [ "Fables and Folk Tales", "Friendship", "Nurturing Nature", "Sports and Wellness", "Culture and Tradition" ], "science": [ "The Wonderful World of Science", "Diversity in the Living World", "Mindful Eating: A Path to a Healthy Body", "Exploring Magnets", "Measurement of Length and Motion", "Materials Around Us", "Temperature and its Measurement", "A Journey through States of Water", "Methods of Separation in Everyday Life", "Living Creatures: Exploring their Characteristics", "Nature's Treasure", "Beyond Earth" ] }, "7": { "maths": [ "Large Numbers Around Us", "Arithmetic Expressions", "A Peek Beyond the Point", "Expressions using Letter-Numbers", "Parallel and Intersecting Lines", "Number Play", "A Tale of Three Intersecting Lines", "Working with Fractions" ], "english": [ "Learning Together", "Wit and Humour", "Dreams and Discoveries" ], "science": [ "The Ever-Evolving World of Science", "Exploring Substances: Acidic, Basic and Neutral", "Electricity: Circuits and their Components", "Heat Transfer in Nature", "Light, Shadows and Reflections", "Earth, Moon and the Sun", "Adolescence: A Stage of Growth and Change", "Life Processes in Animals", "Life Processes in Plants", "Measurement of Time and Motion" ] }, "8": { "maths": [ "A Square and a Cube", "Power Play", "A Story of Numbers", "Quadrilaterals", "Number Play", "We Distribute, Yet Things Multiply", "Proportional Reasoning" ], "english": [ "Wit and Wisdom", "Values and Dispositions", "Mystery and Magic", "Environment", "Science and Curiosity" ], "science": [ "Exploring the Investigative World of Science", "The Invisible Living World: Beyond Our Naked Eye", "Health: The Ultimate Treasure", "Particulate Nature of Matter", "Electricity: Magnetic and Heating Effects", "Exploring Forces", "Pressure, Winds, Storms and Cyclones" ] }, "9": { "maths": [ "Number System", "Introduction to Polynomials", "Sequences and Progressions", "Exploring Algebraic Identities", "Circles", "Mensuration: Surface Areas and Volumes", "Introduction to Probability" ], "english": [ "How I Taught My Grandmother to Read", "Bharat Our Land", "The Pot Maker", "Gifts of Grace: Honouring Our Vocations", "Winds of Change", "Canvas of Soil", "The World of Limitless Possibilities", "I Cannot Remember My Mother", "Nine Gold Medals", "Twin Melodies", "A Friend Found in Music", "Carrier of Words", "Words", "Follow That Dream", "Believe in Yourself" ], "science": [ "Exploration: Entering the World of Secondary Science", "The Fundamental Unit of Life", "Tissues", "Motion", "Is Matter Around Us Pure?", "Force and Laws of Motion", "Work and Energy", "Atoms and Molecules", "Atomic Foundations of Matter", "Sound", "Reproduction: How Life Continues", "Patterns in Life: Diversity and Classification", "Earth as a System" ] }, "10": { "maths": [ "Real Numbers", "Polynomials", "Pair of Linear Equations in Two Variables", "Quadratic Equations", "Arithmetic Progressions", "Triangles", "Coordinate Geometry", "Introduction to Trigonometry", "Some Applications of Trigonometry", "Circles", "Areas Related to Circles", "Surface Areas and Volumes", "Statistics", "Probability" ], "science": [ "Chemical Reactions and Equations", "Acids, Bases and Salts", "Metals and Non-metals", "Carbon and its Compounds", "Life Processes", "Control and Coordination", "How do Organisms Reproduce?", "Heredity", "Light – Reflection and Refraction", "The Human Eye and the Colourful World", "Electricity", "Magnetic Effects of Electric Current", "Our Environment" ], "english": [ "A Letter to God", "Nelson Mandela: Long Walk to Freedom", "Two Stories about Flying", "From the Diary of Anne Frank", "Glimpses of India", "Mijbil the Otter", "Madam Rides the Bus", "The Sermon at Benares", "The Proposal", "Dust of Snow (poem)", "A Tiger in the Zoo (poem)", "How to Tell Wild Animals (poem)", "Amanda! (poem)", "The Trees (poem)", "Fog (poem)", "The Tale of Custard the Dragon (poem)", "For Anne Gregory (poem)", "A Triumph of Surgery", "The Thief's Story", "The Midnight Visitor", "A Question of Trust", "Footprints without Feet", "The Making of a Scientist", "The Necklace", "Bholi", "The Book that Saved the Earth" ] } };

  /* English for these grades practises the grammar in each chapter's "Let us
     Learn" section rather than the story, one topic per chapter (grade 5: read
     from the Santoor chapter PDFs in /resources/class5/english). */
  var GRAMMAR = { "5": [ "Prepositions and Opposites", "Adverbs of Frequency and Time", "Rhyming Words; Nouns and Verbs", "Collective Nouns and Present Perfect Tense", "Joining Words and Word Order", "Contractions and Exclamatory Sentences", "Prefixes, Abstract Nouns and Possessive Pronouns", "Prepositions and the Suffix -less", "Spotting Errors and Question Words", "Punctuation and Past Perfect Tense" ] };

  var byKey = {};
  var aiByKey = {};

  /* Adds this grade's chapters for one subject. add(key, title) puts a topic into the
     game's curriculum; returns the keys added. */
  function addTo(grade, subject, add) {
    var grammar = subject === "english" && GRAMMAR[String(grade)];
    var list = grammar || (DATA[String(grade)] || {})[subject] || [];
    return list.map(function (title, i) {
      var key = "ch_" + (i + 1);
      byKey[key] = title;
      aiByKey[key] = (grammar ? "English grammar: " : "Textbook chapter: ") + title;
      add(key, title);
      return key;
    });
  }

  function isChapter(key) { return Object.prototype.hasOwnProperty.call(byKey, key); }

  // What the AI is asked for: the chapter (or grammar topic), so questions stay on it.
  function aiLabel(key) { return aiByKey[key] ? aiByKey[key].slice(0, 80) : null; }

  // Lists the chapters under "From your textbook". Mixed "All topics" options are
  // dropped (a round is one chapter), and the first chapter is picked by default.
  function groupOptions(select) {
    var opts = Array.prototype.filter.call(select.options, function (o) { return isChapter(o.value); });
    if (!opts.length) return;
    // Moving options changes which one the browser selects, so remember it first.
    var chosen = isChapter(select.value) ? select.value : opts[0].value;
    Array.prototype.slice.call(select.options).forEach(function (o) { if (!isChapter(o.value)) o.remove(); });
    var group = document.createElement("optgroup");
    group.label = "From your textbook";
    opts.forEach(function (o) { group.appendChild(o); });
    select.appendChild(group);
    select.value = chosen;
  }

  return { addTo: addTo, isChapter: isChapter, aiLabel: aiLabel, groupOptions: groupOptions };
})();
