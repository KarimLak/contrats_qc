from typing import Optional

from sqlalchemy import JSON, Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    titre: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    type: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    contenu: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    langue: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    dimension: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    nombre_page: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


class Contract(Base):
    __tablename__ = "contracts" 
    
    # ── Primary key ───────────────────────────────────────────────────────────
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # ── Identity ──────────────────────────────────────────────────────────────
    numero:           Mapped[str] = mapped_column(String(255), nullable=False)
    numero_reference: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    type_avis:        Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    statut:           Mapped[str] = mapped_column(String(100), nullable=False)
    url:              Mapped[str] = mapped_column(String(500), nullable=False)

    # ── Core description ──────────────────────────────────────────────────────
    titre:          Mapped[str]           = mapped_column(String(1000), nullable=False)
    organisation:   Mapped[str]           = mapped_column(String(500),  nullable=False, index=True)
    nature_contrat: Mapped[str]           = mapped_column(String(255),  nullable=False, index=True)
    categorie:      Mapped[str]           = mapped_column(String(500),  nullable=False, index=True)
    description:    Mapped[Optional[str]] = mapped_column(Text,         nullable=True)

    # ── Classification ─────────────────────────────────
    classifications: Mapped[list] = mapped_column(String(1000), default=list)
    documents:       Mapped[list] = mapped_column(JSON, default=list)

    # ── Geography & trade agreements ──────────────────────────────────────────
    region:      Mapped[str]           = mapped_column(String(500),  nullable=False)
    accord:      Mapped[str]           = mapped_column(String(1000), nullable=False)
    territoires: Mapped[Optional[str]] = mapped_column(String(500),  nullable=True)

    # ── Dates ─────────────────────────────────────────────────────────────────
    date_publication:           Mapped[str]           = mapped_column(String(100), nullable=False)
    date_fermeture:             Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    date_limite_plaintes:       Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    date_limite_interet:        Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    date_ouverture_soumissions: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    date_conclusion:            Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # ── Contract terms ────────────────────────────────────────────────────────
    duree_contrat:              Mapped[Optional[str]] = mapped_column(String(50),   nullable=True)
    duree_contrat_avec_options: Mapped[Optional[str]] = mapped_column(String(50),   nullable=True)
    options_renouvellement:     Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    contrat_execution_demande:  Mapped[Optional[str]] = mapped_column(String(50),   nullable=True)
    contrat_a_commandes:        Mapped[Optional[str]] = mapped_column(String(50),   nullable=True)

    # ── Submission logistics ──────────────────────────────────────────────────
    soumission_electronique: Mapped[Optional[str]] = mapped_column(String(255),  nullable=True)
    endroit_reception:       Mapped[Optional[str]] = mapped_column(String(500),  nullable=True)
    endroit_ouverture:       Mapped[Optional[str]] = mapped_column(String(500),  nullable=True)
    adjudication_par_lot:    Mapped[Optional[str]] = mapped_column(String(50),   nullable=True)
    remarque:                Mapped[Optional[str]] = mapped_column(String(20000), nullable=True)

    # ── Bid guarantee ─────────────────────────────────────────────────────────
    garantie_nature: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    garantie_valeur: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # ── Intention-specific ────────────────────────────────────────────────────
    fournisseur_pressenti: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # ── Contact ───────────────────────────────────────────────────────────────
    contact_nom:       Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    contact_email:     Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    contact_telephone: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

