export interface SectorCategory {
  id: number
  descriptionFr: string
}

export interface SectorNode {
  id: number
  descriptionFr: string
  categories: SectorCategory[]
}

// Arborescence secteurs/catégories (SEAO). Les valeurs descriptionFr sont envoyées
// telles quelles à la base de données — ne pas les modifier, seul l'affichage est simplifié.
export const SECTOR_TREE: SectorNode[] = [
  {
    id: 1,
    descriptionFr: "Approvisionnement (biens)",
    categories: [
      { id: 1, descriptionFr: "G1 - Aérospatiale" },
      { id: 2, descriptionFr: "G15 - Alimentation" },
      { id: 3, descriptionFr: "G17 - Ameublement" },
      { id: 4, descriptionFr: "G3 - Armement" },
      { id: 5, descriptionFr: "G5 - Communication, détection et fibres optiques" },
      { id: 7, descriptionFr: "G7 - Cosmétiques et articles de toilette" },
      { id: 8, descriptionFr: "G11 - Énergie" },
      { id: 10, descriptionFr: "G14 - Équipement de lutte contre l’incendie, de sécurité et de protection" },
      { id: 11, descriptionFr: "G31 - Équipement de transport et pièces de rechange" },
      { id: 12, descriptionFr: "G18 - Équipement industriel" },
      { id: 13, descriptionFr: "G21 - Fourniture et équipement médicaux et produits pharmaceutiques" },
      { id: 14, descriptionFr: "G27 - Instruments scientifiques" },
      { id: 16, descriptionFr: "G19 - Machinerie et outils" },
      { id: 17, descriptionFr: "G20 - Marine" },
      { id: 18, descriptionFr: "G6 - Matériaux de construction" },
      { id: 19, descriptionFr: "G23 - Matériel de bureau" },
      { id: 20, descriptionFr: "G2 - Matériel de climatisation et de réfrigération" },
      { id: 21, descriptionFr: "G8 - Matériel informatique et logiciel" },
      { id: 22, descriptionFr: "G12 - Moteurs, turbines, composants et accessoires connexes" },
      { id: 23, descriptionFr: "G24 - Papeterie et fournitures de bureau" },
      { id: 24, descriptionFr: "G16 - Préparation alimentaire et équipement de service" },
      { id: 25, descriptionFr: "G22 - Produits divers" },
      { id: 26, descriptionFr: "G10 - Produits électriques et électroniques" },
      { id: 27, descriptionFr: "G4 - Produits et spécialités chimiques" },
      { id: 28, descriptionFr: "G13 - Produits finis" },
      { id: 29, descriptionFr: "G26 - Publications, formulaires et articles en papier" },
      { id: 30, descriptionFr: "G30 - Textiles et vêtements" },
      { id: 31, descriptionFr: "G28 - Véhicules spéciaux" },
    ],
  },
  {
    id: 3,
    descriptionFr: "Travaux de construction",
    categories: [
      { id: 52, descriptionFr: "C01 - Bâtiments" },
      { id: 53, descriptionFr: "C02 - Ouvrages de génie civil" },
    ],
  },
  {
    id: 5,
    descriptionFr: "Ventes de biens meubles ",
    categories: [{ id: 55, descriptionFr: "Meu1 - Vente de biens meubles" }],
  },
  {
    id: 6,
    descriptionFr: "Ventes de biens immeubles",
    categories: [{ id: 56, descriptionFr: "Imm1 - Vente de biens immeubles" }],
  },
  {
    id: 7,
    descriptionFr: "Autres (Mandataire)",
    categories: [{ id: 57, descriptionFr: "O1 - Indéterminé" }],
  },
  {
    id: 8,
    descriptionFr: "Services de nature technique",
    categories: [
      { id: 32, descriptionFr: "S8 - Contrôle de la qualité, essais et inspections et services de représentants techniques" },
      { id: 33, descriptionFr: "S9 - Entretien, réparation, modification, réfection et installation de biens et d’équipement" },
      { id: 34, descriptionFr: "S2 - Études spéciales et analyses" },
      { id: 38, descriptionFr: "S1 - Recherche et développement (R et D)" },
      { id: 39, descriptionFr: "S3 - Services d’architecture et d’ingénierie" },
      { id: 40, descriptionFr: "S15 - Services de communication, de photographie, de cartographie, d’impression et de publication" },
      { id: 41, descriptionFr: "S10 - Services de garde et autres services connexes" },
      { id: 42, descriptionFr: "S6 - Services de ressources naturelles" },
      { id: 43, descriptionFr: "S7 - Services de santé et services sociaux" },
      { id: 44, descriptionFr: "S13 - Services de soutien professionnel et administratif et services de soutien à la gestion" },
      { id: 45, descriptionFr: "S17 - Services de transport, de voyage et de déménagement" },
      { id: 46, descriptionFr: "S5 - Services environnementaux" },
      { id: 48, descriptionFr: "S16 - Services pédagogiques et formation" },
      { id: 49, descriptionFr: "S14 - Services publics" },
      { id: 50, descriptionFr: "S4 - Traitement de l’information et services de télécommunications connexes" },
    ],
  },
  {
    id: 9,
    descriptionFr: "Services professionnels",
    categories: [
      { id: 32, descriptionFr: "S8 - Contrôle de la qualité, essais et inspections et services de représentants techniques" },
      { id: 33, descriptionFr: "S9 - Entretien, réparation, modification, réfection et installation de biens et d’équipement" },
      { id: 34, descriptionFr: "S2 - Études spéciales et analyses" },
      { id: 38, descriptionFr: "S1 - Recherche et développement (R et D)" },
      { id: 39, descriptionFr: "S3 - Services d’architecture et d’ingénierie" },
      { id: 40, descriptionFr: "S15 - Services de communication, de photographie, de cartographie, d’impression et de publication" },
      { id: 41, descriptionFr: "S10 - Services de garde et autres services connexes" },
      { id: 42, descriptionFr: "S6 - Services de ressources naturelles" },
      { id: 43, descriptionFr: "S7 - Services de santé et services sociaux" },
      { id: 44, descriptionFr: "S13 - Services de soutien professionnel et administratif et services de soutien à la gestion" },
      { id: 45, descriptionFr: "S17 - Services de transport, de voyage et de déménagement" },
      { id: 46, descriptionFr: "S5 - Services environnementaux" },
      { id: 47, descriptionFr: "S11 - Services financiers et autres services connexes" },
      { id: 48, descriptionFr: "S16 - Services pédagogiques et formation" },
      { id: 49, descriptionFr: "S14 - Services publics" },
      { id: 50, descriptionFr: "S4 - Traitement de l’information et services de télécommunications connexes" },
    ],
  },
  {
    id: 10,
    descriptionFr: "Partenariat",
    categories: [{ id: 58, descriptionFr: "Part1 - Partenariat" }],
  },
]

// Libellés simplifiés pour l'affichage uniquement — la valeur stockée reste descriptionFr exact.
const SECTOR_LABELS: Record<string, string> = {
  "Approvisionnement (biens)": "Approvisionnement (biens)",
  "Travaux de construction": "Travaux de construction",
  "Ventes de biens meubles ": "Ventes de biens meubles",
  "Ventes de biens immeubles": "Ventes de biens immeubles",
  "Autres (Mandataire)": "Autres",
  "Services de nature technique": "Services techniques",
  "Services professionnels": "Services professionnels",
  "Partenariat": "Partenariat",
}

export const sectorLabel = (descriptionFr: string) => SECTOR_LABELS[descriptionFr] ?? descriptionFr.trim()

// Retire le préfixe de code (ex. "G1 - ", "S15 - ", "C01 - ") pour un affichage plus simple.
export const categoryLabel = (descriptionFr: string) =>
  descriptionFr.replace(/^[A-Za-zÀ-ÿ]+\d*\s*-\s*/, "")

export const CONTRACT_TYPE_OPTIONS = [
  "Avis d'appel d'intérêt",
  "Avis d'appel d'offres",
  "Avis d'appel d'offres régionalisé",
  "Avis d'appel d'offres réservé aux petites entreprises du Québec et à celles d'ailleurs au Canada",
  "Avis d'appel d'offres sur invitation",
  "Avis d'homologation de produits (Approvisionnements)",
  "Avis d'intention",
  "Avis de demande de prix auprès des entreprises qualifiées",
  "Avis de qualification",
  "Avis de qualification d'entrepreneurs (infrastructures de transport)",
  "Contrat à la suite d'un achat mandaté ou d'un regroupement d'organismes",
  "Contrat à la suite d'un appel d'offres sur invitation",
  "Contrat conclu - Appel d'offres public non publié au SEAO",
  "Contrat de gré à gré",
  "Contrat relatif aux infrastructures de transport",
  "Documents normatifs",
]

export const REGION_OPTIONS = [
  "Abitibi-Témiscamingue",
  "Bas-Saint-Laurent",
  "Capitale-Nationale",
  "Centre-du-Québec",
  "Chaudière-Appalaches",
  "Côte-Nord",
  "Estrie",
  "Gaspésie–Îles-de-la-Madeleine",
  "Lanaudière",
  "Laurentides",
  "Laval",
  "Mauricie",
  "Montréal",
  "Montérégie",
  "Nord-du-Québec",
  "Outaouais",
  "Saguenay–Lac-Saint-Jean",
]
