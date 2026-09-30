// A group post is an emotion (the Moodbloom app) or a 1-5 level (the website). Every post is stored
// with a level, so the vibe score and the website keep working; the emotion is kept when there is one.

const EMOTIONS = ['joy', 'calm', 'sad', 'worry', 'anger', 'meh'];

// Emotion -> level, for the vibe score: the pleasant ones high, anger lowest.
const EMOTION_LEVEL = { joy: 5, calm: 4, meh: 3, worry: 2, sad: 2, anger: 1 };

// Level -> emotion, for posts made on the website. The website has five levels, so it cannot tell
// worry from sad or say anger: this is the closest emotion, not what the person felt.
const LEVEL_EMOTION = { 5: 'joy', 4: 'calm', 3: 'meh', 2: 'worry', 1: 'sad' };

const GROUP_COLORS = ['blue', 'sage', 'pink', 'peach', 'mint'];

const levelFor = (emotion) => EMOTION_LEVEL[emotion];
const emotionOf = (mood) => mood.emotion || LEVEL_EMOTION[mood.level] || 'meh';

module.exports = { EMOTIONS, GROUP_COLORS, levelFor, emotionOf };
