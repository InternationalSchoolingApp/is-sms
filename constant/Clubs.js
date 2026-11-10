/**
 * Club pages — legacy adminController.js contentHandlers (pageLink -> renderClubsCommonPage(title))
 * and clubsCommonContent.js getClubsCommonCard (title -> image under static/theme2/images/clubs/,
 * optional subtitle). `title` is also the clubName sent to save-club-request, which the backend
 * resolves by name — keep it exactly as legacy spells it.
 */
export const CLUBS = {
  // Language Club
  "spanish-club": { title: "Spanish Club", image: "spanish.webp" },
  "french-club": { title: "French Club", image: "French.webp" },
  "german-club": { title: "German Club", image: "german.webp" },
  "english-club": { title: "English Club", image: "English.webp" },
  "chinese-club": { title: "Chinese Club", image: "chinese.webp" },

  "team-building-club": { title: "Team Building Club", image: "Team_Building.webp" },
  "cultural-exchange-club": { title: "Cultural Exchange Club", image: "Cultural_Exchange.webp" },
  "leadership-skills-club": { title: "Leadership Skills Club", image: "Leadership_Skills.webp" },
  "debate-club": { title: "Debate Club", image: "Debate_Club.webp" },
  "drama-expression-club": { title: "Drama & Expression Club", image: "Drama_Expression.webp" },
  "public-speaking-club": { title: "Public Speaking Club", image: "Public_speaking.webp" },

  "focus-reaction-training-club": { title: "Focus & Reaction Training Club", image: "Focus_Reaction_Training.webp" },
  "skill-development-club": { title: "Skill Development Club", image: "Skill_Development.webp" },
  "team-communication-club": { title: "Team Communication Club", image: "Team_Communication.webp" },
  "online-tournaments-club": { title: "Online Tournaments Club", image: "Online_Tournaments.webp" },
  "strategy-games-club": { title: "Strategy Games Club", image: "Strategy_Games.webp" },
  "competitive-gaming": { title: "Competitive Gaming Club", image: "Competitive_Gaming.webp" },
  "global-competitions-club": { title: "Global Competitions Club", image: "Global_Competitions.webp" },
  "game-strategy-analysis-club": { title: "Game Strategy & Analysis Club", image: "Game_Strategy_Analysis.webp" },

  "student-council-club": { title: "Student Council", image: "Leadership_Skills.webp" },
  "the-debate-club": { title: "The Debate Club", image: "Debate_Club.webp", subtitle: "International Diplomat and Orator's Society (IDOS)" },
  "the-book-club": { title: "The Book Club", image: "book.webp", subtitle: "International Literary Society (ILS)" },
  "the-art-club": { title: "The Art Club", image: "art_club.webp", subtitle: "Viva De Lunaria" },
  "the-stem-club": { title: "The STEM Club", image: "stem.webp", subtitle: "Aurelian" },
  "the-gaming-club": { title: "The Gaming Club", image: "gd.webp", subtitle: "Link Club" },
  "the-law-club": { title: "The Law Club", image: "investigation.webp", subtitle: "Lex Orbis Legal Society" },
  "the-global-exchange-club": { title: "The Global Exchange Club", image: "language.webp", subtitle: "Nexus" },
  "the-wellness-club": { title: "The Wellness Club", image: "music.webp", subtitle: "Radiant Mind" },
  "the-newsletter-club": { title: "The Newsletter", image: "og.webp", subtitle: "The Horizons" },
  "the-entrepreneurship-club": { title: "The Entrepreneurship Club", image: "entrepreneurship.webp" },
};
