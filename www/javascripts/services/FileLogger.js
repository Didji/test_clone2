angular.module("smartgeomobile").factory("FileLogger", [
    "Right",
    function(Right) {
        return {
            /**
             * @name log
             * @desc Ajoute une ligne de log dans un fichier. On tente d'abord d'enregistrer sur la carte SD
             *       sinon dans le dossier /android/data/com.gismartware.mobile/cache/
             * @param {String} msg Message a logger
             * @param {String} logDir Dossier dans lequel enregistrer le log
             * @param {String} filename Nom du fichier
             */
            log: function(msg, logDir, filename) {
                // Par défaut on enregistre les logs dans le fichier /logs/smartgeomobile.log
                if (!logDir) {
                    logDir = "logs";
                }
                if (!filename) {
                    filename = "smartgeomobile";
                }
                filename += ".txt";

                // Formatage du message à logger
                var dateLog = new Date();
                var formated_message = dateLog.toLocaleString("fr-FR") + " : " + msg + "\n";
                console.debug(formated_message);

                // Est-on en mode debug ?
                var debug = Right.get("debug");
                // Si oui, les logs sont ajouté dans le fichier de log spécifié
                if (window.cordova && debug) {
                    window.resolveLocalFileSystemURL(
                        "file:///storage/extSdCard/Android/data/com.gismartware.mobile/cache/",
                        function(dir) {
                            dir.getDirectory(logDir, { create: true }, function(logSynchroDir) {
                                logSynchroDir.getFile(filename, { create: true }, function(file) {
                                    if (!file) {
                                        return;
                                    }
                                    file.createWriter(
                                        function(fileWriter) {
                                            fileWriter.seek(fileWriter.length);
                                            fileWriter.write(formated_message);
                                        },
                                        function(error) {
                                            console.error(error);
                                        }
                                    );
                                });
                            });
                        },
                        function(err) {
                            window.resolveLocalFileSystemURL(
                                cordova.file.externalCacheDirectory,
                                function(dir) {
                                    dir.getDirectory(logDir, { create: true }, function(logSynchroDir) {
                                        logSynchroDir.getFile(filename, { create: true }, function(file) {
                                            if (!file) {
                                                return;
                                            }
                                            file.createWriter(
                                                function(fileWriter) {
                                                    fileWriter.seek(fileWriter.length);
                                                    fileWriter.write(formated_message);
                                                },
                                                function(error) {
                                                    console.error(error);
                                                }
                                            );
                                        });
                                    });
                                },
                                function(error) {
                                    console.error(JSON.stringify(error));
                                }
                            );
                        }
                    );
                    return this;
                } else {
                    return;
                }
            }
        };
    }
]);
