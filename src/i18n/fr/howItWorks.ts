// Page « Comment ça marche ». Les émojis d'icônes vivent dans le markup (ils sont
// décoratifs) ; toute la prose visible vit ici.
export default {
  meta: {
    title: 'Comment ça marche — biblocal',
    description:
      'Trois chapitres, une étagère : découvrez comment biblocal met vos livres en circulation — prêtez, empruntez, donnez et discutez de livres à quelques pas de chez vous.',
  },
  hero: {
    back: '← Retour à l\'accueil',
    eyebrow: 'Comment ça marche',
    titleLines: ['Comment votre étagère', 'devient une bibliothèque.'],
    subtitle: 'Trois chapitres. Une étagère. Et les idées qui dormaient dessus.',
  },
  chapters: {
    one: {
      eyebrow: 'Chapitre un',
      title: 'Construisez votre étagère',
      intro:
        'D\'abord, le plus agréable. Chaque livre que vous ajoutez dit quelque chose de vous : les classiques, les lectures réconfort, celui que vous comptez finir depuis des années. Ajoutez-les tous.',
      cards: {
        scan: {
          title: 'Retournez le livre',
          body: 'Présentez votre téléphone au code-barres au dos, et il se pose sur votre étagère le temps de reposer le livre. Taper le titre marche aussi, si vous y allez de mémoire.',
        },
        collection: {
          title: 'Toute votre collection',
          body: 'Cette étagère dans la chambre. Les cartons au grenier. La pile « à lire » devenue un risque structurel. Tout, vraiment.',
        },
        intentions: {
          title: 'Affichez vos intentions',
          body: 'Chaque livre reçoit un statut : à prêter, à discuter, à donner, ou à chercher. Parce que posséder n\'est pas tout à fait partager.',
        },
      },
      aside: '« La bibliothèque est un organisme vivant. » — Cinquième loi de Ranganathan. Valable aussi pour ce coin de votre chambre.',
    },
    two: {
      eyebrow: 'Chapitre deux',
      title: 'Prêtez, empruntez, recommencez',
      intro:
        'Les livres sont faits pour voyager. Les meilleurs reviennent cornés, tachés de café, et aimés. Les tout meilleurs ne reviennent pas du tout : ils ont trouvé un nouveau foyer.',
      cards: {
        noShipping: {
          title: 'Pas de colis, pas de tracas',
          body: 'Vos correspondances sont tout près. Faites le trajet, prenez un café, tendez-leur le livre : comme le prêt a toujours voulu fonctionner.',
        },
        find: {
          title: 'Trouvez ce que vous cherchez',
          body: 'Marquez un livre « recherché » et nous vous dirons quand quelqu\'un près de chez vous l\'a. Fini de rafraîchir les sites de livres d\'occasion.',
        },
        give: {
          title: 'Donnez des livres',
          body: 'Certains livres doivent poursuivre leur route. Marquez-les « à donner » et laissez quelqu\'un d\'autre en tomber amoureux.',
        },
      },
      aside: '« Un livre est un cadeau qu\'on peut ouvrir encore et encore. » — Garrison Keillor. Ou, ici, un cadeau qu\'on peut offrir encore et encore.',
    },
    three: {
      eyebrow: 'Chapitre trois',
      title: 'Comparez vos notes',
      intro:
        'Un livre qui voyage revient rarement sans opinions. biblocal vous montre où votre étagère recoupe celles d\'à côté : quand vous aurez besoin de reparler de cette fin, la conversation sera à distance de marche.',
      cards: {
        twins: {
          title: 'Jumeaux d\'étagère',
          body: 'Des étagères au contenu étrangement semblable. Quand les collections se recoupent à ce point, les prêts s\'organisent presque tout seuls.',
        },
        discussion: {
          title: 'Correspondances de discussion',
          body: 'Marquez un livre « à discuter » et trouvez les gens qui ont autant besoin que vous d\'en débattre la fin.',
        },
        local: {
          title: 'Et les librairies locales',
          body: 'Des boutiques indépendantes qui ont du caractère. Le genre où le libraire a tout lu et adore en débattre.',
        },
      },
      aside: '« Jamais deux personnes ne lisent le même livre. » — Edmund Wilson. Raison de plus pour faire circuler votre exemplaire.',
    },
  },
  colophon: {
    eyebrow: 'Colophon',
    title: 'Un mot de la direction',
    intro:
      'Où nous nous expliquons, parce que tout bon livre comporte un passage final où l\'auteur divague sur les polices et le grammage du papier.',
    p1Lead: 'biblocal est une ',
    p1Strong: 'initiative communautaire à but non lucratif',
    p1Tail: ', façon élégante de dire que personne ne s\'enrichit ici et que nous le faisons tous parce que nous croyons sincèrement que les livres devraient circuler bien plus qu\'ils ne le font.*',
    p2: 'Le tout est open source, parce que les meilleures idées — comme les meilleurs livres — veulent être partagées. Si vous savez coder, écrire, concevoir, ou avez simplement des avis tranchés sur les systèmes de classification de bibliothèque, votre aide est la bienvenue. Pull requests bienvenues. Critique constructive tolérée. Pâtisseries appréciées mais non requises.**',
    github: '→ Retrouvez-nous sur GitHub',
    footnote1: '* Nous avons envisagé de devenir une startup à but lucratif et de « disrupter le marché de la bibliothèque personnelle », mais cela semblait plutôt contraire à l\'esprit de la chose.',
    footnote2: '** GNU Terry Pratchett',
  },
  cta: {
    title: 'Prêt à mettre quelques livres en mouvement ?',
    body: 'Les livres appartiennent à tout le monde. Nous les aidons juste à circuler. Commencez par les vôtres.',
    button: 'Construire mon étagère',
  },
};
