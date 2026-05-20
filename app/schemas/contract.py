from typing import Optional

from pydantic import BaseModel, Field

class Contract(BaseModel):
    numero: str = Field(..., min_length=0, max_length=255)
    numero_reference: str = Field(..., min_length=0, max_length=255)
    type_avis: str = Field(..., min_length=0, max_length=255)
    statut: str = Field(..., min_length=0, max_length=255)
    titre: str  = ""
    organisation: str  = ""
    date_publication:str  = ""
    date_fermeture:str  = ""
    date_limite_plaintes:str  = ""
    date_limite_interet:str  = ""
    date_ouverture_soumissions:str  = ""
    date_conclusion:str  = ""
    delai_offres:str  = ""
    nature_contrat:str  = ""
    contrat_execution_demande:str  = ""
    contrat_a_commandes:str  = ""
    soumission_electronique:str  = ""
    duree_contrat:str  = ""
    duree_contrat_avec_options:str  = ""
    options_renouvellement: str  = ""
    region:str  = ""
    accord:str  = ""
    territoires:str  = ""
    endroit_reception:str  = ""
    endroit_ouverture:str  = ""
    categorie:str  = ""
    description:str  = ""
    adjudication_par_lot:str  = ""
    remarque:str  = ""
    garantie_nature:str  = ""
    garantie_valeur:str  = ""
    fournisseur_pressenti:str  = ""
    contact_nom:str  = ""
    contact_email:str  = ""
    contact_telephone:str  = ""
    classifications:list = field(default_factory=list)
    documents:list = field(default_factory=list)
    url:str  = ""