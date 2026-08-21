// BOMBER : dictionnaire francais du stand. Mots courants, normalises
// (minuscules, sans accents ni traits d union), de 3 a 14 lettres.
// Ce fichier n est PAS servi au navigateur : la validation reste serveur.
// L index des syllabes jouables est calcule une seule fois au chargement.

const M = [];

M.push(`
abaisser abandon abandonner abattre abeille abime abolir abondant abonner abord
aborder aboutir aboyer abri abricot abriter absence absent absolu absorber
abstrait absurde abuser accabler acceder accelerer accent accepter acces
accident acclamer accord accorder accrocher accueil accueillir accuser achat
acheter achever acide acier acompte acquerir acrobate acte acteur actif action
activer activite actuel adapter addition adepte adhesif adieu adjectif admettre
administrer admirer adolescent adopter adorer adosser adresse adroit adulte
adverbe adversaire aerer aeroport affaire affamer affiche afficher affirmer
affluent affreux afin agacer agence agenda agent agile agir agiter agneau
agrafe agreable agresser agricole agriculteur aide aider aigle aigre aiguille
aile ailleurs aimable aimant aimer aine ainsi air aise ajouter ajuster alarme
album alcool alerte algue aliment allee alleger aller allonger allumer
allumette allure alors alphabet altitude amande amateur ambiance ambition
ambulance amener amer ami amical amitie amour ample ampoule amusant amuser
analyse ananas ancetre ancien ancre ange angle angoisse animal animer annee
anneau annexe anniversaire annonce annoncer annuel annuler antenne anxieux
apaiser apercevoir apparaitre appareil apparence appartement appel appeler
appetit applaudir appliquer apporter apprendre approcher appuyer apres
aquarium arbitre arbre architecte argent argile argument arme armee armoire
arracher arranger arret arreter arriere arrivee arriver arroser article
artisan artiste ascenseur asperge aspirer assaut assemblee asseoir assez
assiette assister association assurer astre astuce atelier athlete atmosphere
atomique attacher attaque attaquer atteindre attendre attention atterrir
attirer attraper auberge aucun audace augmenter auparavant auteur auto autobus
automne automobile autorisation autoriser autoroute autour autre avaler avance
avancer avant avantage avare avec avenir aventure avenue averse avertir
aveugle avion avis avocat avoine avoir avouer avril
`);

M.push(`
bagage bagarre bague baguette baie baigner bain baiser baisse baisser bal
balade balai balance balancer balayer balcon baleine balle ballon banane banc
bandage bande bandit banlieue banque banquet baptiser barbe barque barrage
barre barrer barriere bas base basket bassin bataille bateau batiment batir
baton battre bavard bavarder beau beaucoup beaute bebe bec becher beige belle
benefice berceau berger besoin bete betise beurre biberon bibliotheque
bicyclette bien bientot biere bijou bilan billet biologie biscuit bisou bizarre
blague blanc blanchir ble blesser blessure bleu bloc blond bloquer blouson
bobine boeuf boire bois boisson boite bol bombe bon bonbon bond bondir bonheur
bonjour bonnet bonsoir bord border bordure borne botte bouche boucher bouchon
boucle boue bouee bouger bougie bouillir boulanger boule boulevard boulon
bouquet bourse bousculer bout bouteille boutique bouton boxe branche bras
brasser brave bref bretelle brillant briller brin brindille brique briser
brochure broder bronze brosse brosser brouillard bruit bruler brun brusque
brute budget buffet buisson bulle bulletin bureau bus but butte buvard
`);

M.push(`
cabane cabine cable cacao cache cacher cadeau cadre cafe cage cahier caillou
caisse calcul calculer calendrier calme calmer camarade cambrioler camion
campagne camper camping canal canape canard candidat canne canon cantine
caoutchouc capable capitaine capital capot capter capuche car caractere
caravane carbone caresse carnaval carnet carotte carre carreau carrefour
carriere carte carton cas case casier casque casser casserole catalogue
categorie cause causer cave caverne ceinture celebre celebrer celui cendre
centaine centime centimetre central centre cependant cercle cereale cerf
cerise certain certificat cerveau cesser chacun chagrin chaine chair chaise
chaleur chambre chameau champ champignon chance chandelle changement changer
chanson chant chanter chantier chapeau chapitre chaque charbon charge charger
chariot charmant charme charpente chasse chasser chat chateau chaud chauffage
chauffer chauffeur chaussette chaussure chauve chef chemin cheminee chemise
chene cher chercher cheval cheveu cheville chevre chez chien chiffon chiffre
chimie chocolat choisir choix chose chou chuchoter chute cible ciel cigale
cigogne cil cimetiere cinema cinq circuit circuler cirque ciseau citation cite
citer citoyen citron civil clair clairiere clameur clan claque classe classer
clavier clef client clignoter climat clinique cloche clocher cloison clou club
cocher cochon code coeur coffre cogner coiffer coiffure coin colere colis
collant colle collectif college coller collier colline colonie colonne
combattre combien comble comedie comique commande commander comme commencer
comment commerce commettre commode commun compagnie comparer complet complexe
compliment comporter composer comprendre compresse compter comptoir concert
concevoir concombre concours concret concurrent condition conducteur conduire
conduite confiance confier confire confiture confort congeler connaissance
connaitre conquerir conseil conseiller consentir conserve considerer consister
console consommer constant construire consulter contact conte contenir content
contenu continuer contour contrat contre controle convaincre convenir
conversation copain copie copier coq coque coquille corbeau corbeille corde
cordon corne corps correct corriger costume cote coton cou couche coucher
coude coudre couler couleur couloir coup coupable coupe couper cour courage
courant courbe courir couronne courrier cours course court cousin coussin
couteau couter coutume couture couvercle couverture couvrir crabe craie
craindre crainte cravate crayon creer creme creuser creux crevette cri crier
crime crise cristal critique crochet croire croiser croissant croix croquer
cru cruel cube cueillir cuiller cuir cuire cuisine cuisiner cuisse cuivre
culture curieux cycle cygne
`);

M.push(`
dame danger dangereux dans danse danser date dauphin debarrasser debat debout
debut debutant decembre decevoir dechet dechirer decider decision declarer
decoller decor decorer decouper decourager decouverte decouvrir decrire dedans
defaire defaite defaut defendre defense defi defiler definir degat degre
dehors deja dejeuner delai delicat delice demain demande demander demarrer
demenager demi democratie demolir dent dentiste depannage depart departement
depasser depecher depense depenser deplacer deposer depuis deranger dernier
derriere des descendre description desert desirer desordre dessert dessin
dessiner dessous dessus destin detail detective detendre detester detruire
dette deux devant developper devenir deviner devoir diable dialogue diamant
dictee dictionnaire different difficile digerer digne diminuer dinde diner
diplome dire direct directeur direction diriger discours discret discussion
discuter disparaitre disque distance distraire divers diviser docteur document
doigt domaine domicile dominer dommage donc donner dont dorer dormir dos
dossier douane double doubler douce douceur douche douleur doute douter doux
douzaine dragon drame drap drapeau dresser drogue droit drole du dur duree
durer dynamique
`);

M.push(`
eau echange echanger echapper echec echelle echo eclair eclairer eclat eclater
ecole economie ecorce ecouter ecran ecraser ecrire ecriture ecrivain ecurie
edifice education effacer effet effort egal egalement eglise elan elargir
electricite electrique elegant element elephant eleve elever elire eloigner
emballer embarquer embrasser emission emmener emotion empecher empire emploi
employer emporter emprunter encore encre endormir endroit energie enfance
enfant enfermer enfin enfoncer enfuir engager engin enlever ennemi ennui
enorme enquete enregistrer enseigner ensemble ensuite entendre enterrer entier
entourer entrainer entre entree entreprise entrer enveloppe envie environ
envoyer epais epaule epee epicerie epine epingle epoque epouser epreuve
epuiser equilibre equipe equipement erreur escalier escargot espace espece
esperer espion espoir esprit essai essayer essence essentiel essuyer est
estimer estomac etage etaler etat ete eteindre etendre eternel etincelle
etoile etonner etouffer etrange etranger etre etroit etude etudiant etudier
evenement eventail evident eviter evoluer exact examen examiner excellent
excuse excuser exemple exercice exiger exister experience expliquer explorer
exploser exportation exposer exprimer extraire extreme
`);

M.push(`
fabrique fabriquer face fache facile facon facteur facture faible faim faire
falaise falloir fameux famille fanfare fantaisie fantome farine fatigue
fatiguer faute fauteuil faux faveur favori fee feminin femme fendre fenetre
fer ferme fermer fermier feroce fete feter feu feuille feutre fevrier ficelle
fiche fidele fier fierte fievre figure fil file filer filet fille film fils
filtre fin final finir fixer flamme flaque flatter fleche fleur fleurir
fleuve flocon flotte flotter flute foi foie foin fois folie fonce foncer
fonction fond fondre fontaine football force forcer foret forme former
formidable formule fort fortune fosse fou fouet fouiller foule four fourchette
fourmi fourrure foyer fracture fragile frais fraise framboise franc franchir
frapper frein freiner frere friandise frigo frire frisson frite froid fromage
front frontiere frotter fruit fuir fuite fumee fumer furieux fusee fusil futur
`);

M.push(`
gagner gai gain galerie galet galop gamin gant garage garantie garcon garde
garder gardien gare garer gateau gauche gaz gazon geant gel geler general
genereux genial genou genre gens gentil geographie geste gibier gifle
gigantesque gilet girafe glace glacer glisser gloire golf gomme gonfler gorge
gorille gourmand gousse gout gouter goutte gouvernement grace grade grain
graine graisse grammaire gramme grand grandir grange gras gratuit grave
gravier grec greffe grele grenier grenouille griffe grillage grille griller
grimper gris grogner gronder gros grosseur grotte groupe grue guepe guere
guerir guerre guetter guichet guide guider guitare gymnastique
`);

M.push(`
habiller habit habitant habiter habitude hache haie haine haleine halte
hameau hamster hanche handicap hangar hardi harmonie hasard hate hausse haut
hauteur herbe herisson heritage heros hesiter heure heureux heurter hibou
hier histoire hiver homme honnete honneur honte hopital horaire horizon
horloge horreur hors hotel houle huile huit humain humeur humide humour hurler
hutte hygiene hymne
`);

M.push(`
ici idee identifier identite ignorer ile illustration image imaginer imiter
immense immeuble immobile impatient important imposer impossible impression
imprimer inconnu incroyable indien indiquer individu industrie infini
influence information informer ingenieur initiale injuste innocent inonder
inquiet inscrire insecte insister inspecter installer instant instruire
instrument insulte intelligent intention interdire interesser interieur
international interroger interrompre intervalle intime introduire inutile
inventer inverse inviter iris ivoire
`);

M.push(`
jaloux jamais jambe jambon janvier jardin jardinier jaune jeter jeu jeudi
jeune jeunesse joie joindre joli joue jouer jouet joueur jour journal journee
joyeux juge juger juillet juin jumeau jument jungle jupe jurer jus jusque
juste justice
kilo kilogramme kilometre kiosque
`);

M.push(`
laboratoire lac lacer lacet lache lacher laid laine laisser lait laitue lame
lampe lancer langage langue lapin large larme laver leche lecon lecteur
lecture legende leger legume lendemain lent lenteur lettre leur lever levre
liberte librairie libre licorne lien lier lieu ligne limace lime limite
limiter linge lion liquide lire lisse liste lit litre livre livrer local
locomotive loger logement logique loi loin lointain loisir long longer
longtemps longueur loterie loup lourd loyal lueur luge lumiere lundi lune
lunette lutte lutter luxe lycee
`);

M.push(`
machine magasin magie magique magnifique mai maigre maille main maintenant
maintenir maire mairie mais maison maitre majeur mal malade maladie maladroit
malgre malheur malin maman manche mandarine manege manger manier maniere
manifester manoeuvre manquer manteau manuel maquette marbre marchand marche
marcher mardi maree marge mari mariage marier marin marmite marque marquer
marron mars marteau masque masse massif match materiel matiere matin mauvais
maximum mecanique mechant meche medaille medecin medicament meilleur melange
melanger melon membre meme memoire menace menacer menage mener mensonge
menthe mentir menu mer merci mercredi mere merite meriter merveille message
mesure mesurer metal meteo methode metier metre mettre meuble meunier
microbe midi miel mieux milieu militaire mille million mince mine mineral
minuit minute miracle miroir mission mode modele moderne modeste moelle moine
moins mois moisson moitie moment monde monnaie monsieur montagne montant
monter montre montrer monument moquer morceau mordre mort mot moteur motif
moto mou mouche mouchoir moudre mouiller moule moulin mourir mousse moustache
mouton mouvement moyen muet mur mure murmure muscle musee musicien musique
mystere
`);

M.push(`
nage nager nain naissance naitre nappe narine natation nation nature naturel
naufrage navet navire ne neige neiger nerf nerveux net nettoyer neuf neveu nez
niche nid niveau noce noel noeud noir noisette noix nom nombre nombreux nommer
nord normal note noter notion nourrir nourriture nouveau nouvelle novembre
noyau noyer nuage nuance nuit numero nuque
`);

M.push(`
obeir objet obliger obscur observer obstacle obtenir occasion occuper ocean
octobre odeur oeil oeuf oeuvre offre offrir oignon oiseau ombre omelette on
oncle ongle opera operation opinion opposer or orage orange orchestre ordinaire
ordinateur ordonner ordre oreille organe organiser orgue orient original
orphelin orteil os oser otage oter oublier ouest oui ours outil ouvert
ouverture ouvrier ouvrir ovale
`);

M.push(`
page paille pain paire paix palais pale palier palme panier panique panne
panneau pantalon papa papier papillon paquet par parachute paradis paraitre
parapluie parc parcourir pardon pareil parent parfait parfois parfum parier
parking parler parmi parole part partager parti participer particulier partie
partir partout pas passage passager passer passion pate patience patient
patin patinoire patron patte paume paupiere pause pauvre pave payer pays
paysage paysan peau peche pecher pedale peigne peindre peine peintre peinture
pelle pelouse pencher pendant pendre penible pensee penser pente percer
perdre perdu pere permettre permis perroquet persil personne persuader perte
peser petale petit petrole peu peuple peur peut phare pharmacie phase
phenomene philosophie photo phrase physique piano piece pied piege pierre
pieton pigeon pile pilote pin pince pinceau pincer pion pipe piquer piqure
pire piscine piste pitie pizza placard place placer plafond plage plaindre
plaine plainte plaire plaisir plan planche plancher planete plante planter
plaque plastique plat plateau plein pleurer pleuvoir pli plier plomb plonger
pluie plume plupart plus plusieurs plutot poche poele poeme poids poil poing
point pointe pointu poire poireau poison poisson poitrine poivre poli police
politique pomme pompe pompier pont porc port porte porter portrait poser
position posseder possible poste pot poteau pou poubelle pouce poudre poule
poulet poumon poupee pour pourquoi pourtant pousser poussiere poutre pouvoir
prairie pratique pre precieux precis preferer premier prendre prenom preparer
pres presence present presenter presque presser pret pretendre preter preuve
prevenir prevoir prier priere primaire prince principal printemps prison prive
prix probleme prochain proche produire produit professeur profit profiter
profond programme progres projet promenade promener promettre prononcer
proposer propre proprete proteger prouver province provoquer prudent public
puce puis puiser puissance puits pull punir pupitre pur puree
`);

M.push(`
quai qualite quand quantite quart quartier quatre que quel querelle question
queue qui quiche quille quitter quoi quotidien
`);

M.push(`
raccourci race racine raconter radar radio radis rage raide raie rail raisin
raison ramasser rame ramener ramer rampe rang ranger rapide rappeler rapport
raquette rare raser rasoir rat rateau rater rattraper rayon rayure reaction
realiser recent recette recevoir rechauffer recherche recit reclamer recolte
recommencer recompense reconnaitre record recouvrir recreation reculer
redouter reduire reel refaire reflechir reflet reforme refrain refuge refuser
regard regarder regime region registre regle regler regne regretter regulier
reine rejoindre relation relever relier remarquer rembourser remede remercier
remettre remonter remplacer remplir remuer rencontre rencontrer rendre
renforcer renoncer renseigner rentree rentrer renverser renvoyer repaire
repandre reparer repas repasser repeter repondre reponse reportage repos
reposer repousser reprendre representer reproche reptile requin reseau
reserve reserver residence resister resoudre respect respirer responsable
ressembler ressort restaurant reste rester resultat retard retenir retirer
retour retourner retrouver reunion reunir reussir reussite reve reveil
reveiller revenir rever revoir revolution revue riche richesse rideau
ridicule rien rigide rigoler rincer rire risque risquer rivage rive riviere
riz robe robinet robot roche rocher roi role roman rond ronfler ronger rose
roseau rosee rossignol roue rouge rougir rouiller rouleau rouler route royaume
ruban rude rue ruelle ruine ruisseau rumeur rural ruse rythme
`);

M.push(`
sable sabot sac sage saigner sain saison salade salaire sale saler salir salle
salon saluer salut samedi sandwich sang sanglier sanglot sans sante sapin
sardine satisfaire sauce saucisse sauf saumon saut sauter sauvage sauver
savant saveur savoir savon scene science scier scolaire seau sec secher second
secouer secours secret secretaire section securite seigneur sein sejour sel
selle selon semaine semblable sembler semelle semer sens sensible sentier
sentiment sentir separer septembre serie serieux serpent serre serrer serrure
serveur service servir seuil seul seulement severe siecle siege sien sieste
signal signaler signe signer silence silhouette simple singe sirene sirop site
situation situer ski social societe soeur soif soigner soin soir soiree sol
soldat soleil solide solitude solution sombre somme sommeil sommet son sondage
songer sonner sonnerie sorcier sort sorte sortie sortir sou souci soucoupe
soudain souffle souffler souffrir souhait souhaiter soulager soulever soulier
souligner soupe souper soupir source sourcil sourd sourire souris sous
soutenir souvenir souvent spectacle sport stade stage station statue stop
store studio stupide stylo succes sucer sucre sud suffire suggerer suite
suivant suivre sujet superbe superieur supermarche supplier supporter
supposer sur surface surprendre surprise surtout surveiller survivre syllabe
symbole systeme
`);

M.push(`
table tableau tablette tablier tabouret tache tacher taille tailler taire
talon tambour tampon tandis tante tapage tape taper tapis taquiner tard tarte
tas tasse taureau taux taxi technique teindre teinte tel telephone television
tellement temoin tempete temps tendre tenir tennis tension tente tenter
terminer terrain terrasse terre terrible territoire tete texte theatre theme
theorie ticket tiede tige tigre timbre timide tirer tiroir tissu titre toile
toilette toit tomate tombe tomber ton tonne tonnerre torchon tordre tornade
tortue total toucher toujours tour tourner tournevis tournoi tousser tout toux
tracer tracteur trace tradition traduire trafic tragedie trahir train trainer
trait traiter trajet tranche tranquille transformer transport travail
travailler travers traverser tresor tresse tribu tricher tricot trier triomphe
triste trois tromper trompette tronc trop trottoir trou troupeau trousse
trouver truc truite tuer tulipe tunnel tuyau type
`);

M.push(`
uni uniforme union unique unir unite univers universite urgent usage user
usine ustensile utile utiliser
vacances vache vague vaincre vaisselle valable valise vallee valoir valse
vanter vapeur varier vase vaste veau vedette vegetal vehicule veille veiller
velo velours vendre vendredi venir vent vente ventre verbe verger vernis
verre vers verser vert vertu veste vetement veuf viande victime victoire vide
vider vie vieux vif vigne village ville vin vinaigre violence violent violet
violon virage virer visage visite visiter vitamine vite vitesse vitre vitrine
vivant vivre vocabulaire voici voie voila voir voisin voiture voix vol volant
volcan voler volet voleur volume vote voter vouloir voute voyage voyager
voyageur vrai vue vulgaire
wagon western yaourt yeux zebre zero zone zoo
`);

// Mots plus longs et derives : ils donnent de l air aux syllabes rares.
M.push(`
accompagner adorable affronter agitation ailleurs allumage amoureux
apparaitre applaudissement apprentissage arrosoir assurance attentif autrefois
balayette bandeau barbecue bavardage bibliothecaire bienvenue bijoutier
bonhomme boulangerie bricolage brouette bruyant cachette calculatrice
camionnette carrelage casquette catastrophe champion chandail charcuterie
charpentier chatouiller chaudiere chocolatier citrouille clarinette classeur
clignotant coccinelle coiffeur colorier combinaison commercant compagnon
compliquer confiserie congelateur consigne contrainte convoquer copieux
cordonnier courgette couturier crayonner crepuscule crocodile croustillant
cuisiniere culotte curiosite debarquer decoration degourdi delicieux demarche
dentelle depanner detacher detourner devanture diligence dinosaure directement
distributeur dortoir doucement ebouriffer echafaudage eclabousser ecolier
ecureuil egoutter elastique embouteillage emmenager empiler encourager
energique enjamber ennuyeux enrouler entasser entracte entretenir epicier
epuisette equipier escalade escapade essoufle etagere etendue etiquette
etourdi eventuel exagerer excursion expedier explication fabuleux facilement
farfelu farouche feuillage figurine flamboyant fleuriste flotteur fondation
forgeron fourgon fournir fraicheur franchement frigorifique frisette
frontalier fruitier fugitif gaufre gazouiller generosite gentiment glissade
gouttiere gracieux grandement grenadine grillon grimace grognon guirlande
habilement hebergement heureusement hirondelle immediat imprudent incendie
infirmier installation instituteur interrupteur jardinage joyeusement jumelles
kermesse laborieux lampadaire lanterne largement lentement libellule librement
locataire longuement luciole magicien maisonnette manifestation maquillage
marchandise marguerite mariniere matelas mecanicien menuisier merveilleux
moissonneuse montagnard moucheron moustique naturellement navigateur
normalement obscurite occupation orangeade ornement pantoufle papeterie
parfaitement partenaire passerelle patiemment patisserie pelerinage pepiniere
perceuse pharmacien photographe pianiste pincette plaisanter planeur
plantation plombier plumeau poignee poivron poliment portefeuille poudrier
poussette precisement prefecture presentation prisonnier prochainement
proprement puissamment radieux rafraichir ramassage rangement rapidement
ravissant rayonner recemment refroidir regulierement remorque renard
renouveler reparation repartition ressemblance restaurateur retablir revendeur
ricochet rigolade roulotte routier sablier saladier sauvetage savonnette
scintiller sculpteur secretement selection sentinelle serrurier severement
silencieux simplement soigneusement solidement sonnette souriant souterrain
sportif subitement sucrerie suffisamment surement surveillance tapisserie
tendrement terriblement tirelire tondeuse torrent tournesol traineau
tranquillement trappe travailleur tremblement tricoter trompeur trousseau
tuyauterie vagabond vainqueur vaisselier vaguement vendeur ventilateur verglas
verrouiller vibration vigilant vinaigrette violemment visiteur voilier
volaille volontiers vraiment
`);

// Formes conjuguees courantes : sans elles, le joueur qui tape « mangent »
// se ferait refuser un mot parfaitement francais.
M.push(`
aime aimait aimera arrive arrivait attend attendait avais avait avance
brille brillait cache cachait cassait casse chante chantait chantera cherche
cherchait choisit commence commencait compte comptait connait construit
coupait coupe court courait couvre croit croyait danse dansait demande
demandait descend descendait devient devenait devait dessine dessinait
dit disait donne donnait dorment dormait ecoute ecoutait ecrit ecrivait
entend entendait entre entrait envoie envoyait essaie essayait etait etaient
etudie etudiait explique expliquait fabrique ferme fermait finit finissait
frappe frappait gagne gagnait garde gardait grandit grimpe grimpait
habite habitait ignore imagine imaginait invite jette jetait joue jouait
jouera laisse laissait lance lancait lavait lave leve levait lisait
mange mangeait mangera marche marchait mesure mesurait monte montait montre
montrait nage nageait nettoie oublie oubliait ouvre ouvrait parle parlait
parlera part partait passe passait pense pensait perd perdait plante
plantait pleure pleurait porte portait pose posait pousse poussait prend
prenait prepare preparait quitte quittait raconte racontait ramasse range
regarde regardait remplit rentre rentrait repond repondait reste restait
retourne reussit reveille revient rigole roule roulait saute sautait
savait sentait serre serrait sonne sonnait sort sortait souffle soulevait
suit suivait tape tapait termine terminait tient tenait tirait tire tombe
tombait touche touchait tourne tournait traverse travaille travaillait
trouve trouvait utilise vendait vend venait vient veut voulait voit voyait
vole volait voulu venu tenu perdu rendu battu connu recu vecu couru
fini choisi grandi rempli senti sorti parti dormi servi ouvert offert
souffert couvert decouvert appris compris surpris assis mis permis promis
transmis conduit produit construit detruit reduit ecrit decrit inscrit
`);

// Encore des mots courants : noms, adjectifs, adverbes du quotidien.
M.push(`
accolade acharne acidule acrobatie affection agneler aigrelet ailette airelle
alentour alliance allumeur alouette amandier amitieux ampleur amplement
ancrage anguille animation anneler annuaire apaisant aplatir appareiller
appetissant applique apprivoiser aquarelle arachide arceau ardeur ardoise
arrosage artichaut asperger assaisonner assemblage assiette assouplir
attelage attendrir aubergine audition augmentation aureole autocollant
avalanche avancement aventurier averti aviateur avoisiner balancoire baladeur
baleinier ballade bambou banderole banquise baraque barboter barbouiller
bardeau bariole baromètre barricade bascule bassine batisse batonnet
bavarois bavette becasse bedaine beignet berlingot bermuda betterave
biberonner bicoque bidon bienfait bigoudi billard binocle biscotte bistrot
bivouac blancheur blanchisserie blindage blocage blondeur blouse bobinage
bocal boisement boiterie bolide bonasse bondissant bordelais borderie
bosquet bossage botanique bouchee boucherie bouclier bouderie boudin
bouffee bougeoir bouilloire boulette boulon bourdon bourgeon bourrasque
boursoufle boussole boutonner boyau bracelet braise branchage brancher
brasier brassard brassiere bredouille bretzel bricoler bridge brigade
brillance brindille briquet brisant brocante broche brochette brodeur
bronzage brouillon broussaille bruine brumeux brunir brushing bucheron
buvette cabanon cabriole cachemire cachot cadenas cadrage cafetiere cageot
cagoule caillasse cajoler calanque calotte camelot campement canaliser
candidature caneton canevas caniche canicule canneberge cantonner capuchon
carafe caramel carapace cardigan carence caresser carillon carnassier
carrosse cartable cartouche cascade casserole cataplasme cavalier ceinturer
celeri cellier cendrier cerceau cerclage cerfeuil cerisier chagriner chaland
chalet chaloupe chalumeau chamailler chamois chandelier chantonner chapelle
charade charbonnier chardon chariot charrette chataigne chaudron chaumiere
chausson chaussure chavirer chemisier chenille chevalet chevelure chevron
chiffonner chignon chipoter chocolatier chorale chouette chuchotement cintre
cirage ciseler citerne clairon clapoter claquement clavecin clemence
clocheton cloporte clouer cocarde cochonnet cocotier coffret cognac coiffe
colimacon collation colombe colonel coloris comestible commerage compotier
comptine concombre confetti confidence congere conserverie consoler
contrebasse contremaitre coquelicot coquetier corbillard cordage cornemuse
cornichon corolle corsage cortege cotelette couchette coulisse coupole
courbature couronnement courtoisie coussinet couvee couvent crampon crapaud
cravache creativite credence cremerie creneau crepon cresson creusement
criquet crissement croisade croquette crotale croupion cruche crustace
cueillette cuillere cuirasse culbute cultiver cuvette cyclone
`);

M.push(`
abricotier absolument accessoire accompagner accomplir accroitre acharner achat
acquis actualite additionner adorable aeration affaiblir affectueux affronter
agacement agrandir agrement aiguiser ailier aimant ajourner alimentation allonge
alpiniste amaigrir amelioration amenagement amoureux amplifier amusement analyser
ancrage anecdote angoisser animation annoter anticiper apaisement aplatir apporter
approbation approuver appuie aquarelle arbitrage arborer archipel ardoise argenter
armature aromate arrondir arroseur artichaut asperger aspirateur assainir assaisonner
assemblage assiduite assombrir assortir assouplir astronaute atelier atomique attabler
attacher attarder attendrir atterrir attirance attraper aubaine aubergine audace
augmenter aumone auteur autobus autocar autographe automate automne autoriser autoroute
avaler avancer avantage avarie aventurier averse avertir aveugler aviateur avion
aviron avocat avoine avouer azalee babiller bagage bagarre baguette baignade baigner
bailler baisser balade balancoire balayer balcon baleine ballade ballon banane bandeau
banderole banlieue banquet barbecue barque barrage basculer bassine bataille bateau
batiment batterie bavarder bazar beaute bebe becane becher beignet belette belier
benevole benir berceau bercer berger besogne betail betise beurrer biberon bibliotheque
bicyclette bidon bijou bilan billard billet biscotte biscuit bistrot blaguer blanchir
blesser bleuet blinder bloquer blouson bobine bocal boisson boiter bolide bonbon
bondir bonheur bonhomme bonnet bordure borner bosse botanique botte boucher bouchon
boucle bouder boueux bouffee bougeoir bougie bouillir boulanger boulevard bouleverser
boulon bouquet bourdon bourgeon bourrasque boussole bouteille boutique bouton boxeur
bracelet braise brancher brandir branler braquer brasser bravoure brebis bredouille
brevet bricoler brigade briller brindille brioche briquet brochure broder bronzer
brosser brouette brouillard broyer bruiner brulure brumeux brunir brusquer bruyant
bucheron buffet buisson bulletin bureau buste butiner buvette cabane cabine cabosser
cacahuete cachette cadavre cadeau cadenas cadran cafetiere cageot cahier caillou
caisse calculer calendrier caleçon caliner calmer calquer cambrioler camionnette
campagne camping canapé canard candidat caneton canicule canoter cantine caoutchouc
capable capitaine capot caprice capturer caramel caravane carburant caresser cargaison
caricature carnaval carotte carrefour carriere cartable cartouche cascade caserne
casquette casserole catalogue catastrophe cathedrale cauchemar causerie cavalier caverne
ceinture celebre celebrer celibataire cendrier centaine centrale cependant cercueil
cerealier cerise certificat cerveau chagrin chaleur chalumeau chameau champignon
chandelle chantier chapeau chapiteau charbon charcuterie chariot charpente charrette
chasseur chataigne chaudiere chaussette chaussure chauffage chauffeur chauve chavirer
chemise cheminee chenille chequier chercheur cherir chevalier cheveu chevre chiffon
chiffre chimique chirurgien chocolat chorale chouette chuchoter cimetiere cinema
cintre circuler ciseau citadin citerne citoyen citrouille clairiere clapoter clarinette
classeur clavier clignoter climatiser clocher cloison clotures clouer cocotte coffret
cogner coiffeur coincer colere colline colombe colorier colporter combattre comedie
commerce commode commune compagnon comparer compasser complice comportement composer
comprendre comprimer compteur concombre concours concierge condamner conduite confiance
confiture congeler conjuguer connaissance conquerir conseiller conserve consoler
consommer constater construire consulter conteneur contourner contrarier contribuer
convaincre convenir copeau copier coquelicot coquillage cordage cordonnier corbeau
corbeille cornemuse corniche corriger costume cotelette cotisation coucher coudre
couette couleuvre coulisse couloir coupable couperet coupole courageux courgette
couronne courrier courtiser cousin coussin couteau couturier couvercle couverture
crabe cracher craie craquer cravate crayon creation creche creuser crevette cribler
crinière crique crisper cristal critiquer crochet croiser croquer crotte croute
cueillir cuillere cuisiner cuisson cuivre culotte cultiver curieux curseur cyclone
`);

M.push(`
dactylo daigner damier danseur dauphin debarquer debarrasser debattre debiter deblayer
deborder deboucher debout debrouiller debuter decalage decamper decevoir dechaine
decharge dechiffrer dechirer decider declarer declencher decoiffer decoller decorer
decouper decourager decouverte decrire decrocher dedaigner dedier deduire defaire
defendre defiler definir deformer degager degivrer degonfler degouter degrader deguiser
dejeuner delaisser delicat delivrer demander demarche demarrer demenager demolir
demontrer denicher denoncer depanner departir depasser depecher dependre depenser
deplacer deplier deposer depouiller deprimer deraper derniere derouler deranger
derriere desaccord descendre desert desesperer deshabiller designer desirer desobeir
desordre dessert dessiner destin detacher detailler detendre detenir deteriorer
determiner detester detourner detruire dette deuxieme devaler devancer devenir deviner
devisser devoiler devouer diagonale dialogue diamant dictee dieteticien difference
difficile diffuser digerer digne diminuer diplome diriger discours discuter disparaitre
disperser disponible disputer disquette dissiper distance distraire distribuer diviser
docteur document dodeliner doigter domaine domestique dominer dompter donateur dorloter
dormeur dossier douane doublure douceur douche douleur doute douzaine dragee drapeau
dresser droguerie droiture drolerie duvet dynamique ebahir ebauche eblouir ebranler
ecaille ecarter echafaudage echange echapper echarpe echauffer echeance echelon echouer
eclabousser eclaircir eclater eclipse ecluse ecolier economie ecorce ecorcher ecosser
ecouler ecraser ecrevisse ecrire ecrivain ecureuil ecurie edifice editer eduquer
effacer effaroucher effectuer effervescent effleurer effondrer efforcer effrayer
egaler egarer egayer eglantine egoutter elancer elargir electricien elegant elephant
elevage elever eliminer eloigner emballer embarquer embellir emboiter embouteillage
embrasser emerveiller emietter emigrer emission emmener emotion emousser emparer
empecher empiler emplacement employer empoigner emporter empreinte emprisonner emprunter
encadrer encaisser enchanter enclos encourager endommager endormir endroit endurer
energie enerver enfermer enfiler enflammer enfoncer enfouir engager engin engloutir
engourdir enjamber enlever ennuyer enorme enquete enraciner enregistrer enrhumer enrichir
enrouler enseigner ensemble ensoleille entamer entasser entendre enterrer entetement
enthousiasme entier entonnoir entourer entrainer entrepot entreprise entretenir entrevoir
envahir enveloppe envier environ envoler envoyer epaisseur epargner eparpiller epaule
epeler eperon epervier epicerie epinard epingle eplucher eponge epoque epouse epouvante
eprouver epuiser equilibre equipage equiper equitation erable errer eruption escabeau
escalade escalier escargot escarpin esclave escorte espace espadrille esperance espiegle
esquisser essaimer essayer essence essorer essoufflé essuyer estimer estomac estrade
etaler etaler etancher etendre eternel eternuer etinceler etiquette etirer etoffe etoile
etonner etouffer etourdir etrange etrangler etrenner etriller etroit etude evacuer
evader evanouir eveiller evenement eventail eventuel evidence eviter evoluer evoquer
exagerer examiner excellent exciter exclamer excursion excuser executer exemplaire
exercer exhiber exiger exister expedier experience expirer expliquer explorer exploser
exporter exposer exprimer extraire fabrication fabuleux facade facette facile faciliter
facteur facture faiblesse faience faillir faisceau falaise familier faneur fanfare
fantaisie fantome farceur farine fatigue faucher faufiler fauteuil favorable feconder
feliciter feminin fendiller fenouil ferique fermeture fermier ferraille fertile festin
festival feuillage feuilleter feutre feverole ficeler fichier fideliser fierte fievre
figurer filature filet filiale filmer filtrer financer finesse finition flacon flageolet
flairer flamber flamant flanelle flaner flaque flatter flechir flemme fletrir fleurir
flocon florissant flotter flouer fluide flute foisonner folie foncer fonctionner fondre
fontaine footballeur forcer forestier forgeron formidable formuler fortifier fossette
foudroyer fouetter fougere fouiller foulard fourchette fourmiller fourneau fournir
fourrure foyer fracasser fraicheur framboise franchir frapper fraude fredonner freiner
fremir frequenter fretiller friandise fringale friper friser frisson frittage froisser
fromager froncer frotter fructifier fugitif fumee fumier funambule fureter furieux
fuseau fusiller futile
`);

M.push(`
gachette gadget gaffeur gagnant galerie galet galoper gambader gamelle gaminerie
gangster garage garantir garcon gardien garnir gaspiller gateau gauffre gazelle gazon
gazouiller geler gemir gencive gendarme generation genereux genou gentillesse geographie
geometrie geranium gerbe gesticuler gibier gicler gifler gigoter gigantesque gilet
girafe girouette givrer glacon glaner glisser globe gloire glouton gobelet goeland
gommer gonfler gorgee gosier goudron gouffre goulot gourmand gousse gouter goutte
gouvernail gracieux gradin graffiti grainer graisser grammaire grandir granit grappiller
gratter graver gravir gravure grelot grelotter grenade grenier grenouille griffonner
grignoter grillage grimace grimper grincer grippe griser grognon gronder grossir
grotte grouiller grumeau guepe guerir guerrier guetter gueuler guichet guidon guirlande
guitare gymnase habile habiller habitant habituer hachoir haleine halte hameau hamster
hangar hanter harceler hardiesse hareng haricot harmonie harnais hasarder hausser
hautain hebergement hectare helice hemisphere herbage herisson heriter hermine hesiter
heurter hibou hirondelle hisser hiverner hommage honnete honorer horaire horizon
horloge hospitalier hotelier houleux huiler humain humecter humeur humide humoriste
hurler hutte hydrater hygiene hymne idealiser identifier ignorer illuminer illusion
illustrer imaginer imbattable imiter immeuble immobile impatient imperial implanter
important imposer impression imprimer improviser impulsif inattendu incendie incident
incliner inclure inconnu incroyable indice indiquer indispensable individu industrie
infatigable infecter infini infirmier influence informer infuser ingenieur ingredient
inhabituel initiale injuste innocent inonder inoubliable inquieter inscrire insecte
insister inspecter inspirer installer instant instituteur instruire instrument insulter
intelligent intense interdire interesser interieur interroger interrompre intervenir
intituler intriguer inventer inverser investir inviter irriter isolant itineraire
jaillir jalonner jaloux jardinier jardiner jarret jaunir javelot jeunesse jonglerie
jongler jonquille joueur jouissance journalier journaliste joyeux jubiler jumeau
jumelle jurer justesse justifier kilogramme kilometre klaxonner laborieux labourer
labyrinthe lacer lachete lacune laitier lambeau lamentable laminer lampadaire lancement
langage languir lanterne lapider lardon largeur larguer larme lasser lavabo lavande
lecteur legende legerete legume lendemain lentille lessive lettrine levier levraut
liberer libraire licorne lierre lieutenant lignage limace limiter limonade linceul
lingerie liquide lisiere lisser listage literie litige littoral livraison livrer
locataire locomotive logement logique lointain loisir longer longueur lorgner lotion
louange loucher louer loufoque loupe lourdeur lucarne lucide lueur luge lugubre luire
luisant lumiere luminaire lunaire lunette lustrer lutter luxueux machinerie machoire
maconner madeleine magasin magicien magnifique maigrir maillot maintenir mairie
maitriser majestueux majorite maladie maladroit malchance malheur malice mallette
malmener maltraiter mamelle manche mandarine manege manette maniere manifester manipuler
mannequin manoeuvre manquer manteau manuel maquiller maraicher marathon marchander
marecage margarine marguerite marinade marionnette maritime marmelade marmite marquer
marraine marteau martyre masquer massacre masser mastiquer materiel maternelle matiere
matinal maudire mecanicien mechant meconnaitre medaille medecin mediter mefiance
meilleur melanger melodie melon membrane memoire menacer menage menotte mensonge
mentonniere menuisier meprendre mepriser merveille messager mesurer meteorite methode
metier metrage meuble meugler meunier meurtrir microbe midi mielleux mignon migrateur
mijoter militaire millier mimique mincir mineral miniature minuit minutieux miracle
mirage miroiter miser missile mitraille mixer mobilier moderne modifier moelleux
moindre moineau moisir moisson moitie molaire mollet moment monastere mondial moniteur
monotone monstrueux montagnard monter montrer monument moquer moquette morceau mordiller
morsure mortier morue moucheron mouchoir moudre mouiller moule mouler mousseline
moustache moustique moutarde mouvement moyenne muguet multiplier munir muraille murmure
muscler museau musicien mutiler mystere
`);

M.push(`
nageoire nappe narrateur naseau natation naturel naufrage navigateur naviguer navrer
neanmoins nectar negliger negocier neigeux nerveux nettoyer neuvieme nichoir nickel
noircir noisette nomade nombreux nommer nordique normalement notaire notion nouer
nourrice nourrir nouveaute noyade noyau nuance nuisible numeroter nuptial obeir objecter
obliger obscurcir observer obstacle obstiner obtenir occasion occuper ocean octobre
odeur odorant offenser officier offrande ombrage omelette omettre ondulation opaque
operer opinion opposer optimiste orage orange orateur orchestre ordinaire ordonner
oreiller organiser orgueil orientation originalite ornement orphelin orteil oscar
osciller osselet ouate oublier ouragan ourlet outillage ouvrage ouvrier ouvrir ovation
oxygene pacifique paillasse paillette paisible paitre palace palefrenier palette palissade
palmier paltoquet panache panaris pancarte panier panique panneau panorama pansement
pantalon panthere pantoufle papeterie papillon paquebot paquet paradis parachute
parapluie parasol paratonnerre parcelle parcourir pardonner pareil parenthese paresseux
parfum parier parlement parodie parole parquet parrain parsemer partager partenaire
particulier partisan parvenir passager passerelle passionner pastille patauger patinage
patisserie patrimoine patrouille paturage paupiere pauvrete pavillon paysage paysan
peage peaufiner pecher pedaler peigner peintre pelage pelerin pelican pellicule pelouse
peluche penalite pencher pendule penetrer peniche pensee pension pente percer percevoir
percher percuter perdrix perfection perforer periode perir perle permanence permettre
perroquet perruche persil persister personnage persuader perturber peser pessimiste
petiller petrir peuplade peuplier phalange phare pharmacie phenomene photographe phrase
physique pianiste picorer piegeur pierre pietiner pieton pigeon pignon pilier piller
pilote piment pinceau pincer pingouin pioche pionnier piquant piquer piquet piscine
pissenlit pistolet pitie pittoresque pivoine pivoter placard placer plafond plaidoyer
plaindre plaisanter planche plancher planer planete planquer plantation plaquer plastique
plateau plaudir plebiscite pleurer pliage plisser plombier plonger ployer plumage
plusieurs pochette poelon poesie poignard poignee poilu poinçon pointer poireau poirier
poisseux poitrine poivron polaire polir politesse pollen polluer pommade pommier pompier
poncer ponctuel pondre populaire porcelaine portail portefeuille portique portrait poser
positif posseder possible postier potager poteau poterie potiron poubelle pouce poudrer
poulailler poulain poulet poumon poupee poussiere poutre pouvoir prairie pratiquer
precieux precipiter precis predire preferer prelever premier prendre prenom preparer
presenter presque pressentir presser pretendre preter pretexte prevenir prevoir prier
primaire principal printemps priser prisonnier priver probleme proceder prochain
proclamer procurer prodige produire professeur profiter profond programme progresser
projeter promenade promettre prononcer proportion proposer propriete proteger protester
prouver provenir provision provoquer prudence prunier public publier puiser puissance
pulpe pulveriser punaise punir purifier pyjama pyramide quadrille qualifier qualite
quantite quartier quatorze quenelle querelle questionner queue quiconque quinzaine
quittance quotidien rabattre raccommoder raccourcir raccrocher racheter racine raclette
raconter radeau radiateur radieux rafale raffiner rafraichir ragout raidir railler
raisonner rajeunir rajouter ralentir rallonger ramasser rambarde ramener ramier ramollir
ramoner rampe rancune randonnee rangement ranimer rapace rapatrier raper rapiecer
rappeler rapporter rapprocher raquette rarement raser rassembler rassurer ratatouille
rateau rationner rattraper ravager ravin ravioli ravitailler rayonner reagir realiser
rebondir recevoir rechauffer recherche reciter reclamer recolter recommander recompense
reconnaitre recopier recouvrir recreation rectangle reculer redemarrer redescendre rediger
redoubler redouter reduire reeducation refaire referer reflechir reflet reformer refroidir
refuge refuser regaler regarder regime regisseur reglage regner regretter regrouper
regulier rehausser rejoindre rejouir relacher relayer relever relier reluire remarquer
rembobiner rembourser remede remercier remettre remonter remorque remplacer remplir
remuer rencontrer rendement renfermer renforcer renifler renommer renoncer renouveler
renseigner rentable renverser renvoyer repaire repandre reparer repartir repasser repeindre
repentir repere repeter replier repliquer repondre reporter reposer repousser reprendre
representer reproche reptile republique repugnant reputation requin reserver residence
resister respecter respirer resplendir responsable ressembler ressentir resserrer
ressort restaurant restituer resulter resumer retablir retarder retenir retirer retomber
retourner retrouver reunir reussir revanche reveiller revelation revendre revenir rever
reverence reviser revivre revolte revolution ricaner richesse ricocher rideau ridicule
rigoler rincer riposter risquer rivage rivaliser riverain robinet robuste rocaille
rocher rondelle ronfler ronger rossignol rotation roucouler rouille rouleau rouspeter
routier roseau roulette royaume rubrique rudesse rugir ruisseau ruminer ruse rustique
`);

M.push(`
sablier saccager sachet sacoche sacrifier safran sagesse saigner saisir saladier salaire
salarie salir salopette saluer sandale sanglier sanglot sardine satisfaire saucisse
sauterelle sauvage sauvetage savonner savoureux scandale scaphandre scenario schema
scintiller scolaire scooter sculpter seance secheresse secouer secourir secretaire
sectionner securite sediment seduire seigneur sejourner selectionner semaine semelle
semer seminaire sensation sentier sentiment separer serein serpenter serrure serviette
servir seuil severe siffloter signaler signature silence sillonner similaire simplifier
sincere singulier sinistre sirene situer sixieme sobriete societe soigner soiree
soixante solaire soldat soleil solide solitaire solution sombre sommeil sommet somnoler
sondage songer sonnerie sonoriser sorcier sortilege soucieux soucoupe souder soudure
souffler souffrance souhaiter soulager soulever souligner soumettre soupape soupconner
soupirer souplesse sourire souscrire soustraire soutenir souterrain souvenir souverain
spatial spectacle speleologue sportif squelette stabiliser stade stagner stationner
statue stimuler stocker strategie strident structure studieux stupefait stupide styliste
subir submerger substituer subtiliser succeder succomber sucrerie suffoquer suggerer
suinter superbe superieur supplier supporter supposer supprimer surface surgeler surgir
surligner surmonter surnommer surpasser surprendre surveiller survivre susciter suspendre
symbole sympathique synonyme systeme tabatiere tablette tabouret tacher tacheron tailler
talonner tambouriner tamiser tapisser taquiner tarder tartiner tasser tatonner taureau
technique teindre teinture telecommande telephoner televiseur temoigner temperature
tempete temporaire tenailler tendresse tenebreux tentacule tenter terminer ternir terrain
terrasse terrible territoire testament tetard theatre theiere thermometre timbrer tirelire
tiroir tisonnier tisser titiller titrer toboggan toilette toiture tolerer tomate tomber
tondeuse tonnelle tonnerre topographie torchon tordre tornade torrent tortiller tortue
totalite toucher touffe tourbillon tourelle tourner tournevis tournoi tousser toutefois
toxique tracasser tracteur traduire trafiquer trahir traineau trainer traire traiter
trajectoire trancher tranquille transformer transmettre transpirer transporter trapeze
travailleur traverser trebucher trefle treillis trembler tremper trentaine tresor
tresser treuil tribune tricher tricoter trier trimestre trinquer triomphe tripoter
tristesse triturer troisieme trombone tromper tronconner tropical trotter troubler
troupeau trouver truelle truffe truquer tuiler tulipe tunnel turbulent tuteur tutoyer
tuyau tympan typique ulcerer ultime unanime unifier uniforme unique universel urgence
usager user ustensile utiliser vacance vacarme vaccin vacher vagabond vaillant vaincre
vaisselle valider valise valoriser valser vanille vantard vaporiser varier vaseux
vedette vegetal vehicule veiller velours vendange vendeur venerable vengeance venteux
ventiler verdure verifier veritable vernir verrou verser vertige veste vestiaire veteran
veterinaire vetement vexer viaduc viande vibrer victoire vidanger vieillard vieillir
vigilant vigneron vignoble vilain village vinaigre violemment violet violoniste virage
virer visage viser visiter visser vitalite vitesse vitrail vitrine vivacite vocabulaire
voguer voisinage voiturier volaille volcan voler voleur volontaire volume voter voyage
voyageur voyelle vraiment vrombir vulgaire wagon xylophone yaourt zebre zeste zigzaguer
`);

M.push(`
abbaye abolition abrasif abreuver accalmie accolade accroc acquit acrobatie actrice
adhesion adjoint admirable adoucir adresser aerien affaisser affichage affluence agacer
agenouiller agilite agrafer agriculture aigrelet aisance ajustement alarmer alerter
alignement allegre alliance allumage alouette ambassade amenager amertume ameublement
amoindrir amplitude amuseur ancrer anesthesie angine anglais anguille annonce anomalie
anonyme anthracite antilope apercu aplomb apogee apostrophe appartenir apprenti
apprivoiser approche appui aquatique arachide araignee arbuste ardent aristocrate
armistice aromatique arpenter arrogant arrosoir artifice artisanal aspect asperite
assistance assurance asticoter astronomie attelage attente attitude attraction aubergiste
audience auditeur augure aurore austere autel authentique automobile autonome autruche
avalanche avarice avenir aviculteur avis avocatier azur badinage bagatelle bagnole
baignoire bambou banal bandit banquier baril barometre baroque barrique bascule basilic
bassin bastion bavardage bavure bedaine belvedere benefice bequille berlingot besoin
bestiole betterave beurre biais bicoque bidonville bienfait bienveillant bifurcation
bigoudi bilingue bille biologie biscornu bistre bivouac blafard blaireau blancheur bleuir
blizzard blocage blondir blottir bocage boisement bolet bombarder boniment bonsoir
bordereau borgne bosquet bottine boucan bouchee bouclier boudin bouffer bouillon boulier
boulot bouquin bourrelet boursier bousculer boutonner bouture braderie brancard brasier
bravade brasserie bretelle bricolage brigand brillant brise brochet brouillon broussaille
bruissement brulant brunette brutal bruyere bucher budget buffle bulbe bulle burin butoir
cabas cabaret cabriolet cachemire cachot cadence cadet cafard cafeteria cagibi cagnotte
cahot caillot cajoler calamite calcaire calice calligraphie calomnie calotte camarade
cambouis camelot camion camouflage campement canal canaliser cancre candeur canne cannelle
canon cantique caporal capuchon carafe carapace carbone carcasse cardinal caresse cargo
carillon carnet carpette carreau carrelage cartilage cartonner cascadeur casier casque
cavale cave caverneux ceder ceinturer celeri cellier cendre censure centimetre cerceau
cercle cerclage cerf cerner certes cesser chagriner chaine chaise chalet chaloupe chamois
championnat chandail chanson chantonner chaparder chapelet chapelle charade charge charisme
charite charme charnier charognard charrue chataignier chaton chaumiere chaussee chef
chemin chenal chene chetif chevalet chevelure chevet cheville chevreuil chicoree chien
chiffonner chimie chiot chocolatier choeur choisir chomage chope choquer chose chou
chronique chuchotement chute cible cidre ciel cierge cigale cigarette cigogne cil cime
ciment cinquante cintrer circuit cire cirque ciseler citation cite citron civet civil
clairon clameur clan claque clarte classe clause clavicule clef clemence clerc cliche
client clignotant climat clinique clip cloche clochette cloitre clopiner cloque cloture
clown coalition cobaye cocher cochon cocon code coffre cohue coiffe coin coincidence colis
collaborer collant colle collecte college collier colombier colonie colonne colorant
colosse combat combien comble comedien comete comique commande commencer commentaire
commissaire commotion communaute compact compagnie complet complexe compliment comploter
composte compote compresse compromis comptable compter comptoir concentrer concept concert
conclure concret concurrent condition conducteur confection conference confesser confiant
confier confins confirmer conflit confondre confort confus congre conjoint connecter
conquete consacrer conscience conseil consentir consequence conservatoire considerer
consigne console constant constellation constituer consulat contact conte contempler
contenir contenu contester continent continuer contraire contraste contrat contredire
contree controle convaincu convenance convention converser convertir convier convoi
convoquer copain coquet coquille corail cordial corne cornet corolle corporel corpulent
correct correspondre corridor cortege cosmos costaud cote coteau coton couche coude
coulee couleur coupe couplet cour courant courbe couronner cours course court cousu
couvee couvent couvrir crampe crampon crane crapaud craquement cratere cravache crayeux
credit creme creneau crepe crepuscule cresson crete creux crevasse crever cri cric crime
crise crissement critere crocodile croisade croissant croix croquis crustace crypte cube
cueillette cuir cuisine cuivrer culasse culminer culte cumul cuve cyclable cygne cymbale
`);

M.push(`
national international culturel economique special royal legal moral vital fatal ideal
medical musical familial commercial industriel officiel virtuel mensuel visuel sexuel
individuel exceptionnel traditionnel professionnel personnel rationnel sensationnel
tragique classique fantastique romantique minuscule souple malheureux facheux grossier
audacieux peureux colore probable social politique naturel general principal local total
normal central rural brutal genial banal loyal amical mondial actuel manuel annuel
essentiel logique magique enorme immense geant epais etroit profond leger doux ferme
rigide tiede humide propre neuf ancien moderne rapide bruyant silencieux joyeux triste
heureux content serieux gentil mechant aimable grave poli honnete sincere franc timide
courageux fier modeste complique clair sombre brillant terne riche pauvre gratuit utile
inutile possible impossible certain dangereux ordinaire extraordinaire habituel curieux
etrange bizarre normal parfait imparfait excellent mediocre superbe magnifique splendide
horrible affreux epouvantable terrible atroce merveilleux formidable genereux avare
gourmand paresseux travailleur adroit maladroit intelligent stupide savant ignorant
prudent imprudent patient impatient nerveux detendu tendu craintif hardi solide fragile
robuste faible puissant vigoureux vaillant costaud musclé maigre mince obese rond carre
triangulaire ovale pointu arrondi droit tordu courbe plat bombe creux plein vide serre
ecarte proche lointain voisin distant present absent visible invisible cache decouvert
ouvert ferme verrouille libre occupe disponible pris vendu achete perdu trouve gagne
volatil liquide solide gazeux glace bouillant brulant gele frais tiedi refroidi rechauffe
sucre sale amer acide fade epice pimente savoureux delicieux degoutant infect appetissant
nourrissant leger copieux abondant rare frequent quotidien hebdomadaire annuel eternel
temporaire provisoire definitif immediat lointain futur passe present recent ancien
nouveau vieux usé neuf abime casse repare intact entier morcele complet incomplet total
partiel unique multiple double triple quadruple simple compose melange pur naturel
artificiel authentique faux vrai reel imaginaire fictif concret abstrait theorique
pratique utile pratique efficace inefficace rapide lent immobile mobile fixe amovible
portable transportable maniable encombrant leger pesant volumineux compact serre
`);

// ── Normalisation ──────────────────────────────────────────────────────
// Le joueur tape avec ou sans accents : les deux cotes passent par ici.

const ACCENTS = {
  a: 'àâäá', c: 'ç', e: 'éèêëé', i: 'îïíì', o: 'ôöóò', u: 'ûüùú', y: 'ÿý', n: 'ñ',
};
const TABLE = new Map();
for (const [base, lettres] of Object.entries(ACCENTS)) {
  for (const l of lettres) TABLE.set(l, base);
}

export function normalise(s) {
  if (typeof s !== 'string') return '';
  let out = '';
  for (const ch of s.toLowerCase().slice(0, 40)) {
    const c = TABLE.get(ch) || ch;
    if (c >= 'a' && c <= 'z') out += c;
    else if (c === 'œ') out += 'oe';
    else if (c === 'æ') out += 'ae';
  }
  return out;
}

// ── Construction de la liste ───────────────────────────────────────────

const vus = new Set();
export const LISTE = [];
for (const bloc of M) {
  for (const brut of bloc.split(/\s+/)) {
    const m = normalise(brut);
    if (m.length < 3 || m.length > 14 || vus.has(m)) continue;
    vus.add(m);
    LISTE.push(m);
  }
}
LISTE.sort();
export const MOTS = new Set(LISTE);

// ── Index des syllabes (2 et 3 lettres) ────────────────────────────────
// Calcule une seule fois au chargement : syllabe -> indices des mots.

const INDEX = new Map();
LISTE.forEach((mot, i) => {
  const deja = new Set();
  for (let taille = 2; taille <= 3; taille++) {
    for (let k = 0; k + taille <= mot.length; k++) {
      const syl = mot.slice(k, k + taille);
      if (deja.has(syl)) continue;
      deja.add(syl);
      let arr = INDEX.get(syl);
      if (!arr) { arr = []; INDEX.set(syl, arr); }
      arr.push(i);
    }
  }
});

const CACHE = new Map();

// Syllabes ayant au moins `minSolutions` mots. `taille` filtre la longueur.
export function syllabes(minSolutions = 8, taille = 0) {
  const cle = `${minSolutions}|${taille}`;
  const hit = CACHE.get(cle);
  if (hit) return hit;
  const out = [];
  for (const [syl, arr] of INDEX) {
    if (arr.length < minSolutions) continue;
    if (taille && syl.length !== taille) continue;
    out.push(syl);
  }
  out.sort();
  CACHE.set(cle, out);
  return out;
}

export function solutions(syl) {
  const arr = INDEX.get(syl);
  return arr ? arr.length : 0;
}

// Le mot contient-il la syllabe ?
export function contient(mot, syl) {
  return typeof mot === 'string' && typeof syl === 'string' && mot.includes(syl);
}

// ── Morphologie : les formes fléchies comptent ─────────────────────────
// Le dictionnaire ne garde que des formes de base. Un joueur, lui, tape
// « mangeons », « chevaux », « heureuse » ou « rapidement ». On défait donc
// les terminaisons françaises courantes pour retomber sur une entrée du
// dico. Une réduction ne vaut que si elle atterrit sur un vrai mot :
// « trazzzent » ne devient jamais valide pour autant.

const VOYELLES = 'aeiouy';

// Infinitifs possibles pour un radical (les trois groupes).
const INF = ['er', 'ir', 're', 'r', 'e', 'oir', 'ire'];

// Terminaisons verbales, les plus longues d'abord.
const FIN_V = [
  'eraient', 'assions', 'assiez', 'iraient', 'issaient', 'issions', 'issiez',
  'erions', 'assent', 'issons', 'issent', 'issant', 'issais', 'issait',
  'eriez', 'erent', 'erais', 'erait', 'erons', 'eront', 'asses', 'irions',
  'iriez', 'irais', 'irait', 'irons', 'iront', 'aient', 'irent',
  'erai', 'eras', 'erez', 'asse', 'ames', 'ates', 'ions', 'irai', 'iras',
  'irez', 'imes', 'ites', 'ees', 'era', 'ira',
  'ons', 'ent', 'ais', 'ait', 'ant', 'iez',
  'ez', 'es', 'ee', 'ai', 'as', 'is', 'it', 'ie', 'us', 'ut', 'ue',
  'e', 's',
];

// Terminaisons nominales : suffixe trouvé → formes de base à tester.
const FIN_N = [
  ['eaux', ['eau']], ['aux', ['al', 'ail', 'au']],
  ['euses', ['eux', 'eur']], ['euse', ['eux', 'eur']],
  ['trices', ['teur']], ['trice', ['teur']],
  ['ieres', ['ier']], ['iere', ['ier']],
  ['eres', ['er']], ['ere', ['er']],
  ['ives', ['if']], ['ive', ['if']],
  ['elles', ['el']], ['elle', ['el']],
  ['ennes', ['en']], ['enne', ['en']],
  ['onnes', ['on']], ['onne', ['on']],
  ['ettes', ['et']], ['ette', ['et']],
  ['ements', ['ement', '']], ['ement', ['']],
  ['ations', ['ation', '']], ['ation', ['']],
  ['eurs', ['eur', '']], ['eur', ['']],
  ['ages', ['age', '']], ['age', ['']],
  ['ables', ['able', '']], ['able', ['']],
  ['ibles', ['ible', '']], ['ible', ['']],
  ['aires', ['aire', '']], ['aire', ['']],
  ['es', ['', 'e']], ['s', ['']], ['x', ['']], ['e', ['']],
];

// Suffixes de dérivation : « travailleur » vient de « travailler ».
const DERIVE = new Set([
  'eur', 'eurs', 'euse', 'euses', 'age', 'ages', 'able', 'ables',
  'ible', 'ibles', 'ement', 'ements', 'ation', 'ations',
]);

// Les verbes du 3e groupe changent de radical : aucune regle ne rattrape
// « buvons » ou « faisons ». Table des radicaux forts les plus courants.
const IRREG = new Map(Object.entries({
  buv: 'boire', boiv: 'boire', bu: 'boire',
  pren: 'prendre', prenn: 'prendre', pri: 'prendre', prendr: 'prendre',
  fais: 'faire', fait: 'faire', fass: 'faire', fer: 'faire',
  ecriv: 'ecrire', ecrit: 'ecrire',
  lis: 'lire', lu: 'lire',
  dis: 'dire', dit: 'dire', dir: 'dire',
  met: 'mettre', mett: 'mettre', mis: 'mettre',
  viv: 'vivre', vec: 'vivre',
  suiv: 'suivre',
  connaiss: 'connaitre', connu: 'connaitre',
  paraiss: 'paraitre', naiss: 'naitre',
  croi: 'croire', croy: 'croire', cru: 'croire',
  sav: 'savoir', sach: 'savoir', su: 'savoir', saur: 'savoir',
  pouv: 'pouvoir', peuv: 'pouvoir', pu: 'pouvoir', pourr: 'pouvoir',
  voul: 'vouloir', veul: 'vouloir', voudr: 'vouloir',
  dev: 'devoir', doiv: 'devoir', devr: 'devoir',
  voy: 'voir', verr: 'voir', vu: 'voir',
  recev: 'recevoir', recoiv: 'recevoir', recu: 'recevoir',
  tien: 'tenir', tienn: 'tenir', tiendr: 'tenir', tenu: 'tenir',
  vien: 'venir', vienn: 'venir', viendr: 'venir', venu: 'venir',
  all: 'aller', ir: 'aller',
  conduis: 'conduire', produis: 'produire', traduis: 'traduire',
  construis: 'construire', detruis: 'detruire', reduis: 'reduire',
  plais: 'plaire', tais: 'taire',
  peign: 'peindre', craign: 'craindre', joign: 'joindre',
  atteign: 'atteindre', eteign: 'eteindre',
  resolv: 'resoudre', cous: 'coudre', moul: 'moudre',
  vainqu: 'vaincre', romp: 'rompre',
  ouvr: 'ouvrir', couvr: 'couvrir', offr: 'offrir', souffr: 'souffrir',
  cueill: 'cueillir', acquier: 'acquerir',
  aill: 'aller', envoi: 'envoyer', enverr: 'envoyer',
  assoi: 'asseoir', assey: 'asseoir',
  faill: 'falloir', vaill: 'valoir', vaudr: 'valoir',
  mour: 'mourir', meur: 'mourir',
  ser: 'etre', soy: 'etre', fus: 'etre', somm: 'etre',
  av: 'avoir', aur: 'avoir', ay: 'avoir', eu: 'avoir',
}));

function infinitif(r) {
  if (r.length < 2) return false;
  for (const s of INF) if (MOTS.has(r + s)) return true;
  const inf = IRREG.get(r);
  return !!inf && MOTS.has(inf);
}

function formeVerbale(m) {
  for (const f of FIN_V) {
    if (!m.endsWith(f) || m.length - f.length < 2) continue;
    const r = m.slice(0, m.length - f.length);
    if (infinitif(r)) return true;
    // 2e groupe : « finissons » → fin(iss) + ir.
    if (r.endsWith('iss') && infinitif(r.slice(0, -3))) return true;
    // Consonne doublée : « appelle » → appel(er), « jette » → jet(er).
    if (/([bcdfglmnprst])\1$/.test(r) && infinitif(r.slice(0, -1))) return true;
  }
  return false;
}

function formeNominale(m) {
  for (const [fin, bases] of FIN_N) {
    if (!m.endsWith(fin) || m.length - fin.length < 2) continue;
    const r = m.slice(0, m.length - fin.length);
    for (const s of bases) if (MOTS.has(r + s)) return true;
    if (DERIVE.has(fin) && infinitif(r)) return true;
  }
  return false;
}

// Adverbes en -ment : ils se forment sur une voyelle (« vraiment ») ou sur
// le féminin de l'adjectif (« grandement », « heureusement »).
function adverbe(m) {
  if (!m.endsWith('ment') || m.length < 7) return false;
  const r = m.slice(0, -4);
  if (!VOYELLES.includes(r[r.length - 1])) return false;
  return MOTS.has(r) || formeNominale(r);
}

// Le mot est-il au dictionnaire, forme fléchie comprise ?
export function accepte(mot) {
  if (typeof mot !== 'string' || mot.length < 3) return false;
  if (MOTS.has(mot)) return true;
  if (mot.length < 4) return false;
  return formeNominale(mot) || formeVerbale(mot) || adverbe(mot);
}

// Un mot du dictionnaire contenant la syllabe, hors `exclus` (Set).
// `rng` est le PRNG seede du serveur.
export function motAvec(syl, rng, exclus = null) {
  const arr = INDEX.get(syl);
  if (!arr || !arr.length) return null;
  const depart = rng ? rng.int(0, arr.length - 1) : 0;
  for (let k = 0; k < arr.length; k++) {
    const mot = LISTE[arr[(depart + k) % arr.length]];
    if (!exclus || !exclus.has(mot)) return mot;
  }
  return null;
}

export const TAILLE = LISTE.length;
