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

> (On se posera la question du temps réél plus tard)

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


