// The little pictures of the club pages in the narrow left rail (mockup .nsub): a flag for each language
// club, an emoji for the others. Key = the club's pageLink (constant/Clubs.js).
const UK_FLAG =
  "linear-gradient(to right, transparent 42%, #C8102E 42% 58%, transparent 58%), linear-gradient(to bottom, transparent 38%, #C8102E 38% 62%, transparent 62%), linear-gradient(to right, transparent 34%, #FFFFFF 34% 66%, transparent 66%), linear-gradient(to bottom, transparent 28%, #FFFFFF 28% 72%, transparent 72%), #012169";

export const CLUB_ART = {
  // Language Club: flags
  "spanish-club": { flag: "linear-gradient(#C60B1E 0 25%, #FFC400 25% 75%, #C60B1E 75%)" },
  "french-club": { flag: "linear-gradient(to right, #0055A4 0 33.3%, #FFFFFF 33.3% 66.6%, #EF4135 66.6%)" },
  "german-club": { flag: "linear-gradient(#1C1C1C 0 33.3%, #DD0000 33.3% 66.6%, #FFCE00 66.6%)" },
  "english-club": { flag: UK_FLAG },
  "chinese-club": { flag: "#DE2910", mark: "★" },
  // Social Club
  "team-building-club": { emoji: "🧩" },
  "cultural-exchange-club": { emoji: "🌍" },
  "leadership-skills-club": { emoji: "🌟" },
  "debate-club": { emoji: "💬" },
  "drama-expression-club": { emoji: "🎭" },
  "public-speaking-club": { emoji: "🎤" },
  "student-council-club": { emoji: "🏛️" },
  "the-debate-club": { emoji: "💬" },
  "the-book-club": { emoji: "📚" },
  "the-art-club": { emoji: "🎨" },
  "the-stem-club": { emoji: "🔬" },
  "the-gaming-club": { emoji: "🎮" },
  "the-law-club": { emoji: "⚖️" },
  "the-global-exchange-club": { emoji: "🌐" },
  "the-wellness-club": { emoji: "🧘" },
  "the-newsletter-club": { emoji: "📰" },
  "the-entrepreneurship-club": { emoji: "💼" },
  // E-Sports Club
  "competitive-gaming": { emoji: "🎮" },
  "strategy-games-club": { emoji: "🕹️" },
  "online-tournaments-club": { emoji: "🏆" },
  "team-communication-club": { emoji: "🎧" },
  "skill-development-club": { emoji: "⚡" },
  "focus-reaction-training-club": { emoji: "🎯" },
  "game-strategy-analysis-club": { emoji: "🧠" },
  "global-competitions-club": { emoji: "🌐" },
};
