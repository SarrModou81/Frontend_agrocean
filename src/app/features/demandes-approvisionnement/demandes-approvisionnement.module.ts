import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { CalendarModule } from 'primeng/calendar';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { BadgeModule } from 'primeng/badge';

// Components
import { DemandesListComponent } from './demandes-list/demandes-list.component';
import { DemandeCreateComponent } from './demande-create/demande-create.component';
import { DemandeDetailComponent } from './demande-detail/demande-detail.component';

const routes: Routes = [
  { path: '', component: DemandesListComponent },
  { path: 'create', component: DemandeCreateComponent },
  { path: ':id', component: DemandeDetailComponent }
];

@NgModule({
  declarations: [
    DemandesListComponent,
    DemandeCreateComponent,
    DemandeDetailComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    ReactiveFormsModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    DropdownModule,
    ToastModule,
    ConfirmDialogModule,
    CardModule,
    TagModule,
    TooltipModule,
    CalendarModule,
    InputNumberModule,
    MessageModule,
    InputTextareaModule,
    ProgressSpinnerModule,
    BadgeModule
  ]
})
export class DemandesApprovisionnementModule { }
