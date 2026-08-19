// Toutes les chaînes de l'interface (FR). Une seule source de vérité pour
// permettre l'i18n plus tard : remplacer ce fichier suffit.

const STR = {
  // Général
  'app.name': 'LA KERMESSE',
  'app.tagline': 'La fête foraine en ligne — pour toi et tes 7 meilleurs ennemis.',
  'app.enter': 'ENTRER DANS LA FÊTE',
  'btn.create': 'OUVRIR UN STAND',
  'btn.join': 'REJOINDRE',
  'btn.joinShort': 'GO',
  'home.codePlaceholder': 'CODE',
  'home.yourName': 'Ton blaze',
  'home.pickFace': 'Ta tête',
  'home.namePlaceholder': 'Pseudo…',

  // Connexion
  'net.connecting': 'Connexion à la fête…',
  'net.reconnecting': 'Reconnexion… ne quitte pas la file !',
  'net.offline': 'La fête est injoignable. Nouvelle tentative…',
  'net.resumed': 'Te revoilà ! Ta place était gardée.',

  // Lobby
  'lobby.title': 'LE STAND',
  'lobby.code': 'Code du stand',
  'lobby.copy': 'Copier le lien',
  'lobby.copied': 'Lien copié !',
  'lobby.players': 'La troupe',
  'lobby.game': 'Le jeu',
  'lobby.format': 'Le format',
  'lobby.settings': 'Réglages',
  'lobby.rounds': 'Manches',
  'lobby.duration': 'Durée',
  'lobby.botSkill': 'Forains (bots)',
  'lobby.botSkill.facile': 'Débonnaires',
  'lobby.botSkill.normal': 'Réglos',
  'lobby.botSkill.costaud': 'Teigneux',
  'lobby.addBot': '+ Forain',
  'lobby.ready': 'JE SUIS PRÊT·E',
  'lobby.unready': 'Pas prêt·e',
  'lobby.start': 'LANCER',
  'lobby.startBots': 'LANCER (+{n} forains)',
  'lobby.waitHost': 'En attente de l\'hôte…',
  'lobby.waitReady': 'En attente que tout le monde soit prêt…',
  'lobby.shuffle': '🎲 Mélanger',
  'lobby.host': 'Hôte',
  'lobby.you': 'toi',
  'lobby.spectator': 'Spectateur',
  'lobby.disconnected': 'déconnecté·e',
  'lobby.tapTeam': 'Touche un joueur pour changer son équipe',
  'lobby.rules': 'Règles',

  // Formats
  'fmt.ffa': 'Chacun pour soi',
  'fmt.teams': '{sizes}',
  'fmt.vs': ' contre ',
  'fmt.asym': '{solo} — {sizes}',

  // Jeu
  'game.spectator': '👻 SPECTATEUR — tu vois tout, profite',
  'game.dead': 'ÉLIMINÉ·E ! Reste pour le spectacle…',
  'game.afk': 'AFK — un forain tient ta place',
  'game.ping': 'ping',
  'game.round': 'Manche {n}',
  'game.quit': 'Quitter',

  // Résultats
  'results.title': 'REMISE DES LOTS',
  'results.again': 'REJOUER',
  'results.changeGame': 'CHANGER DE JEU',
  'results.waitHost': 'L\'hôte choisit la suite…',
  'results.winner': 'VAINQUEUR',
  'results.winners': 'VAINQUEURS',
  'results.draw': 'ÉGALITÉ ! Tout le monde a gagné (ou perdu)',
  'results.autoLobby': 'Retour au stand automatique dans un instant…',

  // Erreurs (codes serveur → texte)
  'err.BAD_CODE': 'Ce code ne mène à aucun stand.',
  'err.ROOM_FULL': 'Ce stand est plein (8 max) !',
  'err.SERVER_FULL': 'La fête est bondée, réessaie dans un instant.',
  'err.NOT_READY': 'Tout le monde n\'est pas prêt !',
  'err.RATE': 'Doucement sur les boutons !',
  'err.GAME_CRASH': 'Le manège a déraillé — retour au stand.',
  'err.ROOM_CLOSED': 'Le stand a fermé ses portes.',
  'err.NOT_HOST': 'Seul l\'hôte peut faire ça.',

  // Divers
  'misc.mute': 'Couper le son',
  'misc.unmute': 'Remettre le son',
  'misc.close': 'Fermer',
  'misc.bots': 'forains',
  'misc.team': 'Équipe {n}',
  'misc.share': 'Rejoins-moi à la Kermesse ! Code : {code}',
};

export function t(key, params = {}) {
  let s = STR[key] ?? key;
  for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

// Libellé FR d'un format produit par shared/formats.js.
export function formatLabel(fmt) {
  if (!fmt) return '—';
  if (fmt.kind === 'ffa') return t('fmt.ffa');
  const sizes = fmt.sizes.join(t('fmt.vs'));
  if (fmt.kind === 'asym') return t('fmt.asym', { solo: fmt.roles?.solo || 'Solo', sizes });
  return sizes;
}

export const EMOTES = ['👏', '😂', '😱', '🤡', '❤️', '💀', '🎉', '😤'];
