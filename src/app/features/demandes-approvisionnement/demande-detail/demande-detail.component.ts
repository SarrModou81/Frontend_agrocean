import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DemandeApprovisionnementService } from '../../../core/services/demande-approvisionnement.service';
import { DemandeApprovisionnement } from '../../../core/models';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-demande-detail',
  templateUrl: './demande-detail.component.html',
  styleUrls: ['./demande-detail.component.scss']
})
export class DemandeDetailComponent implements OnInit {
  demande: DemandeApprovisionnement | null = null;
  loading = false;
  isGestionnaireStock = false;
  isAgentApprovisionnement = false;

  showTraiterDialog = false;
  showRejeterDialog = false;
  showEnvoiDialog = false;

  commentaireTraitement = '';
  commentaireRejet = '';
  selectedDestinataire: number | null = null;
  agents: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private demandeService: DemandeApprovisionnementService,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.isGestionnaireStock = this.authService.isGestionnaireStock();
    this.isAgentApprovisionnement = this.authService.isAgentApprovisionnement();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadDemande(+id);
    }

    if (this.isGestionnaireStock) {
      this.loadAgents();
    }
  }

  loadDemande(id: number): void {
    this.loading = true;
    this.demandeService.getById(id).subscribe({
      next: (data) => {
        this.demande = data;
        this.loading = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors du chargement de la demande'
        });
        this.loading = false;
        this.router.navigate(['/demandes-approvisionnement']);
      }
    });
  }

  loadAgents(): void {
    this.demandeService.getAgents().subscribe({
      next: (data) => {
        this.agents = data.map(agent => ({
          label: `${agent.prenom} ${agent.nom}`,
          value: agent.id
        }));
      }
    });
  }

  retour(): void {
    this.router.navigate(['/demandes-approvisionnement']);
  }

  // Actions Gestionnaire Stock
  envoyerDemande(): void {
    this.selectedDestinataire = null;
    this.showEnvoiDialog = true;
  }

  confirmerEnvoi(): void {
    if (!this.demande) return;

    this.loading = true;
    this.demandeService.envoyer(this.demande.id!, this.selectedDestinataire || undefined).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Demande envoyée avec succès'
        });
        this.showEnvoiDialog = false;
        this.loading = false;
        this.loadDemande(this.demande!.id!);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors de l\'envoi'
        });
        this.loading = false;
      }
    });
  }

  annulerDemande(): void {
    if (!this.demande) return;

    this.confirmationService.confirm({
      message: `Voulez-vous vraiment annuler la demande ${this.demande.numero} ?`,
      header: 'Confirmation d\'annulation',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Oui, annuler',
      rejectLabel: 'Non',
      accept: () => {
        this.demandeService.annuler(this.demande!.id!).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: 'Demande annulée'
            });
            this.loadDemande(this.demande!.id!);
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Erreur',
              detail: 'Erreur lors de l\'annulation'
            });
          }
        });
      }
    });
  }

  // Actions Agent Approvisionnement
  prendrEnCharge(): void {
    if (!this.demande) return;

    this.confirmationService.confirm({
      message: `Voulez-vous prendre en charge la demande ${this.demande.numero} ?`,
      header: 'Confirmation',
      icon: 'pi pi-check',
      acceptLabel: 'Oui, prendre en charge',
      rejectLabel: 'Annuler',
      accept: () => {
        this.demandeService.prendrEnCharge(this.demande!.id!).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: 'Demande prise en charge'
            });
            this.loadDemande(this.demande!.id!);
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Erreur',
              detail: 'Erreur lors de la prise en charge'
            });
          }
        });
      }
    });
  }

  ouvrirDialogTraiter(): void {
    // Rediriger vers la création de commande d'achat
    this.router.navigate(['/commandes-achat/create']);
  }

  confirmerTraiter(): void {
    // Cette méthode n'est plus utilisée car le traitement se fait via la commande d'achat
    // Gardée pour compatibilité
  }

  ouvrirDialogRejeter(): void {
    this.commentaireRejet = '';
    this.showRejeterDialog = true;
  }

  confirmerRejeter(): void {
    if (!this.demande) return;

    if (!this.commentaireRejet.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Attention',
        detail: 'Veuillez saisir un commentaire de rejet'
      });
      return;
    }

    this.loading = true;
    this.demandeService.rejeter(this.demande.id!, this.commentaireRejet).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Demande rejetée'
        });
        this.showRejeterDialog = false;
        this.loading = false;
        this.loadDemande(this.demande!.id!);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors du rejet'
        });
        this.loading = false;
      }
    });
  }

  // Helpers
  canEnvoyer(): boolean {
    return this.isGestionnaireStock && this.demande?.statut === 'Brouillon';
  }

  canAnnuler(): boolean {
    return this.isGestionnaireStock &&
           this.demande?.statut !== 'Traitée' &&
           this.demande?.statut !== 'Rejetée' &&
           this.demande?.statut !== 'Annulée';
  }

  canPrendrEnCharge(): boolean {
    return this.isAgentApprovisionnement && this.demande?.statut === 'Envoyée';
  }

  canTraiter(): boolean {
    return this.isAgentApprovisionnement &&
           (this.demande?.statut === 'Envoyée' || this.demande?.statut === 'EnCours');
  }

  canRejeter(): boolean {
    return this.isAgentApprovisionnement &&
           (this.demande?.statut === 'Envoyée' || this.demande?.statut === 'EnCours');
  }

  getStatutSeverity(statut: string): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' {
    const severityMap: Record<string, 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast'> = {
      'Brouillon': 'secondary',
      'Envoyée': 'info',
      'EnCours': 'warning',
      'Traitée': 'success',
      'Rejetée': 'danger',
      'Annulée': 'contrast'
    };
    return severityMap[statut] || 'info';
  }

  getStatutLabel(statut: string): string {
    const labelMap: Record<string, string> = {
      'Brouillon': 'Brouillon',
      'Envoyée': 'Envoyée',
      'EnCours': 'En Cours',
      'Traitée': 'Traitée',
      'Rejetée': 'Rejetée',
      'Annulée': 'Annulée'
    };
    return labelMap[statut] || statut;
  }

  getPrioriteSeverity(priorite: string): 'success' | 'warning' | 'danger' {
    const severityMap: Record<string, 'success' | 'warning' | 'danger'> = {
      'Normale': 'success',
      'Urgente': 'warning',
      'Critique': 'danger'
    };
    return severityMap[priorite] || 'success';
  }

  getTotalQuantite(): number {
    if (!this.demande?.detail_demandes) return 0;
    return this.demande.detail_demandes.reduce((sum, detail) => sum + detail.quantite_demandee, 0);
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}