import { PHONETIC_STRESS_MARKS } from "./src/phonetic-segmenter.js?v=1.0";
import { THEME_CONFIGS, speakEnglish, splitPhonetic } from "./theme-learning.js?v=2.8";
import { initializeThemeOverview } from "./src/theme-overview.js?v=1.6";

const overview = initializeThemeOverview({
  configs: THEME_CONFIGS,
  splitPhonetic,
  stressMarks: PHONETIC_STRESS_MARKS,
  speakEnglish
});

overview.openReview();
