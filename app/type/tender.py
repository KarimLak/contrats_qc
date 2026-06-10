from enum import Enum

class TenderType(str, Enum):
    AVIS_APPEL_INTERET = "Avis d’appel d’intérêt"
    AVIS_APPEL_OFFRES = "Avis d’appel d’offres"
    AVIS_APPEL_OFFRES_REGIONALISE = "Avis d’appel d’offres régionalisé"
    AVIS_APPEL_OFFRES_RESERVE_PME = (
        "Avis d’appel d’offres réservé aux petites entreprises du Québec et à celles d’ailleurs au Canada"
    )
    AVIS_APPEL_OFFRES_SUR_INVITATION = "Avis d’appel d’offres sur invitation"
    AVIS_HOMOLOGATION_PRODUITS = "Avis d’homologation de produits (Approvisionnements)"
    AVIS_INTENTION = "Avis d’intention"
    AVIS_DEMANDE_PRIX_ENTREPRISES_QUALIFIEES = (
        "Avis de demande de prix auprès des entreprises qualifiées"
    )
    AVIS_QUALIFICATION = "Avis de qualification"
    AVIS_QUALIFICATION_ENTREPRENEURS = (
        "Avis de qualification d’entrepreneurs (infrastructures de transport)"
    )
    CONTRAT_ACHAT_MANDATE_REGROUPEMENT = (
        "Contrat à la suite d'un achat mandaté ou d'un regroupement d’organismes"
    )
    CONTRAT_APPEL_OFFRES_SUR_INVITATION = (
        "Contrat à la suite d'un appel d’offres sur invitation"
    )
    CONTRAT_CONCLU_APPEL_OFFRES_PUBLIC_NON_PUBLIE = (
        "Contrat conclu - Appel d’offres public non publié au SEAO"
    )
    CONTRAT_GRE_A_GRE = "Contrat de gré à gré"
    CONTRAT_INFRASTRUCTURES_TRANSPORT = (
        "Contrat relatif aux infrastructures de transport"
    )
    DOCUMENTS_NORMATIFS = "Documents normatifs"

class TenderStatus(str, Enum):
    PUBLIE = "Publié"
    ANNULE = "Annulé"
    EN_ATTENTE_RESULTATS_OUVERTURE = "En attente des résultats d’ouverture"
    EN_ATTENTE_CONCLUSION_CONTRAT = "En attente de conclusion du contrat"
    CONTRAT_CONCLU = "Contrat conclu"
    LISTE_DISPONIBLE = "Liste disponible"
    TERMINE = "Terminé"

class TenderRegion(str, Enum):
    ABITIBI_TEMISCAMINGUE = "Abitibi-Témiscamingue"
    BAS_SAINT_LAURENT = "Bas-Saint-Laurent"
    CAPITALE_NATIONALE = "Capitale-Nationale"
    CENTRE_DU_QUEBEC = "Centre-du-Québec"
    CHAUDIERE_APPALACHES = "Chaudière-Appalaches"
    COTE_NORD = "Côte-Nord"
    ESTRIE = "Estrie"
    GASPESIE_ILES_DE_LA_MADELEINE = "Gaspésie–Îles-de-la-Madeleine"
    LANAUDIERE = "Lanaudière"
    LAURENTIDES = "Laurentides"
    LAVAL = "Laval"
    MAURICIE = "Mauricie"
    MONTREAL = "Montréal"
    MONTEREGIE = "Montérégie"
    NORD_DU_QUEBEC = "Nord-du-Québec"
    OUTAOUAIS = "Outaouais"
    SAGUENAY_LAC_SAINT_JEAN = "Saguenay–Lac-Saint-Jean"

class TenderNature(str, Enum):
    APPROVISIONNEMENT_BIENS = "Approvisionnement (biens)"
    AUTRES = "Autres"
    CONCESSION = "Concession"
    SERVICES= "Services"
    PARTENARIAT_SERVICES = "Partenariat"
    TRAVAUX_DE_CONSTRUCTION = "Travaux de construction"
    VENTE_DE_BIENS_IMMEUBLES = "Ventes de biens immeubles"
    VENTE_DE_BIENS_MEUBLES = "Ventes de biens meubles"

class TenderCategory(str, Enum):
    AEROSPATIALE = "Aérospatiale"
    ALIMENTATION = "Alimentation"
    AMEUBLEMENT = "Ameublement"
    ARMEMENT = "Armement"
    COMMUNICATION_DETECTION_FIBRES_OPTIQUES = "Communication, détection et fibres optiques"
    CONSTRUCTIONS_PREFABRIQUEES = "Constructions préfabriquées"
    COSMETIQUES_ARTICLES_TOILETTE = "Cosmétiques et articles de toilette"
    ENERGIE = "Énergie"
    ENTRETIEN_EQUIPEMENT_BUREAU_INFORMATIQUE = "Entretien d'équipement de bureau et d'informatique"
    EQUIPEMENT_INCENDIE_SECURITE_PROTECTION = (
        "Équipement de lutte contre l'incendie, de sécurité et de protection"
    )
    EQUIPEMENT_TRANSPORT_PIECES_RECHANGE = "Équipement de transport et pièces de rechange"
    EQUIPEMENT_INDUSTRIEL = "Équipement industriel"
    FOURNITURE_EQUIPEMENT_MEDICAUX_PHARMACEUTIQUES = (
        "Fourniture et équipement médicaux et produits pharmaceutiques"
    )
    INSTRUMENTS_SCIENTIFIQUES = "Instruments scientifiques"
    INTEGRATION_SYSTEMES = "Intégration de systèmes"
    MACHINERIE_OUTILS = "Machinerie et outils"
    MARINE = "Marine"
    MATERIAUX_CONSTRUCTION = "Matériaux de construction"
    MATERIEL_BUREAU = "Matériel de bureau"
    MATERIEL_CLIMATISATION_REFRIGERATION = "Matériel de climatisation et de réfrigération"
    MATERIEL_INFORMATIQUE_LOGICIEL = "Matériel informatique et logiciel"
    MOTEURS_TURBINES_COMPOSANTS = "Moteurs, turbines, composants et accessoires connexes"
    PAPETERIE_FOURNITURES_BUREAU = "Papeterie et fournitures de bureau"
    PREPARATION_ALIMENTAIRE_EQUIPEMENT_SERVICE = "Préparation alimentaire et équipement de service"
    PRODUITS_DIVERS = "Produits divers"
    PRODUITS_ELECTRIQUES_ELECTRONIQUES = "Produits électriques et électroniques"
    PRODUITS_SPECIALITES_CHIMIQUES = "Produits et spécialités chimiques"
    PRODUITS_FINIS = "Produits finis"
    PUBLICATIONS_FORMULAIRES_ARTICLES_PAPIER = "Publications, formulaires et articles en papier"
    TEXTILES_VETEMENTS = "Textiles et vêtements"
    VEHICULES_SPECIAUX = "Véhicules spéciaux"
    INDETERMINE = "Indéterminé"
    CONCESSION = "Concession"
    PARTENARIAT = "Partenariat"
    CONTROLE_QUALITE_ESSAIS_INSPECTIONS = (
        "Contrôle de la qualité, essais et inspections et services de représentants techniques"
    )
    ENTRETIEN_REPARATION_MODIFICATION = (
        "Entretien, réparation, modification, réfection et installation de biens et d'équipement"
    )
    ETUDES_SPECIALES_ANALYSES = "Études spéciales et analyses"
    EXPLOITATION_INSTALLATIONS_GOUVERNEMENTALES = "Exploitation des installations gouvernementales"
    LOCATION_INSTALLATIONS_IMMOBILIERES = (
        "Location à bail ou location d'installations immobilières"
    )
    LOCATION_EQUIPEMENT = "Location à bail/Location d'équipement"
    RECHERCHE_DEVELOPPEMENT = "Recherche et développement (R et D)"
    SERVICES_ARCHITECTURE_INGENIERIE = "Services d'architecture et d'ingénierie"
    SERVICES_COMMUNICATION_PHOTO_CARTO_IMPRESSION = (
        "Services de communication, de photographie, de cartographie, d'impression et de publication"
    )
    SERVICES_GARDE = "Services de garde et autres services connexes"
    SERVICES_RESSOURCES_NATURELLES = "Services de ressources naturelles"
    SERVICES_SANTE_SOCIAUX = "Services de santé et services sociaux"
    SERVICES_SOUTIEN_PROFESSIONNEL_ADMINISTRATIF = (
        "Services de soutien professionnel et administratif et services de soutien à la gestion"
    )
    SERVICES_TRANSPORT_VOYAGE_DEMENAGEMENT = "Services de transport, de voyage et de déménagement"
    SERVICES_ENVIRONNEMENTAUX = "Services environnementaux"
    SERVICES_FINANCIERS = "Services financiers et autres services connexes"
    SERVICES_PEDAGOGIQUES_FORMATION = "Services pédagogiques et formation"
    SERVICES_PUBLICS = "Services publics"
    TRAITEMENT_INFORMATION_TELECOMMUNICATIONS = (
        "Traitement de l'information et services de télécommunications connexes"
    )
    AUTRES_TRAVAUX_CONSTRUCTION = "Autres travaux de construction"
    BATIMENTS = "Bâtiments"
    OUVRAGES_GENIE_CIVIL = "Ouvrages de génie civil"
    VENTE_BIENS_IMMEUBLES = "Vente de biens immeubles"
    VENTE_BIENS_MEUBLES = "Vente de biens meubles"
 
 