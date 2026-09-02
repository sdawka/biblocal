// Homepage strings. Title fields split { lead, accent, tail } render as
// `{lead}<em>{accent}</em>{tail}`; `lines` arrays render one <span> per line.
export default {
  meta: {
    title: 'biblocal: Lend, Borrow & Discuss Books with Neighbours',
    description:
      'Build a living bookshelf and put it into circulation: lend, borrow, gift, and discuss books with readers in your neighbourhood. Good ideas travel on foot.',
  },
  hero: {
    eyebrow: 'Ideas want to be shared',
    titleLines: ['You are what', 'you read.'],
    titleAccent: 'Pass it on.',
    lede:
      'Books are how ideas get around. Open your shelf, lend a few, and your street becomes a library. For people who love ideas (and people).',
    start: 'Start your shelf',
    how: 'How it works',
    meta: ['Lend', 'Borrow', 'Discuss', 'Gift', 'Hunt'],
    scroll: 'Keep reading',
    scrollAria: 'Scroll to learn more',
  },
  shelf: {
    eyebrow: 'Your branch',
    titleLead: 'Every shelf is a branch of ',
    titleAccent: 'the library.',
    desc:
      "A shelf is dormant infrastructure, not clutter. Add your books, mark what you'll share. That's how your books find their next reader.",
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
    eyebrow: 'The company your books keep',
    titleLead: 'Five ways your shelf ',
    titleAccent: 'overlaps with theirs.',
    lede:
      'The ideas on your shelf are already circulating nearby. Where shelves overlap, the conversations tend to be waiting.',
    exampleLabel: 'Example',
    note: "More dots, more shelf in common. That's the whole algorithm.",
    strength: 'Shelf overlap {n} of 3',
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
    kicker: 'The sequel to a great book is lending it',
    titleLead: 'Set your books ',
    titleAccent: 'loose.',
  },
  map: {
    eyebrow: 'Right next door',
    titleLines: ['Your neighbourhood is already', 'a library'],
    titleAccent: 'without a building',
    desc:
      'biblocal maps the shelves and bookshops around you, so the next book you want to read is a short walk away, not a shipping label.',
    legendReaders: 'Readers nearby',
    legendStores: 'Local bookshops',
    legendYou: 'You',
    chromeTitle: 'Within 5km of downtown',
    chromeTag: 'Live',
    books: 'books',
    caption: 'Your neighbourhood, quietly full of fellow readers.',
  },
  signin: {
    eyebrow: 'The library is open',
    titleLead: 'Ready when ',
    titleAccent: 'you are.',
    desc:
      'Add a few books. Open your shelf. The rest tends to happen on its own, one neighbour at a time.',
  },
};
