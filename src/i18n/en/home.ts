// Homepage strings. Title fields split { lead, accent, tail } render as
// `{lead}<em>{accent}</em>{tail}`; `lines` arrays render one <span> per line.
export default {
  meta: {
    title: 'biblocal: Lend, Borrow & Discuss Books with Neighbours',
    description:
      'Build a living bookshelf, then meet nearby readers who share your taste. Lend, borrow, discuss, and discover books with people in your neighbourhood.',
  },
  hero: {
    eyebrow: 'The local network for readers',
    titleLines: ['You are what', 'you read.'],
    titleAccent: 'So are they.',
    lede:
      'Build a living bookshelf. Then meet the people around you who read like you do: to lend, borrow, and actually talk about the books.',
    start: 'Start your shelf',
    how: 'How it works',
    meta: ['Lend', 'Borrow', 'Discuss', 'Gift', 'Hunt'],
    scroll: 'Keep reading',
  },
  shelf: {
    eyebrow: 'Your shelf',
    titleLead: 'Your shelf tells people ',
    titleAccent: 'who you are.',
    desc:
      "Every shelf is a branch of the neighborhood library. Add your books, mark what you'll share. That's how matches find you.",
    scanHint: 'Point your phone at the barcode on the back of any book. It appears.',
    caption: 'Hover a cover to see the marginalia',
    demo: {
      discuss: "Let's discuss",
      lend: 'Will lend',
      onShelf: 'On my shelf',
      gift: 'Free to good home',
      seeking: 'Looking for this',
      notes: {
        smallGods: 'Om is my favorite tortoise philosopher',
        geb: "You'll either love it or pretend to",
        unbearable: 'Every reading reveals something new',
        guards: 'Own too many copies. A good problem.',
        dispossessed: 'The ambiguous utopia awaits',
      },
    },
  },
  facets: {
    eyebrow: 'Find your people',
    titleLead: 'Five ways we match you with ',
    titleAccent: 'the right people.',
    lede:
      'Not just who’s nearby. Who actually gets the reference. Each signal adds weight; together they find the readers worth meeting.',
    exampleLabel: 'Example',
    note: 'More dots, stronger connection. Simple as that.',
    strength: 'Connection strength {n} of 3',
    items: {
      shelfTwin: {
        name: 'Shelf Twin',
        tagline: 'Suspiciously similar shelves',
        example: 'You both own that one Calvino nobody finishes. You both finished it.',
      },
      bookScout: {
        name: 'Book Scout',
        tagline: "They've been where you're going",
        example: 'Owns three books on your maybe-someday list',
      },
      neighbor: {
        name: 'Neighbor',
        tagline: 'Walking distance',
        example: '800 meters away. Has the book. Puts the kettle on.',
      },
      debatePartner: {
        name: 'Debate Partner',
        tagline: 'The reader who argues back',
        example: "You'll argue about Kundera for an hour and both enjoy it",
      },
      syllabusSurvivor: {
        name: 'Syllabus Survivor',
        tagline: 'Shared academic scars',
        example: 'Both required to read it. Both actually did.',
      },
    },
  },
  midCta: {
    kicker: 'Your shelf is already an introduction',
    titleLead: 'Stop reading alone. ',
    titleAccent: 'Meet them.',
  },
  map: {
    eyebrow: 'Right next door',
    titleLines: ['The people who read like you', 'are'],
    titleAccent: 'closer than you think',
    desc:
      'biblocal lines up your shelf with the readers and bookshops around you, so a new book, and maybe a new friend, is only a short walk away.',
    legendReaders: 'Readers nearby',
    legendStores: 'Local bookshops',
    legendYou: 'You',
    chromeTitle: 'Within 5km of downtown',
    chromeTag: 'Live',
    books: 'books',
    caption: 'Your neighbourhood, quietly full of fellow readers.',
  },
  signin: {
    eyebrow: 'Your shelf is ready',
    titleLead: 'Ready when ',
    titleAccent: 'you are.',
    desc:
      'Add a few books. See who’s nearby. The rest tends to happen on its own: quietly, locally, one book at a time.',
  },
};
