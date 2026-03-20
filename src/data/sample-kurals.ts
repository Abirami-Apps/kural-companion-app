// Sample kural data — will be replaced with user's JSON
export interface Kural {
  number: number;
  tamil: string;
  tamilMeaning: string;
  englishTranslation: string;
  chapter: string;
  section: string;
  audioUrl?: string;
}

export const sampleKurals: Kural[] = [
  { number: 1, tamil: "அகர முதல எழுத்தெல்லாம் ஆதி\nபகவன் முதற்றே உலகு.", tamilMeaning: "எழுத்துக்கள் எல்லாம் அகரத்தை அடிப்படையாக கொண்டிருக்கின்றன. அதுபோல உலகம் கடவுளை அடிப்படையாக கொண்டிருக்கிறது.", englishTranslation: "As the letter A is the first of all letters, so the eternal God is first in the world.", chapter: "கடவுள் வாழ்த்து", section: "அறத்துப்பால்" },
  { number: 2, tamil: "கற்றதனால் ஆய பயனென்கொல் வாலறிவன்\nநற்றாள் தொழாஅர் எனின்.", tamilMeaning: "தூய அறிவனாகிய கடவுளின் நல்ல திருவடிகளை தொழாதவர், கற்றதனால் ஆய பயன் என்ன?", englishTranslation: "What is the use of learning, if one does not worship the good feet of the pure-minded God?", chapter: "கடவுள் வாழ்த்து", section: "அறத்துப்பால்" },
  { number: 3, tamil: "மலர்மிசை ஏகினான் மாணடி சேர்ந்தார்\nநிலமிசை நீடுவாழ் வார்.", tamilMeaning: "மக்களின் மலர் போன்ற மனத்தின் மேல் நடப்பவனாகிய கடவுளின் சிறந்த திருவடிகளைச் சேர்ந்தவர், இந்த உலகில் நெடுங்காலம் வாழ்வர்.", englishTranslation: "They who worship the feet of Him who walks upon the flower of the mind shall prosper long upon this earth.", chapter: "கடவுள் வாழ்த்து", section: "அறத்துப்பால்" },
  { number: 4, tamil: "வேண்டுதல் வேண்டாமை இலானடி சேர்ந்தார்க்கு\nயாண்டும் இடும்பை இல.", tamilMeaning: "விருப்பு வெறுப்பு இல்லாத கடவுளின் திருவடிகளைச் சேர்ந்தவர்களுக்கு எப்போதும் துன்பம் இல்லை.", englishTranslation: "Those who reach the feet of Him who is free from desire and aversion will be free from suffering forever.", chapter: "கடவுள் வாழ்த்து", section: "அறத்துப்பால்" },
  { number: 5, tamil: "இருள்சேர் இருவினையும் சேரா இறைவன்\nபொருள்சேர் புகழ்புரிந்தார் மாட்டு.", tamilMeaning: "கடவுளின் உண்மையான புகழை விரும்பியவரிடம் இருளை உண்டாக்கும் இரு வினைகளும் சேரா.", englishTranslation: "The two-fold deeds that spring from darkness will not cling to those who delight in the true praise of God.", chapter: "கடவுள் வாழ்த்து", section: "அறத்துப்பால்" },
  { number: 6, tamil: "பொறிவாயில் ஐந்தவித்தான் பொய்தீர் ஒழுக்க\nநெறிநின்றார் நீடுவாழ் வார்.", tamilMeaning: "ஐம்புலன்களையும் அடக்கிய கடவுளின் பொய்யற்ற ஒழுக்க நெறியில் நின்றவர், நீடுவாழ்வார்.", englishTranslation: "They who stand firm in the faultless way of Him who has conquered the five senses shall live long.", chapter: "கடவுள் வாழ்த்து", section: "அறத்துப்பால்" },
  { number: 7, tamil: "தனக்குவமை இல்லாதான் தாள்சேர்ந்தார்க் கல்லால்\nமனக்கவலை மாற்றல் அரிது.", tamilMeaning: "தனக்கு ஒப்புமை இல்லாத கடவுளின் திருவடிகளைச் சேர்ந்தவர்க்கு அல்லாமல், மனக்கவலையை மாற்றுவது அரிது.", englishTranslation: "Except those who worship the feet of Him who is beyond comparison, none can overcome mental anguish.", chapter: "கடவுள் வாழ்த்து", section: "அறத்துப்பால்" },
  { number: 8, tamil: "அறவாழி அந்தணன் தாள்சேர்ந்தார்க் கல்லால்\nபிறவாழி நீந்தல் அரிது.", tamilMeaning: "அறக்கடலாகிய கடவுளின் திருவடிகளைச் சேர்ந்தவர்க்கு அல்லாமல், பிறவிக்கடலைக் கடப்பது அரிது.", englishTranslation: "None can swim across the sea of birth except those who cling to the feet of that gracious God.", chapter: "கடவுள் வாழ்த்து", section: "அறத்துப்பால்" },
  { number: 9, tamil: "கோளில் பொறியில் குணமிலவே எண்குணத்தான்\nதாளை வணங்காத் தலை.", tamilMeaning: "எட்டுக் குணங்களை உடைய கடவுளின் திருவடிகளை வணங்காத தலை, செயலற்ற புலன்களைப் போல பயனற்றது.", englishTranslation: "The head that bows not before the eight-virtued God is as useless as a senseless sense organ.", chapter: "கடவுள் வாழ்த்து", section: "அறத்துப்பால்" },
  { number: 10, tamil: "பிறவிப் பெருங்கடல் நீந்துவர் நீந்தார்\nஇறைவன் அடிசேரா தார்.", tamilMeaning: "இறைவனின் திருவடிகளைச் சேர்ந்தவர் பிறவியாகிய பெருங்கடலை நீந்திக் கடப்பர், சேராதவர் கடக்க மாட்டார்.", englishTranslation: "They who cling to God's feet shall swim across the great sea of birth; others shall not.", chapter: "கடவுள் வாழ்த்து", section: "அறத்துப்பால்" },
  { number: 11, tamil: "செல்வத்துள் செல்வம் செவிச்செல்வம் அச்செல்வம்\nஎல்லாச் செல்வத்துக்கும் எல்.", tamilMeaning: "செல்வங்களுள் சிறந்த செல்வம் கேள்விச் செல்வமே. அது மற்ற எல்லா செல்வங்களுக்கும் மேலானது.", englishTranslation: "The wealth of hearing is the wealth of all wealth, the supreme of all.", chapter: "கேள்வி", section: "அறத்துப்பால்" },
  { number: 12, tamil: "செவிக்குண வில்லாத போழ்து சிறிது\nவயிற்றுக்கும் ஈயப் படும்.", tamilMeaning: "செவிக்கு உணவு இல்லாத போது, சிறிதளவு வயிற்றுக்கும் உணவு அளிக்கப்படும்.", englishTranslation: "When there is no food for the ear, a little may be given to the stomach.", chapter: "கேள்வி", section: "அறத்துப்பால்" },
];

export function getKural(number: number): Kural | undefined {
  return sampleKurals.find(k => k.number === number);
}

export const TOTAL_KURALS = 1330;
export const FREE_LIMIT = 10;
