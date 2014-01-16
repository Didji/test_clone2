![Smartgeo Mobile - Abra](https://raw.github.com/gismartwaredev/smartgeomobile/dev/images/smartgeo-abra.png?token=487387__eyJzY29wZSI6IlJhd0Jsb2I6Z2lzbWFydHdhcmVkZXYvc21hcnRnZW9tb2JpbGUvZGV2L2ltYWdlcy9zbWFydGdlby1hYnJhLnBuZyIsImV4cGlyZXMiOjEzOTAyMzQwNzR9--af30b103f1680bf298d4094740b36839a47a9722 "Logo")

# Push d'appels

### Fonctionnalité

La fonctionnalité doit permettre de pouvoir envoyer en temps réél des "Appels" sur la mobilité. 

Un appel est composé de : 
* Date de prise d'appel
* Date limite de prise en charge
* Un caractère d'urgence
* Localisation (rue + détails)
* Un raison d'appel 
* Un motif d'appel 
* Une commune
* Une liste d'objet (ou non)

Dans un premier temps serveur devra renvoyer une liste d'appels via le même service qui renvoie actuellement les ordres de travail (showOT.json).

### Temps réél 

Un nouveau service devra être créé. Ce service tournera en boucle tant qu'aucune mission(OT) ou appel n'a été inserée en base depuis le début de la requête HTTP. Si une nouvelle mission est trouvée en base, il répond au service avec une réponse vide (ou pleine, mais le contenu sera ignoré) et un status OK (200).

Entre deux requêtes à la base de données, le processus devra libérer la session et s'endormir pendant un certain temps (20 secondes ou moins ... :shipit: ). 

## Webservice GiMAP 

### Réponse actuelle du service showOT.json

```javascript
{
  "results": {
    "439287439": {
      "id": 439287439,
      "number": 4403,
      "begin": "09/01/2014 17:17",
      "end": "09/01/2014 17:18",
      "activity": {
        "id": "882722",
        "label": "Tournée de nuit luminaire"
      },
      "assets": [
        2406999,
        2407301
      ],
      "done": [
        2407033,
        2407077
      ]
    }
  }
}
```

### Exemple de réponse pour un appel

```javascript
{
  "results": {
    "2154": {
      "id"          : 2154,
      "begin"       : "09/01/2014 17:17",    // Prise d'appel
      "end"         : "09/01/2014 17:18",    // Date limite de prise en charge
      "emergency"   : true,                  // Booléen, urgence ou non
      "description" : "En face de l'église", // (facultatif)
      "city"        : "Lyon",                // Commune (facultatif)
      "address"     : "18 rue Leynaud",      // rue + localisation précise (facultatif)
      "reason"      : "Intervention ligne",  // Raison d'appel
      "cause"       : "Problème",            // Motif
      "assets"      : [                      // Liste des objets sur lequels il pourrait y avoir un CR (facultatif)
        2406999,
        2407301
      ],
      "done"        : [                       // Liste des objets sur lequels un CR a déjà été saisi (facultatif)
        2407033,
        2407045,
        2407077
      ]
    }
  }
}
```

## Interface mobilité

Les appels seront affichés dans le planning au même titre qu'une mission (ordre de travail)

Les appels ayant un caractère d'urgence devront rester sur l'interface, de manière visible (en rouge), tant que l'utilisateur n'a pas indiqué qu'il l'avait vu (en cliquant dessus par exemple).

Le block 'appel' dans le planning sera très semblable au block 'mission':
* Le nom (raison+motif) sera affiché à la place du numéro de mission 
* Le caractère d'urgence définira la couleur de l'appel. Si l'appel est urgent, il sera mis en valeur (en tête rouge par exemple)
* En cliquant sur un appel, il s'ouvrira. Si l'appel possède des identifiants d'objet, ceux ci seront marqués sur la carte.
* Un bouton permettra de localiser l'appel. Si l'appel n'a aucun identifiant d'asset, ce bouton sera disabled 
* Un fonction sera disponible dans la consultation si un appel est ouvert : 
  - "Ajouter cet objet à l'appel n°#"
  - "Saisir un CR pour l'appel n°#"
* Contrairement a une mission un appel ne peut pas être terminé, on peut toujours y ajouter des objets, et ce jusqu'a ce que l'appel soit clôturé depuis GiMAP.
