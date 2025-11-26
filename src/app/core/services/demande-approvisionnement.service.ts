import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.prod';
import { DemandeApprovisionnement, PaginatedResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class DemandeApprovisionnementService {
  private apiUrl = `${environment.apiUrl}/demandes-approvisionnement`;

  constructor(private http: HttpClient) {}

  getAll(params?: any): Observable<PaginatedResponse<DemandeApprovisionnement>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) httpParams = httpParams.append(key, params[key]);
      });
    }
    return this.http.get<PaginatedResponse<DemandeApprovisionnement>>(this.apiUrl, { params: httpParams });
  }

  getById(id: number): Observable<DemandeApprovisionnement> {
    return this.http.get<DemandeApprovisionnement>(`${this.apiUrl}/${id}`);
  }

  create(demande: any): Observable<any> {
    return this.http.post(this.apiUrl, demande);
  }

  envoyer(id: number, destinataireId?: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/envoyer`, { destinataire_id: destinataireId });
  }

  prendrEnCharge(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/prendre-en-charge`, {});
  }

  traiter(id: number, commentaire?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/traiter`, { commentaire });
  }

  rejeter(id: number, commentaire: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/rejeter`, { commentaire });
  }

  annuler(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/annuler`, {});
  }

  getAgents(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/agents/liste`);
  }

  getStatistiques(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats/global`);
  }

  // Obtenir le nombre de demandes en attente (Envoyée + EnCours)
  getDemandesEnAttenteCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/count/en-attente`);
  }
}