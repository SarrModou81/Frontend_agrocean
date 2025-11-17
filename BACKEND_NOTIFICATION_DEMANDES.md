# Instructions Backend - Notification Demandes d'Approvisionnement

## 📋 Modifications à effectuer dans le backend Laravel

### 1. Ajouter la méthode dans le contrôleur

**Fichier** : `app/Http/Controllers/DemandeApprovisionnementController.php`

Ajoutez cette méthode dans la classe `DemandeApprovisionnementController` :

```php
/**
 * Compter les demandes en attente (Envoyée + EnCours)
 */
public function countEnAttente(Request $request)
{
    $user = auth()->user();

    if ($user->role === 'AgentApprovisionnement') {
        // Pour l'agent : compter les demandes Envoyée (non assignées) + EnCours (assignées à lui)
        $count = DemandeApprovisionnement::where(function($query) use ($user) {
            $query->where('statut', 'Envoyée')
                  ->orWhere(function($q) use ($user) {
                      $q->where('statut', 'EnCours')
                        ->where('destinataire_id', $user->id);
                  });
        })->count();
    } elseif ($user->role === 'Administrateur') {
        // Pour l'admin : toutes les demandes en attente
        $count = DemandeApprovisionnement::whereIn('statut', ['Envoyée', 'EnCours'])->count();
    } else {
        $count = 0;
    }

    return response()->json(['count' => $count]);
}
```

### 2. Ajouter la route

**Fichier** : `routes/api.php`

Ajoutez cette route **AVANT** la ligne `Route::apiResource` pour les demandes d'approvisionnement :

```php
// Compter les demandes en attente
Route::get('/demandes-approvisionnement/count/en-attente', [DemandeApprovisionnementController::class, 'countEnAttente']);

// Routes existantes
Route::apiResource('demandes-approvisionnement', DemandeApprovisionnementController::class);
Route::post('/demandes-approvisionnement/{id}/envoyer', [DemandeApprovisionnementController::class, 'envoyer']);
Route::post('/demandes-approvisionnement/{id}/prendre-en-charge', [DemandeApprovisionnementController::class, 'prendrEnCharge']);
Route::post('/demandes-approvisionnement/{id}/traiter', [DemandeApprovisionnementController::class, 'traiter']);
Route::post('/demandes-approvisionnement/{id}/rejeter', [DemandeApprovisionnementController::class, 'rejeter']);
Route::post('/demandes-approvisionnement/{id}/annuler', [DemandeApprovisionnementController::class, 'annuler']);
Route::get('/demandes-approvisionnement/agents/liste', [DemandeApprovisionnementController::class, 'getAgents']);
Route::get('/demandes-approvisionnement/stats/global', [DemandeApprovisionnementController::class, 'statistiques']);
```

⚠️ **IMPORTANT** : La route `count/en-attente` DOIT être placée **AVANT** `Route::apiResource` sinon elle ne fonctionnera pas (Laravel interpréterait "count" comme un ID).

### 3. Tester l'API

Une fois les modifications effectuées, testez l'endpoint :

```bash
# Requête GET (avec authentification)
GET http://localhost:8000/api/demandes-approvisionnement/count/en-attente

# Réponse attendue
{
    "count": 5
}
```

## ✅ Fonctionnement Frontend

Une fois le backend configuré, le frontend affichera automatiquement :

### Pour l'Agent d'Approvisionnement :
- 📥 **Icône de boîte** (pi-inbox) dans la navbar
- **Badge bleu** avec le nombre de demandes en attente
- Tooltip : "Demandes d'approvisionnement en attente"
- **Clic** : redirige vers `/demandes-approvisionnement`
- **Rafraîchissement automatique** toutes les 30 secondes

### Pour l'Administrateur :
- 🔔 **Icône de cloche** (pi-bell) pour les alertes de stock (rouge)
- 📥 **Icône de boîte** (pi-inbox) pour les demandes d'appro (bleu)
- Les deux notifications sont visibles simultanément

### Logique de comptage :

**Agent d'Approvisionnement** :
- Demandes avec statut "Envoyée" (non assignées, disponibles pour tous les agents)
- Demandes avec statut "EnCours" ET `destinataire_id = agent_id` (assignées à cet agent)

**Administrateur** :
- Toutes les demandes avec statut "Envoyée" ou "EnCours"

## 🎨 Apparence dans la Navbar

```
┌────────────────────────────────────────────────────────────────┐
│  ☰  AGROCEAN              🔔(3)  📥(5)  👤 Jean Dupont  🚪     │
│                            │     │      │              │       │
│                       Alertes  Demandes  Profil    Déconnexion │
└────────────────────────────────────────────────────────────────┘
```

- 🔔(3) = 3 alertes de stock (rouge) - visible pour Admin et Gestionnaire de Stock
- 📥(5) = 5 demandes d'appro (bleu) - visible pour Admin et Agent d'Approvisionnement

## 🔄 Mise à jour automatique

Le compteur se met à jour automatiquement :
- **Au chargement de la page**
- **Toutes les 30 secondes** via un polling automatique
- **Après une action** (envoi, prise en charge, traitement d'une demande)

## 📝 Notes importantes

1. **Protection de la route** : Assurez-vous que la route est protégée par le middleware `auth:sanctum`
2. **Performance** : La requête compte uniquement, elle ne charge pas les données complètes des demandes
3. **Cache** : Si vous utilisez du cache, pensez à l'invalider lors des changements de statut
4. **Tests** : Testez avec différents rôles (Agent, Admin, Gestionnaire) pour vérifier les permissions

## 🐛 Debugging

Si le compteur ne s'affiche pas :

1. **Vérifiez la console du navigateur** (F12) pour voir les erreurs
2. **Vérifiez l'ordre des routes** dans `routes/api.php`
3. **Vérifiez l'authentification** de l'utilisateur
4. **Testez l'endpoint** manuellement avec Postman ou curl
5. **Vérifiez que les demandes existent** avec les bons statuts dans la base de données

```bash
# Test avec curl
curl -X GET http://localhost:8000/api/demandes-approvisionnement/count/en-attente \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"
```

## ✨ Résultat Final

Après ces modifications, l'Agent d'Approvisionnement verra en temps réel le nombre de demandes qui nécessitent son attention, améliorant ainsi la réactivité et l'efficacité du workflow d'approvisionnement.
