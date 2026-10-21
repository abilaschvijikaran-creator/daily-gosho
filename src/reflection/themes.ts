// Theme library for the template-based reflection engine.
//
// How it works: a theme is used only when one of its keywords actually appears in
// the passage text (whole words, case-insensitive). The "principle" lines are the
// app's own plain-English wording of what the passage points to. They are
// interpretations, never quotations, and the UI labels them that way.
//
// Templates quote the matched word as “{phrase}” so the sentence reads correctly
// whatever keyword matched. To add or edit a theme, change this file. The engine
// picks templates by a stable daily hash, so the same passage on the same day
// always produces the same text.

export interface Theme {
  id: string;
  /** Short name shown in the UI, e.g. "Courage". */
  label: string;
  /** Whole-word keywords; a theme applies only if one appears in the passage. */
  keywords: string[];
  /** Plain-English reading of the principle (our interpretation, not the author's words). */
  principle: string;
  /** Explanation templates. {phrase} = the keyword found in the passage. */
  explanation: string[];
  /** Personal-application templates. */
  application: string[];
  /** First-person determinations. Must stay connected to {phrase}. */
  determination: string[];
  /** One small, concrete action per option. */
  actions: string[];
}

export const THEMES: Theme[] = [
  {
    id: 'effort',
    label: 'Taking responsibility and effort',
    keywords: ['hard work', 'effort', 'diligent', 'diligence', 'sits back', 'take it easy', 'persevere', 'perseverance', 'persistence'],
    principle:
      'Real progress comes from doing the difficult part yourself, not waiting for others to carry it.',
    explanation: [
      'The passage points to the idea of “{phrase}”. Its message is that taking the hard work on yourself marks real practice, while avoiding effort does not.',
      'The key idea here is “{phrase}”. Read plainly, it asks whether you are willing to do the difficult part rather than hand it to someone else.',
    ],
    application: [
      'In ordinary life this can mean taking the next hard task at work or at home, instead of waiting to see whether someone else will step in.',
      'Today it may look like starting the task you have been avoiding, rather than leaving it for later or for someone else.',
    ],
    determination: [
      'Guided by the passage’s words on “{phrase}”, I will take on the hard part of what I have been avoiding today.',
      'Guided by “{phrase}”, I will not wait for someone else to do what is mine to do. I will start today.',
    ],
    actions: [
      'Pick one task you have been putting off and work on its first step for ten minutes.',
      'Write down the hardest thing on your list and do the first small part of it before lunch.',
    ],
  },
  {
    id: 'courage',
    label: 'Courage',
    keywords: ['courage', 'courageous', 'brave', 'bravery', 'warrior', 'fear', 'afraid', 'resolute', 'resolve', 'strength'],
    principle:
      'Courage is shown by a firm resolve that does not give way under pressure, and by taking action even when fear is present.',
    explanation: [
      'The passage speaks of “{phrase}”. The point is that a steady, committed resolve protects us from dangers we would otherwise fall into.',
      'The word “{phrase}” is central here. It suggests that facing a difficulty with a firm mind is itself a form of protection.',
    ],
    application: [
      'In daily life this might be a hard conversation you have been putting off, or a decision you have been afraid to make.',
      'It can show up as a small act of nerve today, such as saying what you think calmly and respectfully.',
    ],
    determination: [
      'Guided by the passage’s words on “{phrase}”, I will meet today with a firm resolve, and when I feel fear I will still take the next right step.',
      'Guided by “{phrase}”, I will act today rather than hesitate. I will do one thing I have been avoiding.',
    ],
    actions: [
      'Name one fear that is holding you back, then take one small step toward the thing it is blocking.',
      'Make a call or send a message you have been avoiding, keeping it short and honest.',
    ],
  },
  {
    id: 'encouraging',
    label: 'Encouraging others',
    keywords: ['others', 'encourage', 'encouragement', 'give hope', 'help others', 'courage to others'],
    principle:
      'Our own life grows as we give hope and courage to others and help them develop.',
    explanation: [
      'The passage refers to “{phrase}”. Its message is that encouraging others is part of our own growth, not separate from it.',
      'The idea behind “{phrase}” runs through this passage. It suggests that our benefit comes through how we support those around us.',
    ],
    application: [
      'In daily life this could mean a sincere word to a family member, colleague or friend who is struggling.',
      'It may look like noticing someone who needs support today and offering it without expecting anything back.',
    ],
    determination: [
      'Guided by the passage’s words on “{phrase}”, I will offer one person near me real encouragement today, and I will mean it.',
      'Guided by “{phrase}”, I will look for one person who needs support today and offer it honestly.',
    ],
    actions: [
      'Send one specific, sincere message of encouragement to someone who may need it today.',
      'Ask someone how they are doing today, and listen to the answer without rushing to fix it.',
    ],
  },
  {
    id: 'faith',
    label: 'Faith and practice',
    keywords: ['faith', 'practice', 'practise', 'daimoku', 'chanting'],
    principle:
      'Faith is expressed through steady practice that is connected to everyday life.',
    explanation: [
      'The passage speaks of “{phrase}”. Read plainly, it links faith with sustained practice, not with a single moment of feeling.',
      'The word “{phrase}” points to the link between belief and action. The passage presents them as one commitment.',
    ],
    application: [
      'In daily life this can mean keeping your regular practice steady, even on a day when it feels routine or difficult.',
      'It can show up as bringing the same sincerity you feel in practice into one ordinary task today.',
    ],
    determination: [
      'Guided by the passage’s words on “{phrase}”, I will carry that commitment into the ordinary parts of today.',
      'Guided by “{phrase}”, I will keep my practice steady today and let it show in how I act.',
    ],
    actions: [
      'Set aside a few quiet minutes today for your practice, at the same time you usually would.',
      'Choose one ordinary task today and do it with full attention as an expression of your practice.',
    ],
  },
  {
    id: 'adversity',
    label: 'Facing obstacles',
    keywords: ['enemies', 'enemy', 'danger', 'dangers', 'obstacle', 'obstacles', 'hardship', 'hardships', 'suffering', 'difficulties', 'difficult', 'trial', 'trials'],
    principle:
      'Difficulties are an expected part of life. How we meet them, with steady faith and resolve, shapes what follows.',
    explanation: [
      'The passage mentions “{phrase}”. Its message is that obstacles will come, and that our response to them matters greatly.',
      'Here the focus is on “{phrase}”. The passage treats difficulty as something to be met with a stronger, not weaker, resolve.',
    ],
    application: [
      'In daily life this can mean a setback at work or in a relationship. The question is how you respond to it, not whether it appears.',
      'It may look like facing one difficulty today calmly, rather than letting it decide your mood or your choices.',
    ],
    determination: [
      'Guided by the passage’s words on “{phrase}”, I will meet today’s difficulties with a steady mind and take one step through them.',
      'Guided by “{phrase}”, I will not let difficulty decide my choices today. I will respond with resolve.',
    ],
    actions: [
      'Write down one current difficulty and the smallest useful step you can take on it today.',
      'When something goes wrong today, pause for three slow breaths before you respond.',
    ],
  },
  {
    id: 'growth',
    label: 'Self-improvement and growth',
    keywords: ['grow', 'growth', 'develop', 'development', 'improve', 'self-improvement', 'transform', 'transformation', 'revolution'],
    principle:
      'Growth happens step by step, through honest effort to become a better person than we were yesterday.',
    explanation: [
      'The passage refers to “{phrase}”. Its message is that change comes from deliberate, ongoing effort in our own lives.',
      'The idea of “{phrase}” suggests that our life grows in proportion to what we do with it, day by day.',
    ],
    application: [
      'In daily life this could mean one habit you want to change, reviewed honestly rather than given up on.',
      'It may look like noticing one way you were unhelpful yesterday and making a small correction today.',
    ],
    determination: [
      'Guided by the passage’s words on “{phrase}”, I will take one honest step forward today and not wait for a perfect moment.',
      'Guided by “{phrase}”, I will use today to become a little better than I was yesterday.',
    ],
    actions: [
      'Choose one small habit to improve today and do it once, before the day ends.',
      'Spend five minutes writing what you learned from yesterday and what you will do differently.',
    ],
  },
  {
    id: 'dignity',
    label: 'Humanism and respect for others',
    keywords: ['humanism', 'dignity', 'respect', 'compassion', 'kindness', 'humanity', 'happiness', 'sufferings'],
    principle:
      'Our own happiness is connected with the wellbeing of other people. Respect and compassion are practical, not only ideals.',
    explanation: [
      'The passage speaks of “{phrase}”. Its message is that respect and compassion for others are part of living well ourselves.',
      'The key word here is “{phrase}”. It connects our happiness with how we treat the people around us.',
    ],
    application: [
      'In daily life this can mean listening fully to someone before you respond, especially when you disagree.',
      'It may look like treating a stranger, a colleague or a family member with the same respect you would want for yourself.',
    ],
    determination: [
      'Guided by the passage’s words on “{phrase}”, I will treat the people I meet today with genuine respect, including those I find difficult.',
      'Guided by “{phrase}”, I will listen to one person today as if their life matters, because it does.',
    ],
    actions: [
      'Listen to one person today without interrupting, and ask one follow-up question.',
      'Thank someone today for something specific they did, however small.',
    ],
  },
];

/** Used when no theme keyword appears in the passage. */
export const UNCLASSIFIED_THEME: Theme = {
  id: 'unclassified',
  label: 'General reflection (limited)',
  keywords: [],
  principle: '',
  explanation: [],
  application: [],
  determination: [],
  actions: [],
};
