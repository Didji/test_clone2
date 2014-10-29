Intents
-------

* OI :
    * [sur équipement](http://localhost:12345/#/intent/map?map_target=2407301&report_target=2407301&map_marker=true&report_activity=496401&map_activity=496401&map_zoom=18&report_mission=12345&report_url_redirect=https:%2F%2Fgoogle.fr) - doit positionner un marqueur sur un équipement, en cliquant dessus on doit pouvoir accéder au formulaire de l'activité passé en paramêtre, le compte rendu doit être associé à un équipement et doit être envoyé avec un identifiant de mission.
    ```javascript
    {
        "assets": 2407301,
        "activity": 496401,
        "mission": 12345,
        "site": "GIVILLE MOBILE (69) ",
        "fields": {
            "496457": "2014-12-31",
            "89228837": "N",
            "89229081": "N",
            "89229570": "d"
        },
        "ged": [],
        "uuid": "a4bf169d-2023-4024-9adc-944e3cf44c27",
        "timestamp": 1414600164681,
        "isCall": false
    }
    ```


    * [sur X,Y](http://localhost:12345/#/intent/map?map_target=45.80307994417619,4.773500561714172&report_target=45.80307994417619,4.773500561714172&map_marker=true&report_activity=496401&map_activity=496401&map_zoom=18&report_mission=12345&report_url_redirect=https:%2F%2Fgoogle.fr) - doit positionner un marqueur sur une position précise,en cliquant dessus on doit pouvoir accéder au formulaire de l'activité passé en paramêtre, le compte rendu doit être associé à une position X,Y
    ```javascript
    {
        "assets": [],
        "activity": 496401,
        "mission": 12345,
        "site": "GIVILLE MOBILE (69) ",
        "fields": {
            "496457": "2014-01-01",
            "89228837": "N",
            "89229081": "N",
            "89229570": "ss"
        },
        "ged": [],
        "uuid": "1c929e8c-1585-4d81-9d82-c4f2ce2ff54d",
        "timestamp": 1414601002794,
        "isCall": false,
        "latlng": "45.80307994417619,4.773500561714172"
    }
    ```


    * [sur X,Y et équipement](http://localhost:12345/#/intent/map?map_target=2407301%3B45.80307994417619,4.773500561714172&report_target=2407301%3B45.80307994417619,4.773500561714172&map_marker=true&report_activity=496401&map_activity=496401&map_zoom=18&report_mission=12345&report_url_redirect=https:%2F%2Fgoogle.fr) - doit positionner un marqueur sur un équipement, en cliquant dessus on doit pouvoir accéder au formulaire de l'activité passé en paramêtre, le compte rendu doit être associé à un équipement et doit être envoyé avec un identifiant de mission et une position X,Y
    ```javascript
    {
        "assets": 2407301,
        "activity": 496401,
        "mission": 12345,
        "site": "GIVILLE MOBILE (69) ",
        "fields": {
            "496457": "2014-01-01",
            "89228837": "N",
            "89229081": "N",
            "89229570": "d"
        },
        "ged": [],
        "uuid": "ea104c29-b9d6-4f85-bfd8-ffcdf61b5593",
        "timestamp": 1414601216951,
        "isCall": false,
        "latlng": "45.80307994417619,4.773500561714172"
    }
    ```


* RI :
    * [sur équipement](http://localhost:12345/#/intent/map?map_target=2407301&report_target=2407301&map_marker=true&report_activity=496401&map_activity=496401&map_zoom=18&report_url_redirect=https:%2F%2Fgoogle.fr) - doit positionner un marqueur sur un équipement, en cliquant dessus on doit pouvoir accéder au formulaire de l'activité passé en paramêtre,le compte rendu doit être associé à un équipement
    ```javascript
    {
        "assets": 2407301,
        "activity": 496401,
        "mission": null,
        "site": "GIVILLE MOBILE (69) ",
        "fields": {
            "496457": "2014-12-31",
            "89228837": "N",
            "89229081": "N",
            "89229570": "d"
        },
        "ged": [],
        "uuid": "a4bf169d-2023-4024-9adc-944e3cf44c27",
        "timestamp": 1414600164681,
        "isCall": false
    }
    ```


    * [sur X,Y](http://localhost:12345/#/intent/map?map_target=45.80307994417619,4.773500561714172&report_target=45.80307994417619,4.773500561714172&map_marker=true&report_activity=496401&map_activity=496401&map_zoom=18&report_url_redirect=https:%2F%2Fgoogle.fr) - doit positionner un marqueur sur une position précise, en cliquant dessus on doit pouvoir accéder au formulaire de l'activité passé en paramêtre, le compte rendu doit être associé à une position X,Y
    ```javascript
    {
        "assets": [],
        "activity": 496401,
        "mission": null,
        "site": "GIVILLE MOBILE (69) ",
        "fields": {
            "496457": "2014-01-01",
            "89228837": "N",
            "89229081": "N",
            "89229570": "ss"
        },
        "ged": [],
        "uuid": "1c929e8c-1585-4d81-9d82-c4f2ce2ff54d",
        "timestamp": 1414601002794,
        "isCall": false,
        "latlng": "45.80307994417619,4.773500561714172"
    }
    ```


    * [sur X,Y et équipement](http://localhost:12345/#/intent/map?map_target=2407301%3B45.80307994417619,4.773500561714172&report_target=2407301%3B45.80307994417619,4.773500561714172&map_marker=true&report_activity=496401&map_activity=496401&map_zoom=18&report_url_redirect=https:%2F%2Fgoogle.fr) - doit positionner un marqueur sur un équipement, en cliquant dessus on doit pouvoir accéder au formulaire de l'activité passé en paramêtre, le compte rendu doit être associé à un équipement et doit être envoyé avec une position X,Y
    ```javascript
    {
        "assets": 2407301,
        "activity": 496401,
        "mission": 12345,
        "site": "GIVILLE MOBILE (69) ",
        "fields": {
            "496457": "2014-01-01",
            "89228837": "N",
            "89229081": "N",
            "89229570": "d"
        },
        "ged": [],
        "uuid": "ea104c29-b9d6-4f85-bfd8-ffcdf61b5593",
        "timestamp": 1414601216951,
        "isCall": false,
        "latlng": "45.80307994417619,4.773500561714172"
    }
    ```
