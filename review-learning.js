import { PHONETIC_STRESS_MARKS } from "./src/phonetic-segmenter.js?v=1.0";
import { ReviewProgress } from "./src/review-progress.js?v=1.0";
import { THEME_CONFIGS, speakEnglish, splitPhonetic } from "./theme-learning.js?v=2.13";
import { initializeThemeOverview } from "./src/theme-overview.js?v=1.10";

let reviewStorage = null;
try { reviewStorage = window.localStorage; } catch {}
const reviewProgress = new ReviewProgress(reviewStorage);

const overview = initializeThemeOverview({
  configs: THEME_CONFIGS,
  splitPhonetic,
  stressMarks: PHONETIC_STRESS_MARKS,
  speakEnglish,
  reviewProgress
});

overview.openReview();

const reviewView = document.getElementById("totalReviewView");
const reviewPanel = document.getElementById("totalReviewPanel");
const reviewPhonetic = document.getElementById("totalReviewPhonetic");

function focusReviewPhonetic() {
  if (!reviewView.hidden && !reviewPanel.hidden) reviewPhonetic.focus({ preventScroll: true });
}

// Entering a round should make Space useful immediately, not restart the round.
focusReviewPhonetic();
for (const id of ["openTotalReview", "startLibraryReview", "restartTotalReview"]) {
  document.getElementById(id).addEventListener("click", focusReviewPhonetic);
}

document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.key !== " " || event.altKey || event.ctrlKey ||
      event.metaKey || event.shiftKey || event.isComposing ||
      reviewView.hidden || reviewPanel.hidden) return;
  const target = event.target instanceof Element ? event.target : null;
  if (target !== reviewPhonetic && target?.closest(
    "button,a,input,select,textarea,[contenteditable]:not([contenteditable='false']),[role='button'],[role='link'],[role='textbox'],[tabindex]"
  )) return;
  event.preventDefault();
  if (!event.repeat) reviewPhonetic.click();
});
