const TOPICS = [
  {
    day: "Monday",
    subject: "Embedded C",
    goals: ["Review one bitwise concept", "Trace a small C program", "Write one short driver example"],
    focus: "Stay clear and concrete."
  },
  {
    day: "Tuesday",
    subject: "DSA in C",
    goals: ["Practice one linked list problem", "Write one recursive solution", "Note one tricky edge case"],
    focus: "Think in patterns."
  },
  {
    day: "Wednesday",
    subject: "Core Electronics",
    goals: ["Review one circuit concept", "Sketch one small network", "Label the key formula"],
    focus: "Draw it to understand it."
  },
  {
    day: "Thursday",
    subject: "Linux",
    goals: ["Try one shell command", "Read one man page", "Check one file permission example"],
    focus: "A little familiarity goes a long way."
  },
  {
    day: "Friday",
    subject: "Revision / Interview Prep",
    goals: ["Review one theory topic", "Write one mock answer", "Note one strong example"],
    focus: "Keep the story crisp."
  },
  {
    day: "Saturday",
    subject: "Projects",
    goals: ["Spend 30 minutes on one build", "Write one small improvement", "Capture one lesson"],
    focus: "Momentum matters."
  },
  {
    day: "Sunday",
    subject: "Deep Study / Pending Work",
    goals: ["Pick one unfinished topic", "Close one loose end", "Plan the week ahead"],
    focus: "Wrap gently and reset."
  }
];

const TOPICS_BY_DAY = Object.fromEntries(TOPICS.map((topic) => [topic.day, topic]));

window.TOPICS = TOPICS;
window.TOPICS_BY_DAY = TOPICS_BY_DAY;
