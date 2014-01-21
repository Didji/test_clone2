![GI](http://gismartware.com/images/logo.png) 

# Push d'appels :telephone:

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

Les appels doivent être filtés : 
* seuls les appels en cours doivent arriver sur la mobilité
* seuls les appels concernant les sites accessibles par l'utilisateur doivent remonter

### Temps réél - Polling

Un nouveau service devra être créé. Ce service tournera en boucle tant qu'aucune mission (OT) n'a été planifiée pour l'équipe de l'utilisateur ou tant qu'aucun appel n'a été passé à l'état "en cours" depuis le début de la requête HTTP. Si une nouvelle mission a été assignée à son équipe ou si un appel a changé d'état pour passer "en cours", il répond au service avec une réponse vide (ou pleine, mais le contenu sera ignoré) et un status OK (200).

Le service devra libérer la session avant d'entamer la boucle de requête. Entre deux requêtes à la base de données, le processus devra s'endormir pendant un certain temps (5 secondes). 

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
      "assets": [2406999, 2407301],
      "done": [2407033, 2407077]
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
      "assets"      : [24063999,  24073041], // Liste des objets sur lequels il pourrait y avoir un CR (facultatif)
      "done"        : [24056999,  24047301]  // Liste des objets sur lequels un CR a déjà été saisi (facultatif)
      ]
    }
  }
}
```

### Enregistrement d'un CR lié à un appel

Le service à faire évoluer est `gi.maintenance.mobility.report`. Actuellement ce service attend les informations suivantes :

```javascript
  {
    "assets":[2407053],
    "fields": {
      "27799430":"N"
    },
    "mission":439287439,
    "activity":"882722",
    "uuid":"fe8a946c-2bbd-4319-8cc3-f76b47de5e1c"
  }
```

Pour un appel on rajoutera un flag `isCall`, qui sera à `false` par défaut et passera à `true` si le CR concerne un appel : 

```javascript
  {
    "assets":[2407053],
    "fields": {
      "27799430":"N"
    },
    "mission":439287439,
    "activity":"882722",
    "uuid":"fe8a946c-2bbd-4319-8cc3-f76b47de5e1c"
  }
```

Le numéro d'appel (id appel) sera dans l'attribut `mission`. Sinon le fonctionnement reste le même.

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
* A partir du moment où un objet a été associé à un appel, seul ce type d'objet (okey) pourra y être associé par la suite. 
