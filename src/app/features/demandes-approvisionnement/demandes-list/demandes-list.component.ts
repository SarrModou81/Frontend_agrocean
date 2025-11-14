import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DemandeApprovisionnementService } from '../../../core/services/demande-approvisionnement.service';
import { DemandeApprovisionnement } from '../../../core/models';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-demandes-list',
  templateUrl: './demandes-list.component.html',
  styleUrls: ['./demandes-list.component.scss']
})
export class DemandesListComponent implements OnInit {
  demandes: DemandeApprovisionnement[] = [];
  loading = false;
  stats: any = null;
  isGestionnaireStock = false;

  totalRecords = 0;
  currentPage = 1;
  pageSize = 20;

  selectedStatut: string = '';
  selectedPriorite: string = '';

  showEnvoiDialog = false;
  selectedDemande: DemandeApprovisionnement | null = null;
  selectedDestinataire: number | null = null;
  agents: any[] = [];

  statuts = [
    { label: 'Brouillon', value: 'Brouillon' },
    { label: 'Envoyée', value: 'Envoyée' },
    { label: 'En Cours', value: 'EnCours' },
    { label: 'Traitée', value: 'Traitée' },
    { label: 'Rejetée', value: 'Rejetée' },
    { label: 'Annulée', value: 'Annulée' }
  ];

  priorites = [
    { label: 'Normale', value: 'Normale' },
    { label: 'Urgente', value: 'Urgente' },
    { label: 'Critique', value: 'Critique' }
  ];

  constructor(
    private demandeService: DemandeApprovisionnementService,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isGestionnaireStock = this.authService.isGestionnaireStock();
    this.loadStatistiques();
    this.loadDemandes();
    if (this.isGestionnaireStock) {
      this.loadAgents();
    }
  }

  loadStatistiques(): void {
    this.demandeService.getStatistiques().subscribe({
      next: (data) => {
        this.stats = data;
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

  loadDemandes(): void {
    this.loading = true;
    const params: any = {
      page: this.currentPage,
      per_page: this.pageSize
    };

    if (this.selectedStatut) {
      params.statut = this.selectedStatut;
    }

    if (this.selectedPriorite) {
      params.priorite = this.selectedPriorite;
    }

    this.demandeService.getAll(params).subscribe({
      next: (response) => {
        this.demandes = response.data;
        this.totalRecords = response.total;
        this.loading = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors du chargement des demandes'
        });
        this.loading = false;
      }
    });
  }

  nouvelleDemande(): void {
    this.router.navigate(['/demandes-approvisionnement/create']);
  }

  voirDetails(demande: DemandeApprovisionnement): void {
    this.router.navigate(['/demandes-approvisionnement', demande.id]);
  }

  envoyerDemande(demande: DemandeApprovisionnement): void {
    this.selectedDemande = demande;
    this.selectedDestinataire = null;
    this.showEnvoiDialog = true;
  }

  confirmerEnvoi(): void {
    if (!this.selectedDemande) return;

    this.loading = true;
    this.demandeService.envoyer(this.selectedDemande.id!, this.selectedDestinataire || undefined).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Demande envoyée avec succès'
        });
        this.showEnvoiDialog = false;
        this.loading = false;
        this.loadDemandes();
        this.loadStatistiques();
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

  prendrEnCharge(demande: DemandeApprovisionnement): void {
    this.confirmationService.confirm({
      message: `Prendre en charge la demande ${demande.numero} ?`,
      header: 'Confirmation',
      icon: 'pi pi-check',
      accept: () => {
        this.demandeService.prendrEnCharge(demande.id!).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: 'Demande prise en charge'
            });
            this.loadDemandes();
            this.loadStatistiques();
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

  annulerDemande(demande: DemandeApprovisionnement): void {
    this.confirmationService.confirm({
      message: `Annuler la demande ${demande.numero} ?`,
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.demandeService.annuler(demande.id!).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: 'Demande annulée'
            });
            this.loadDemandes();
            this.loadStatistiques();
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

  applyFilters(): void {
    this.currentPage = 1;
    this.loadDemandes();
  }

  clearFilters(): void {
    this.selectedStatut = '';
    this.selectedPriorite = '';
    this.applyFilters();
  }

  onPageChange(event: any): void {
    this.currentPage = event.page + 1;
    this.pageSize = event.rows;
    this.loadDemandes();
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

  getPrioriteSeverity(priorite: string): 'success' | 'warning' | 'danger' {
    const severityMap: Record<string, 'success' | 'warning' | 'danger'> = {
      'Normale': 'success',
      'Urgente': 'warning',
      'Critique': 'danger'
    };
    return severityMap[priorite] || 'success';
  }
}