// "How it works" page strings. Feature-icon emojis live in the markup (they are
// decorative); everything user-facing as prose lives here.
export default {
  meta: {
    title: 'How It Works — biblocal',
    description:
      'Three chapters, one shelf: see how biblocal puts your books into circulation — lend, borrow, gift, and discuss books a short walk from home.',
  },
  hero: {
    back: '← Back to home',
    eyebrow: 'How It Works',
    titleLines: ['How your shelf', 'becomes a library.'],
    subtitle: "Three chapters. One shelf. And the ideas it's been sitting on.",
  },
  chapters: {
    one: {
      eyebrow: 'Chapter One',
      title: 'Build your shelf',
      intro:
        "First, the fun part. Every book you add says something about who you are — the classics, the comfort reads, the one you've been meaning to finish for years. Add it all.",
      cards: {
        scan: {
          title: 'Flip the book over',
          body: 'Hold your phone to the barcode on the back, and it lands on your shelf in the time it takes to put it down. Typing the title works too, if you are going from memory.',
        },
        collection: {
          title: 'Your whole collection',
          body: 'That shelf in the bedroom. The boxes in storage. The "to-read" pile that\'s become a structural hazard. All of it.',
        },
        intentions: {
          title: 'Set your intentions',
          body: "Each book gets a status: will lend, want to discuss, giving away, or hunting for. Because owning isn't the same as sharing.",
        },
      },
      aside: '"The library is a growing organism." — Ranganathan\'s Fifth Law. Also applicable to that corner of your bedroom.',
    },
    two: {
      eyebrow: 'Chapter Two',
      title: 'Lend, borrow, repeat',
      intro:
        "Books were meant to travel. The best ones come back dog-eared, coffee-stained, and loved. The very best don't come back at all — they've found a new home.",
      cards: {
        noShipping: {
          title: 'No shipping, no hassle',
          body: 'Your matches are nearby. Walk over, grab a coffee, hand them the book — the way lending was always meant to work.',
        },
        find: {
          title: 'Find what you seek',
          body: 'Mark a book as "hunting for" and we\'ll tell you when someone nearby has it. No more refreshing used bookstore websites.',
        },
        give: {
          title: 'Give books away',
          body: 'Some books need to move on. Mark them "free to good home" and let someone else fall in love with them.',
        },
      },
      aside: '"A book is a gift you can open again and again." — Garrison Keillor. Or in this case, a gift you can give again and again.',
    },
    three: {
      eyebrow: 'Chapter Three',
      title: 'Compare notes',
      intro:
        "A book that travels tends to come back with opinions attached. biblocal shows you where your shelf overlaps with the ones nearby, so when you need to talk through that ending, the conversation is within walking distance.",
      cards: {
        twins: {
          title: 'Shelf twins',
          body: 'Shelves with suspiciously similar contents. When collections overlap that much, the lending practically organises itself.',
        },
        discussion: {
          title: 'Discussion matches',
          body: 'Mark a book "want to discuss" and find the people who need to talk through that ending as badly as you do.',
        },
        local: {
          title: 'Local bookstores too',
          body: 'Independent shops with character. The kind where the owner has read everything and loves to argue about it.',
        },
      },
      aside: '"No two persons ever read the same book." — Edmund Wilson. All the more reason to pass your copy along.',
    },
  },
  colophon: {
    eyebrow: 'Colophon',
    title: 'A note from the management',
    intro:
      'In which we explain ourselves, because every good book has a bit at the end where the author rambles about fonts and paper stock.',
    p1Lead: 'biblocal is a ',
    p1Strong: 'community non-profit initiative',
    p1Tail: ", which is a fancy way of saying nobody's getting rich here and we're all doing this because we genuinely believe books should move around more than they do.*",
    p2: 'The whole thing is open source, because the best ideas—like the best books—want to be shared. If you can code, write, design, or just have strong opinions about library classification systems, we\'d love your help. Pull requests welcome. Constructive criticism tolerated. Baked goods appreciated but not required.**',
    github: '→ Find us on GitHub',
    footnote1: '* We considered becoming a for-profit startup and "disrupting the personal library space," but that seemed rather against the spirit of the thing.',
    footnote2: '** GNU Terry Pratchett',
  },
  cta: {
    title: 'Ready to put a few books in motion?',
    body: "Books belong to everyone. We're just helping them get around. Start with yours.",
    button: 'Build Your Shelf',
  },
};
