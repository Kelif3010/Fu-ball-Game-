export const PARTICIPANTS = {
  Berkant: ["Portugal", "Norway", "USA", "Scotland", "South Africa", "Jordan"],
  Bora: ["Brazil", "Senegal", "Switzerland", "Mexico", "Uzbekistan", "Saudi Arabia"],
  Can: ["Netherlands", "Turkey", "Uruguay", "Ghana", "South Korea", "Iran"],
  Dogan: ["France", "Morocco", "Ecuador", "Paraguay", "Tunisia", "Panama"],
  Fayit: ["Argentina", "Sweden", "Colombia", "Czech Republic", "Australia", "Qatar"],
  Hasret: ["Germany", "Belgium", "Algeria", "Canada", "Haiti", "Iraq"],
  Ken: ["Spain", "Croatia", "Austria", "DR Congo", "Egypt", "Curaçao"],
  Selcuk: ["England", "Ivory Coast", "Japan", "Bosnia and Herzegovina", "Cape Verde", "New Zealand"],
};

export const FLAGS = {
  Portugal: "🇵🇹", Norway: "🇳🇴", USA: "🇺🇸", Scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "South Africa": "🇿🇦", Jordan: "🇯🇴",
  Brazil: "🇧🇷", Senegal: "🇸🇳", Switzerland: "🇨🇭", Mexico: "🇲🇽", Uzbekistan: "🇺🇿", "Saudi Arabia": "🇸🇦",
  Netherlands: "🇳🇱", Turkey: "🇹🇷", Uruguay: "🇺🇾", Ghana: "🇬🇭", "South Korea": "🇰🇷", Iran: "🇮🇷",
  France: "🇫🇷", Morocco: "🇲🇦", Ecuador: "🇪🇨", Paraguay: "🇵🇾", Tunisia: "🇹🇳", Panama: "🇵🇦",
  Argentina: "🇦🇷", Sweden: "🇸🇪", Colombia: "🇨🇴", "Czech Republic": "🇨🇿", Australia: "🇦🇺", Qatar: "🇶🇦",
  Germany: "🇩🇪", Belgium: "🇧🇪", Algeria: "🇩🇿", Canada: "🇨🇦", Haiti: "🇭🇹", Iraq: "🇮🇶",
  Spain: "🇪🇸", Croatia: "🇭🇷", Austria: "🇦🇹", "DR Congo": "🇨🇩", Egypt: "🇪🇬", Curaçao: "🇨🇼",
  England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Ivory Coast": "🇨🇮", Japan: "🇯🇵", "Bosnia and Herzegovina": "🇧🇦", "Cape Verde": "🇨🇻", "New Zealand": "🇳🇿",
};

export const DE = {
  Portugal: "Portugal", Norway: "Norwegen", USA: "USA", Scotland: "Schottland", "South Africa": "Südafrika", Jordan: "Jordanien",
  Brazil: "Brasilien", Senegal: "Senegal", Switzerland: "Schweiz", Mexico: "Mexiko", Uzbekistan: "Usbekistan", "Saudi Arabia": "Saudi-Arabien",
  Netherlands: "Niederlande", Turkey: "Türkei", Uruguay: "Uruguay", Ghana: "Ghana", "South Korea": "Südkorea", Iran: "Iran",
  France: "Frankreich", Morocco: "Marokko", Ecuador: "Ecuador", Paraguay: "Paraguay", Tunisia: "Tunesien", Panama: "Panama",
  Argentina: "Argentinien", Sweden: "Schweden", Colombia: "Kolumbien", "Czech Republic": "Tschechien", Australia: "Australien", Qatar: "Katar",
  Germany: "Deutschland", Belgium: "Belgien", Algeria: "Algerien", Canada: "Kanada", Haiti: "Haiti", Iraq: "Irak",
  Spain: "Spanien", Croatia: "Kroatien", Austria: "Österreich", "DR Congo": "DR Kongo", Egypt: "Ägypten", Curaçao: "Curaçao",
  England: "England", "Ivory Coast": "Elfenbeinküste", Japan: "Japan", "Bosnia and Herzegovina": "Bosnien-Herzegowina", "Cape Verde": "Kap Verde", "New Zealand": "Neuseeland",
};

export const COLORS = {
  Berkant: "#f59e0b", Bora: "#10b981", Can: "#3b82f6", Dogan: "#8b5cf6",
  Fayit: "#ef4444", Hasret: "#f97316", Ken: "#06b6d4", Selcuk: "#84cc16",
};

export const displayTeamName = team => `${FLAGS[team] || ""} ${DE[team] || team || "Team"}`.trim();
