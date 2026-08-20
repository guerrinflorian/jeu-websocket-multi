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

// Le mot est-il au dictionnaire ? On tolere les pluriels et les
// conjugaisons courantes : « chats », « grandes », « mangent »...
export function accepte(mot) {
  if (typeof mot !== 'string' || mot.length < 3) return false;
  if (MOTS.has(mot)) return true;
  if (mot.length < 5) return false;
  const pistes = [];
  if (mot.endsWith('s') || mot.endsWith('x')) pistes.push(mot.slice(0, -1));
  if (mot.endsWith('es')) pistes.push(mot.slice(0, -2));
  if (mot.endsWith('ent')) pistes.push(`${mot.slice(0, -3)}e`, mot.slice(0, -3));
  if (mot.endsWith('e')) pistes.push(mot.slice(0, -1));
  for (const p of pistes) {
    if (p.length >= 3 && MOTS.has(p)) return true;
  }
  return false;
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
