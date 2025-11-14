import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DemandeApprovisionnementService } from '../../../core/services/demande-approvisionnement.service';
import { ProduitService } from '../../../core/services/produit.service';
import { Produit } from '../../../core/models';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-demande-create',
  templateUrl: './demande-create.component.html',
  styleUrls: ['./demande-create.component.scss']
})
export class DemandeCreateComponent implements OnInit {
  demandeForm!: FormGroup;
  loading = false;
  loadingRupture = false;
  produits: Produit[] = [];

  priorites = [
    { label: 'Normale', value: 'Normale' },
    { label: 'Urgente', value: 'Urgente' },
    { label: 'Critique', value: 'Critique' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private demandeService: DemandeApprovisionnementService,
    private produitService: ProduitService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadProduits();
  }

  initForm(): void {
    this.demandeForm = this.fb.group({
      date_demande: [new Date(), Validators.required],
      priorite: ['Normale', Validators.required],
      motif: [''],
      produits: this.fb.array([this.createLigneProduit()])
    });
  }

  createLigneProduit(): FormGroup {
    return this.fb.group({
      produit_id: ['', Validators.required],
      quantite_demandee: [1, [Validators.required, Validators.min(1)]],
      justification: ['']
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
    return this.demandeForm.get('produits') as FormArray;
  }

  ajouterLigne(): void {
    this.produitsArray.push(this.createLigneProduit());
  }

  supprimerLigne(index: number): void {
    if (this.produitsArray.length > 1) {
      this.produitsArray.removeAt(index);
    }
  }

  ajouterProduitsRupture(): void {
    this.loadingRupture = true;
    this.produitService.verifierStock().subscribe({
      next: (data) => {
        const produitsRupture = [...(data.rupture || []), ...(data.faible_stock || [])];
        
        if (produitsRupture.length === 0) {
          this.messageService.add({
            severity: 'info',
            summary: 'Information',
            detail: 'Aucun produit en rupture ou stock faible'
          });
          this.loadingRupture = false;
          return;
        }

        // Supprimer les lignes vides existantes
        while (this.produitsArray.length > 0) {
          this.produitsArray.removeAt(0);
        }

        // Ajouter les produits en rupture
        produitsRupture.forEach(produit => {
          const quantiteRecommandee = Math.max(
            produit.seuil_minimum - (produit.stock_total || 0),
            produit.seuil_minimum
          );

          this.produitsArray.push(this.fb.group({
            produit_id: [produit.id, Validators.required],
            quantite_demandee: [quantiteRecommandee, [Validators.required, Validators.min(1)]],
            justification: ['Stock faible ou en rupture']
          }));
        });

        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: `${produitsRupture.length} produit(s) ajouté(s)`
        });
        this.loadingRupture = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors du chargement des produits'
        });
        this.loadingRupture = false;
      }
    });
  }

  onProduitChange(index: number): void {
    const ligne = this.produitsArray.at(index);
    const produitId = ligne.get('produit_id')?.value;
    
    if (produitId) {
      const produit = this.produits.find(p => p.id === produitId);
      if (produit && produit.stock_total !== undefined && produit.stock_total < produit.seuil_minimum) {
        const quantiteRecommandee = Math.max(
          produit.seuil_minimum - produit.stock_total,
          produit.seuil_minimum
        );
        ligne.patchValue({
          quantite_demandee: quantiteRecommandee
        });
      }
    }
  }

  getStockActuel(index: number): string {
    const produitId = this.produitsArray.at(index).get('produit_id')?.value;
    if (!produitId) return '-';
    
    const produit = this.produits.find(p => p.id === produitId);
    return produit?.stock_total?.toString() || '0';
  }

  getSeuilMinimum(index: number): string {
    const produitId = this.produitsArray.at(index).get('produit_id')?.value;
    if (!produitId) return '-';
    
    const produit = this.produits.find(p => p.id === produitId);
    return produit?.seuil_minimum?.toString() || '0';
  }

  getStockSeverity(index: number): 'success' | 'warning' | 'danger' {
    const produitId = this.produitsArray.at(index).get('produit_id')?.value;
    if (!produitId) return 'success';
    
    const produit = this.produits.find(p => p.id === produitId);
    if (!produit) return 'success';
    
    const stock = produit.stock_total || 0;
    const seuil = produit.seuil_minimum || 0;
    
    if (stock === 0) return 'danger';
    if (stock < seuil) return 'warning';
    return 'success';
  }

  getTotalQuantite(): number {
    let total = 0;
    for (let i = 0; i < this.produitsArray.length; i++) {
      total += this.produitsArray.at(i).get('quantite_demandee')?.value || 0;
    }
    return total;
  }

  onSubmit(): void {
    if (this.demandeForm.invalid) {
      Object.keys(this.demandeForm.controls).forEach(key => {
        this.demandeForm.get(key)?.markAsTouched();
      });
      this.produitsArray.controls.forEach(control => {
        Object.keys((control as FormGroup).controls).forEach(key => {
          control.get(key)?.markAsTouched();
        });
      });
      return;
    }

    if (this.produitsArray.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Attention',
        detail: 'Ajoutez au moins un produit'
      });
      return;
    }

    this.loading = true;
    const formData = {
      ...this.demandeForm.value,
      date_demande: this.formatDate(this.demandeForm.value.date_demande)
    };

    this.demandeService.create(formData).subscribe({
      next: (response) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Demande créée avec succès'
        });
        this.loading = false;
        this.router.navigate(['/demandes-approvisionnement', response.demande.id]);
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

  annuler(): void {
    this.router.navigate(['/demandes-approvisionnement']);
  }

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  getPrioriteSeverity(priorite: string): 'success' | 'warning' | 'danger' {
    const severityMap: Record<string, 'success' | 'warning' | 'danger'> = {
      'Normale': 'success',
      'Urgente': 'warning',
      'Critique': 'danger'
    };
    return severityMap[priorite] || 'success';
  }
}