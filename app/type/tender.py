from enum import Enum

class TypeAvis(str, Enum):
    TOUS_LES_TYPES_D_AVIS = "all"
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

class StatutAvis(str, Enum):
    TOUS_LES_STATUTS = "all"
    PUBLIE = "Publié"
    ANNULE = "Annulé"
    EN_ATTENTE_RESULTATS_OUVERTURE = "En attente des résultats d’ouverture"
    EN_ATTENTE_CONCLUSION_CONTRAT = "En attente de conclusion du contrat"
    CONTRAT_CONCLU = "Contrat conclu"
    LISTE_DISPONIBLE = "Liste disponible"
    TERMINE = "Terminé"

class Region(str, Enum):
    TOUTES_LES_REGIONS = "all"
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