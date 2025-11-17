# Fix Backend - Filtrage des statuts multiples

## 🐛 Problème

Actuellement, le backend Laravel ne gère pas correctement le filtrage par plusieurs statuts.

Quand le frontend envoie :
```
GET /api/demandes-approvisionnement?statut=EnCours,Envoyée
```

Le backend fait :
```php
$query->where('statut', $request->statut);
// Cela cherche exactement le statut "EnCours,Envoyée" qui n'existe pas
```

## ✅ Solution

Modifiez la méthode `index()` dans le contrôleur `DemandeApprovisionnementController.php` :

### Avant :
```php
// Filtres supplémentaires
if ($request->has('statut')) {
    $query->where('statut', $request->statut);
}
```

### Après :
```php
// Filtres supplémentaires
if ($request->has('statut')) {
    // Gérer plusieurs statuts séparés par des virgules
    if (strpos($request->statut, ',') !== false) {
        $statuts = explode(',', $request->statut);
        $query->whereIn('statut', $statuts);
    } else {
        $query->where('statut', $request->statut);
    }
}
```

## 📝 Explication

Cette modification permet de :
- ✅ Gérer un seul statut : `?statut=EnCours`
- ✅ Gérer plusieurs statuts : `?statut=EnCours,Envoyée`
- ✅ Améliorer les performances (moins de données transférées)

## 🔄 Code complet de la méthode index()

```php
public function index(Request $request)
{
    $user = auth()->user();
    $query = DemandeApprovisionnement::with([
        'demandeur',
        'destinataire',
        'detailDemandes.produit'
    ]);

    // Filtrer selon le rôle
    if ($user->role === 'GestionnaireStock') {
        // Le gestionnaire voit ses demandes
        $query->where('demandeur_id', $user->id);
    } elseif ($user->role === 'AgentApprovisionnement') {
        // L'agent voit les demandes qui lui sont assignées
        $query->where('destinataire_id', $user->id)
            ->orWhere('statut', 'Envoyée'); // Ou toutes les envoyées non assignées
    }

    // Filtres supplémentaires - MODIFICATION ICI
    if ($request->has('statut')) {
        // Gérer plusieurs statuts séparés par des virgules
        if (strpos($request->statut, ',') !== false) {
            $statuts = explode(',', $request->statut);
            $query->whereIn('statut', $statuts);
        } else {
            $query->where('statut', $request->statut);
        }
    }

    if ($request->has('priorite')) {
        $query->where('priorite', $request->priorite);
    }

    $demandes = $query->orderBy('created_at', 'desc')->paginate(20);

    return response()->json($demandes);
}
```

## 🧪 Tests

Après modification, testez avec :

```bash
# Un seul statut
GET /api/demandes-approvisionnement?statut=EnCours

# Plusieurs statuts
GET /api/demandes-approvisionnement?statut=EnCours,Envoyée

# Doit retourner uniquement les demandes avec statut EnCours ou Envoyée
```

## 📊 Impact

**Avant** :
- Frontend récupère toutes les demandes (tous statuts)
- Filtre côté client uniquement
- Plus de données transférées sur le réseau

**Après** :
- Backend filtre à la source
- Frontend reçoit uniquement les données nécessaires
- Meilleure performance

## ⚠️ Note

Le frontend a été modifié pour filtrer côté client en attendant cette correction backend. Une fois le backend corrigé, le double filtrage ne posera pas de problème et garantira que seules les demandes non traitées s'affichent.

## 🎯 Résultat attendu

Dans le dropdown "Charger une demande d'approvisionnement" sur la page nouvelle commande :
- ✅ Affiche uniquement les demandes avec statut "EnCours" ou "Envoyée"
- ❌ N'affiche PAS les demandes "Traitée", "Rejetée", "Annulée" ou "Brouillon"
