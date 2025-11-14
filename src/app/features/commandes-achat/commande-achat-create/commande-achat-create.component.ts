import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommandeAchatService, FournisseurService } from '../../../core/services/all-services';
import { Fournisseur, Produit } from '../../../core/models';
import { MessageService } from 'primeng/api';
import { ProduitService } from '../../../core/services/produit.service';
import { DemandeApprovisionnementService } from '../../../core/services/demande-approvisionnement.service';

@Component({
  selector: 'app-commande-achat-create',
  templateUrl: './commande-achat-create.component.html',
  styleUrls: ['./commande-achat-create.component.scss']
})
export class CommandeAchatCreateComponent implements OnInit {
  commandeForm!: FormGroup;
  loading = false;
  fournisseurs: Fournisseur[] = [];
  produits: Produit[] = [];
  demandesAppro: any[] = [];
  selectedDemandeId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private commandeService: CommandeAchatService,
    private fournisseurService: FournisseurService,
    private produitService: ProduitService,
    private messageService: MessageService,
    private demandeApproService: DemandeApprovisionnementService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadFournisseurs();
    this.loadProduits();
    this.loadDemandesAppro();
  }

  loadDemandesAppro(): void {
    // Charger les demandes en cours ou envoyées pour les afficher dans le select
    const params = { statut: 'EnCours,Envoyée' };

    this.demandeApproService.getAll(params).subscribe({
      next: (response) => {
        this.demandesAppro = response.data.map((demande: any) => ({
          label: `${demande.numero} - ${demande.demandeur?.prenom || ''} ${demande.demandeur?.nom || ''} (${demande.detail_demandes?.length || 0} produits)`,
          value: demande.id,
          data: demande
        }));
      }
    });
  }

  onDemandeApproChange(event: any): void {
    const demandeId = event.value;
    if (!demandeId) {
      this.selectedDemandeId = null;
      return;
    }

    this.selectedDemandeId = demandeId;

    // Charger les détails de la demande
    this.demandeApproService.getById(demandeId).subscribe({
      next: (demande) => {
        // Vider le tableau actuel
        while (this.produitsArray.length > 0) {
          this.produitsArray.removeAt(0);
        }

        // Ajouter les produits de la demande
        if (demande.detail_demandes && demande.detail_demandes.length > 0) {
          demande.detail_demandes.forEach((detail: any) => {
            const produit = this.produits.find(p => p.id === detail.produit_id);
            const ligne = this.fb.group({
              produit_id: [detail.produit_id, Validators.required],
              quantite: [detail.quantite_demandee, [Validators.required, Validators.min(1)]],
              prix_unitaire: [produit?.prix_achat || 0, [Validators.required, Validators.min(0)]]
            });
            this.produitsArray.push(ligne);
          });

          this.messageService.add({
            severity: 'success',
            summary: 'Demande chargée',
            detail: `${demande.detail_demandes.length} produit(s) chargé(s) depuis la demande ${demande.numero}`,
            life: 3000
          });
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Attention',
            detail: 'Aucun produit trouvé dans cette demande',
            life: 3000
          });
          // Ajouter au moins une ligne vide
          this.produitsArray.push(this.createLigneProduit());
        }
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors du chargement de la demande',
          life: 3000
        });
      }
    });
  }

  initForm(): void {
    this.commandeForm = this.fb.group({
      fournisseur_id: ['', Validators.required],
      date_commande: [new Date(), Validators.required],
      date_livraison_prevue: [null],
      produits: this.fb.array([this.createLigneProduit()])
    });

    this.produitsArray.valueChanges.subscribe(() => {
      this.updatePrix();
    });
  }

  createLigneProduit(): FormGroup {
    return this.fb.group({
      produit_id: ['', Validators.required],
      quantite: [1, [Validators.required, Validators.min(1)]],
      prix_unitaire: [0, [Validators.required, Validators.min(0)]]
    });
  }

  loadFournisseurs(): void {
    this.fournisseurService.getAll().subscribe({
      next: (response) => {
        this.fournisseurs = response.data;
      }
    });
  }

  loadProduits(): void {
    this.produitService.getAll().subscribe({
      next: (response) => {
        this.produits = response.data;
      }
    });
  }

  get produitsArray(): FormArray {
    return this.commandeForm.get('produits') as FormArray;
  }

  ajouterLigne(): void {
    this.produitsArray.push(this.createLigneProduit());
  }

  supprimerLigne(index: number): void {
    if (this.produitsArray.length > 1) {
      this.produitsArray.removeAt(index);
    }
  }

  updatePrix(): void {
    this.produitsArray.controls.forEach((control, index) => {
      const produitId = control.get('produit_id')?.value;
      if (produitId) {
        const produit = this.produits.find(p => p.id === produitId);
        if (produit) {
          control.patchValue({
            prix_unitaire: produit.prix_achat
          }, { emitEvent: false });
        }
      }
    });
  }

  calculerSousTotal(index: number): number {
    const ligne = this.produitsArray.at(index);
    const quantite = ligne.get('quantite')?.value || 0;
    const prixUnitaire = ligne.get('prix_unitaire')?.value || 0;
    return quantite * prixUnitaire;
  }

  get montantTotal(): number {
    let total = 0;
    for (let i = 0; i < this.produitsArray.length; i++) {
      total += this.calculerSousTotal(i);
    }
    return total;
  }

  onSubmit(): void {
    if (this.commandeForm.invalid) {
      Object.keys(this.commandeForm.controls).forEach(key => {
        this.commandeForm.get(key)?.markAsTouched();
      });
      this.produitsArray.controls.forEach(control => {
        Object.keys((control as FormGroup).controls).forEach(key => {
          control.get(key)?.markAsTouched();
        });
      });
      return;
    }

    this.loading = true;
    const formData = {
      ...this.commandeForm.value,
      date_commande: this.formatDate(this.commandeForm.value.date_commande),
      date_livraison_prevue: this.commandeForm.value.date_livraison_prevue
        ? this.formatDate(this.commandeForm.value.date_livraison_prevue)
        : null
    };

    this.commandeService.create(formData).subscribe({
      next: (response) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Commande créée avec succès'
        });

        // Si une demande d'approvisionnement a été sélectionnée, marquer la demande comme traitée
        if (this.selectedDemandeId) {
          this.traiterDemandeApprovisionnement(response.commande.id, this.selectedDemandeId);
        } else {
          this.loading = false;
          this.router.navigate(['/commandes-achat', response.commande.id]);
        }
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: error.error?.message || 'Une erreur est survenue'
        });
        this.loading = false;
      }
    });
  }

  traiterDemandeApprovisionnement(commandeId: number, demandeId: number): void {
    const commentaire = `Commande d'achat #${commandeId} créée pour cette demande.`;

    this.demandeApproService.traiter(demandeId, commentaire).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Demande traitée',
          detail: 'La demande d\'approvisionnement a été marquée comme traitée',
          life: 5000
        });
        this.loading = false;
        // Rediriger vers les détails de la demande d'approvisionnement
        this.router.navigate(['/demandes-approvisionnement', demandeId]);
      },
      error: () => {
        this.messageService.add({
          severity: 'warn',
          summary: 'Attention',
          detail: 'La commande a été créée mais la demande n\'a pas pu être marquée comme traitée automatiquement',
          life: 5000
        });
        this.loading = false;
        // Rediriger vers les détails de la commande même en cas d'erreur
        this.router.navigate(['/commandes-achat', commandeId]);
      }
    });
  }

  annuler(): void {
    this.router.navigate(['/commandes-achat']);
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('fr-FR') + ' FCFA';
  }

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}