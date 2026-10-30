/**
 * Seed data: Nepal's 7 provinces and 77 districts (location menus), default
 * topic categories, and Nepali RSS feeds for AI ingestion.
 *
 * Aliases are used by the place-name matcher. They include common spellings
 * and district headquarters / big towns, so "विराटनगरमा ..." maps to Morang.
 */

export interface ProvinceSeed {
  slug: string;
  name: string;
  en: string;
  aliases: string[];
  districts: Array<[slug: string, name: string, en: string, aliases?: string[]]>;
}

export const PROVINCES: ProvinceSeed[] = [
  {
    slug: "koshi-pradesh",
    name: "कोशी प्रदेश",
    en: "Koshi Province",
    aliases: ["कोशी प्रदेश", "प्रदेश नं. १", "Koshi Province"],
    districts: [
      ["taplejung", "ताप्लेजुङ", "Taplejung"],
      ["panchthar", "पाँचथर", "Panchthar", ["फिदिम"]],
      ["ilam", "इलाम", "Ilam"],
      ["jhapa", "झापा", "Jhapa", ["भद्रपुर", "बिर्तामोड", "दमक", "मेचीनगर"]],
      ["morang", "मोरङ", "Morang", ["विराटनगर", "उर्लाबारी"]],
      ["sunsari", "सुनसरी", "Sunsari", ["इटहरी", "धरान", "इनरुवा"]],
      ["dhankuta", "धनकुटा", "Dhankuta"],
      ["terhathum", "तेह्रथुम", "Terhathum", ["म्याङलुङ"]],
      ["sankhuwasabha", "सङ्खुवासभा", "Sankhuwasabha", ["संखुवासभा", "खाँदबारी"]],
      ["bhojpur", "भोजपुर", "Bhojpur"],
      ["solukhumbu", "सोलुखुम्बु", "Solukhumbu", ["सल्लेरी", "खुम्बु"]],
      ["okhaldhunga", "ओखलढुङ्गा", "Okhaldhunga", ["ओखलढुंगा"]],
      ["khotang", "खोटाङ", "Khotang", ["दिक्तेल"]],
      ["udayapur", "उदयपुर", "Udayapur", ["गाईघाट", "त्रियुगा"]],
    ],
  },
  {
    slug: "madhesh-pradesh",
    name: "मधेश प्रदेश",
    en: "Madhesh Province",
    aliases: ["मधेश प्रदेश", "मधेस प्रदेश", "Madhesh Province"],
    districts: [
      ["saptari", "सप्तरी", "Saptari", ["राजविराज"]],
      ["siraha", "सिराहा", "Siraha", ["लहान"]],
      ["dhanusha", "धनुषा", "Dhanusha", ["जनकपुर", "जनकपुरधाम"]],
      ["mahottari", "महोत्तरी", "Mahottari", ["जलेश्वर"]],
      ["sarlahi", "सर्लाही", "Sarlahi", ["मलंगवा"]],
      ["rautahat", "रौतहट", "Rautahat", ["गौर"]],
      ["bara", "बारा", "Bara", ["कलैया", "सिमरा"]],
      ["parsa", "पर्सा", "Parsa", ["वीरगञ्ज", "वीरगंज", "बीरगञ्ज"]],
    ],
  },
  {
    slug: "bagmati-pradesh",
    name: "बागमती प्रदेश",
    en: "Bagmati Province",
    aliases: ["बागमती प्रदेश", "Bagmati Province"],
    districts: [
      ["dolakha", "दोलखा", "Dolakha", ["चरिकोट"]],
      ["sindhupalchok", "सिन्धुपाल्चोक", "Sindhupalchok", ["चौतारा", "मेलम्ची"]],
      ["rasuwa", "रसुवा", "Rasuwa", ["धुन्चे"]],
      ["dhading", "धादिङ", "Dhading", ["धादिङबेसी"]],
      ["nuwakot", "नुवाकोट", "Nuwakot", ["विदुर", "बिदुर"]],
      ["kathmandu", "काठमाडौं", "Kathmandu", ["काठमाडौँ", "कीर्तिपुर", "बूढानीलकण्ठ"]],
      ["bhaktapur", "भक्तपुर", "Bhaktapur", ["मध्यपुर थिमी", "सूर्यविनायक"]],
      ["lalitpur", "ललितपुर", "Lalitpur", ["ललितपुर महानगरपालिका"]],
      [
        "kavrepalanchok",
        "काभ्रेपलाञ्चोक",
        "Kavrepalanchok",
        ["काभ्रे", "कभ्रे", "Kavre", "धुलिखेल", "बनेपा", "नमोबुद्ध", "मण्डनदेउपुर", "पाँचखाल", "रोशी", "तेमाल", "चौरीदेउराली", "भुम्लु", "बेथानचोक", "खानीखोला"],
      ],
      ["ramechhap", "रामेछाप", "Ramechhap", ["मन्थली"]],
      ["sindhuli", "सिन्धुली", "Sindhuli", ["कमलामाई", "सिन्धुलीमाढी"]],
      ["makwanpur", "मकवानपुर", "Makwanpur", ["हेटौंडा", "हेटौँडा"]],
      ["chitwan", "चितवन", "Chitwan", ["भरतपुर महानगरपालिका", "रत्ननगर"]],
    ],
  },
  {
    slug: "gandaki-pradesh",
    name: "गण्डकी प्रदेश",
    en: "Gandaki Province",
    aliases: ["गण्डकी प्रदेश", "Gandaki Province"],
    districts: [
      ["gorkha", "गोरखा", "Gorkha"],
      ["manang", "मनाङ", "Manang", ["चामे"]],
      ["mustang", "मुस्ताङ", "Mustang", ["जोमसोम"]],
      ["myagdi", "म्याग्दी", "Myagdi", ["बेनी"]],
      ["kaski", "कास्की", "Kaski", ["पोखरा"]],
      ["lamjung", "लमजुङ", "Lamjung", ["बेसीशहर"]],
      ["tanahun", "तनहुँ", "Tanahun", ["दमौली", "व्यास नगरपालिका"]],
      ["nawalpur", "नवलपुर", "Nawalpur", ["नवलपरासी (बर्दघाट सुस्ता पूर्व)", "कावासोती"]],
      ["syangja", "स्याङ्जा", "Syangja", ["स्याङजा", "पुतलीबजार", "वालिङ"]],
      ["parbat", "पर्वत", "Parbat", ["कुश्मा"]],
      ["baglung", "बागलुङ", "Baglung"],
    ],
  },
  {
    slug: "lumbini-pradesh",
    name: "लुम्बिनी प्रदेश",
    en: "Lumbini Province",
    aliases: ["लुम्बिनी प्रदेश", "Lumbini Province"],
    districts: [
      ["rukum-east", "रुकुम पूर्व", "Rukum East", ["पूर्वी रुकुम"]],
      ["rolpa", "रोल्पा", "Rolpa", ["लिबाङ"]],
      ["pyuthan", "प्युठान", "Pyuthan"],
      ["gulmi", "गुल्मी", "Gulmi", ["तम्घास"]],
      ["arghakhanchi", "अर्घाखाँची", "Arghakhanchi", ["सन्धिखर्क"]],
      ["palpa", "पाल्पा", "Palpa", ["तानसेन"]],
      ["parasi", "परासी", "Parasi", ["नवलपरासी (बर्दघाट सुस्ता पश्चिम)", "रामग्राम"]],
      ["rupandehi", "रुपन्देही", "Rupandehi", ["बुटवल", "भैरहवा", "सिद्धार्थनगर", "लुम्बिनी सांस्कृतिक"]],
      ["kapilvastu", "कपिलवस्तु", "Kapilvastu", ["तौलिहवा"]],
      ["dang", "दाङ", "Dang", ["घोराही", "तुलसीपुर"]],
      ["banke", "बाँके", "Banke", ["नेपालगञ्ज", "नेपालगंज"]],
      ["bardiya", "बर्दिया", "Bardiya", ["गुलरिया"]],
    ],
  },
  {
    slug: "karnali-pradesh",
    name: "कर्णाली प्रदेश",
    en: "Karnali Province",
    aliases: ["कर्णाली प्रदेश", "Karnali Province"],
    districts: [
      ["dolpa", "डोल्पा", "Dolpa"],
      ["mugu", "मुगु", "Mugu", ["गमगढी"]],
      ["humla", "हुम्ला", "Humla", ["सिमकोट"]],
      ["jumla", "जुम्ला", "Jumla"],
      ["kalikot", "कालिकोट", "Kalikot", ["मान्म"]],
      ["dailekh", "दैलेख", "Dailekh"],
      ["jajarkot", "जाजरकोट", "Jajarkot"],
      ["rukum-west", "रुकुम पश्चिम", "Rukum West", ["पश्चिम रुकुम", "मुसिकोट"]],
      ["salyan", "सल्यान", "Salyan"],
      ["surkhet", "सुर्खेत", "Surkhet", ["वीरेन्द्रनगर"]],
    ],
  },
  {
    slug: "sudurpashchim-pradesh",
    name: "सुदूरपश्चिम प्रदेश",
    en: "Sudurpashchim Province",
    aliases: ["सुदूरपश्चिम प्रदेश", "सुदूरपश्चिम", "Sudurpashchim Province"],
    districts: [
      ["bajura", "बाजुरा", "Bajura", ["मार्तडी"]],
      ["bajhang", "बझाङ", "Bajhang", ["चैनपुर बझाङ"]],
      ["achham", "अछाम", "Achham", ["मंगलसेन"]],
      ["doti", "डोटी", "Doti", ["दिपायल", "सिलगढी"]],
      ["kailali", "कैलाली", "Kailali", ["धनगढी", "टीकापुर"]],
      ["kanchanpur", "कञ्चनपुर", "Kanchanpur", ["महेन्द्रनगर", "भीमदत्त नगरपालिका"]],
      ["dadeldhura", "डडेल्धुरा", "Dadeldhura", ["अमरगढी"]],
      ["baitadi", "बैतडी", "Baitadi"],
      ["darchula", "दार्चुला", "Darchula"],
    ],
  },
];

/** Municipalities with their own menu entry (children of a district). */
export const MUNICIPALITIES: Array<{
  slug: string;
  name: string;
  district: string;
  aliases: string[];
  priority?: boolean;
}> = [
  { slug: "panauti", name: "पनौती", district: "kavrepalanchok", aliases: ["पनौती नगरपालिका", "Panauti"], priority: true },
];

/** The home town / district that gets priority in ingestion and the home page. */
export const PRIORITY_DISTRICTS = ["kavrepalanchok"];

export const TOPICS: Array<{ slug: string; name: string }> = [
  { slug: "rajniti", name: "राजनीति" },
  { slug: "arthatantra", name: "अर्थतन्त्र" },
  { slug: "samaj", name: "समाज" },
  { slug: "khelkud", name: "खेलकुद" },
  { slug: "manoranjan", name: "मनोरञ्जन" },
  { slug: "swasthya", name: "स्वास्थ्य" },
  { slug: "shiksha", name: "शिक्षा" },
  { slug: "prabidhi", name: "प्रविधि" },
  { slug: "antarrashtriya", name: "अन्तर्राष्ट्रिय" },
];

/** RSS feeds checked to be online (Oct 2026). The seed re-checks before enabling. */
export const SOURCES: Array<{ name: string; url: string }> = [
  { name: "अनलाइनखबर", url: "https://www.onlinekhabar.com/feed" },
  { name: "रातोपाटी", url: "https://ratopati.com/feed" },
  { name: "नागरिक", url: "https://nagariknews.nagariknetwork.com/feed" },
  { name: "अन्नपूर्ण पोस्ट", url: "https://www.annapurnapost.com/rss" },
  { name: "उकेरा", url: "https://ukeraa.com/feed" },
  { name: "देशसञ्चार", url: "https://deshsanchar.com/feed" },
  { name: "लोकान्तर", url: "https://www.lokaantar.com/feed" },
  { name: "खबरहब", url: "https://www.khabarhub.com/feed" },
  { name: "नयाँ पत्रिका", url: "https://www.nayapatrikadaily.com/rss" },
  { name: "नेपाल खबर", url: "https://www.nepalkhabar.com/feed" },
  { name: "गोरखापत्र", url: "https://gorkhapatraonline.com/rss" },
  { name: "न्युज अफ नेपाल", url: "https://www.newsofnepal.com/feed" },
  { name: "सेतोपाटी", url: "https://www.setopati.com/feed" },
  { name: "हिमालखबर", url: "https://www.himalkhabar.com/feed" },
  { name: "बाह्रखरी", url: "https://baahrakhari.com/feed" },
  { name: "उज्यालो", url: "https://ujyaaloonline.com/feed" },
  { name: "बीबीसी नेपाली", url: "https://feeds.bbci.co.uk/nepali/rss.xml" },
];
