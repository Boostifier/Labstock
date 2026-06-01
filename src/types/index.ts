export interface User {
  id: string
  nom: string
  mot_de_passe?: string
  droit_parametres: boolean
  droit_marchandises: boolean
  droit_facturation: boolean
  droit_operations: boolean
  droit_inventaire: boolean
  droit_demande_achat: boolean
  droit_bon_commande: boolean
  droit_satisfaction_f: boolean
  droit_stock_bord: boolean
  droit_factures_bord: boolean
  is_system: boolean
  created_at?: string
}

export interface SessionUser {
  id: string
  nom: string
  droit_parametres: boolean
  droit_marchandises: boolean
  droit_facturation: boolean
  droit_operations: boolean
  droit_inventaire: boolean
  droit_demande_achat: boolean
  droit_bon_commande: boolean
  droit_satisfaction_f: boolean
  droit_stock_bord: boolean
  droit_factures_bord: boolean
  is_system: boolean
}

export interface Article {
  reference: string
  designation: string
  conditionnement: number
  categorie: string
  date_creation: string
  prix_ht: number
  tva: number
  prix_ttc: number
}

export interface Fournisseur {
  code: string
  nom: string
  adresse: string
  code_postal: string
  tel_fax: string
  gsm: string
  matricule_fiscal: string
  email: string
  est_labo: boolean
}

export interface StockLot {
  id: string
  reference: string
  designation: string
  categorie: string
  fournisseur: string
  conditionnement: number
  numero_lot: string
  date_peremption: string
  quantite_stock: number
  prix_ht: number
  prix_unitaire: number
  statut_fefo: 'Actif' | 'Inactif' | 'Épuisé'
}

export interface FactureEntete {
  numero_facture: string
  date_saisie: string
  date_facture: string
  fournisseur: string
  total_ht: number
  total_remise: number
  ht_net: number
  total_tva: number
  timbre: number
  total_ttc: number
  type_facture: 'fournisseur' | 'sous_traitant'
}

export interface FactureDetail {
  id: string
  numero_facture: string
  reference_article: string
  designation: string
  quantite: number
  prix_unitaire: number
  remise_pct: number
  tva_pct: number
  montant_ht_net: number
}

export interface Dette {
  id: string
  numero_facture: string
  date_facture: string
  fournisseur: string
  categorie: string
  delai_jours: number
  montant_a_payer: number
  montant_paye: number
  date_echeance: string
  statut: string
}

export interface Reglement {
  id: string
  numero_facture: string
  date_reglement: string
  fournisseur: string
  montant_regle: number
  mode_paiement: string
  reference_paiement: string
}

export interface Sortie {
  id: string
  date_sortie: string
  reference: string
  designation: string
  fournisseur: string
  categorie: string
  conditionnement: number
  numero_lot: string
  date_peremption: string
  quantite: number
  prix_unitaire: number
  montant_total: number
  motif: string
  operateur: string
}

export interface Entree {
  id: string
  date_entree: string
  reference: string
  designation: string
  fournisseur: string
  categorie: string
  conditionnement: number
  numero_lot: string
  date_peremption: string
  quantite: number
  prix_unitaire: number
  montant_total: number
  operateur: string
  numero_bc: string
}

export interface InventaireRow {
  reference: string
  designation: string
  categorie: string
  cumul_entrees: number
  cumul_sorties: number
}

export interface AuditInventaire {
  id: string
  date_audit: string
  reference: string
  designation: string
  numero_lot: string
  stock_systeme: number
  stock_physique: number
  ecart: number
  operateur: string
}

export interface DemandeAchat {
  numero_da: string
  date_da: string
  demandeur: string
  reference_article: string
  designation: string
  categorie: string
  quantite: number
  unite: string
  fournisseur_suggere: string
  urgence: 'Normal' | 'Urgent' | 'Très urgent'
  commentaire: string
  statut: string
}

export interface BonCommande {
  numero_bc: string
  date_bc: string
  fournisseur: string
  conditions_paiement: string
  delai_livraison: string
  statut: 'En attente' | 'Partiel' | 'Livré' | 'Annulé'
}

export interface DetailBC {
  id: string
  numero_bc: string
  reference: string
  designation: string
  conditionnement: number
  quantite_commandee: number
  prix_unitaire_ht: number
  tva_pct: number
  montant_ht: number
  quantite_recue: number
}

export interface SatisfactionFournisseur {
  id: string
  fournisseur: string
  date_evaluation: string
  reference_bc_facture: string
  note_delais: number
  note_qualite: number
  note_conformite: number
  note_service: number
  note_prix: number
  note_globale: number
  commentaire: string
}

export interface ConfigLabo {
  id: number
  nom_laboratoire: string
  adresse: string
  telephone: string
  email: string
  logo_url: string
}

export interface DashboardKPIs {
  valeur_stock: number
  total_lots: number
  total_references: number
  sorties_mois: number
  entrees_mois: number
  ruptures: number
  alertes: number
  lots_sains: number
  surstock: number
}

export const CATEGORIES = [
  'BIOCHIMIE', 'BACTÉRIOLOGIE', 'HÉMATOLOGIE', 'HÉMOSTASE',
  'IMMUNOLOGIE', 'VIROLOGIE', 'PARASITOLOGIE', 'SÉROLOGIE',
  'MYCOLOGIE', 'HORMONOLOGIE', 'CONSOMMABLES', 'RÉACTIFS GÉNÉRAUX',
  'VERRERIE', 'AUTRES'
] as const

export const TVA_RATES = [0, 4, 7, 19, 25] as const

export const MOTIFS_SORTIE = [
  'Utilisation', 'Péremption', 'Casse', 'Contrôle', 'Autre'
] as const

export const MODES_PAIEMENT = [
  'Virement', 'Chèque', 'Espèces', 'Autre'
] as const

export const URGENCES = ['Normal', 'Urgent', 'Très urgent'] as const

export const STATUTS_BC = ['En attente', 'Partiel', 'Livré', 'Annulé'] as const
