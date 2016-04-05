var ActiveFiles, CompositeDisposable;

CompositeDisposable = require('atom').CompositeDisposable;

var fs = require('fs')
var path = require('path')
var readline = require('readline');

var customCSS = '\
.tree-view .entry.file {\n\tdisplay: none; /* toggle-comment */\n}\n\n\
.tree-view .entry.directory :not(.status-modified) > .header {\n\tdisplay: none;  /* toggle-folder-comment */\n}\n\n\
.tree-view .entry.directory > .header {\n\tdisplay: block;\n}\n\n\
.tree-view .entry.file.status-modified {\n\tdisplay: block;\n}\n\n\
.tree-view .entry.file.status-added {\n\tdisplay: block;\n}\n\n'

module.exports = ActiveFiles = {
    subscriptions: null,
    config: {
        hideFiles: {
            'title': 'Hide files and folders',
            'description': 'Enable this to hide any files and folders that have not been modified.',
            'type': 'boolean',
            'default': false
        },
        hideUnusedFoldersWhenActive: {
            'title': 'Hide unmodified folder trees',
            'description': 'Disable this to reveal all folders.',
            'type': 'boolean',
            'default': true
        }
    },
    activate: function(state) {
        this.subscriptions = new CompositeDisposable;

        //atom.config.onDidChange 'active-files.hideFiles', (newValue) ->             console.log 'My configuration changed:', newValue
        atom.config.onDidChange('active-files.hideFiles', function(newValue) {
            console.log('My files configuration changed:', newValue);
            var styleSheetPath = atom.styles.getUserStyleSheetPath()
            return start(styleSheetPath)
        });

        atom.config.onDidChange('active-files.hideUnusedFoldersWhenActive', function(newValue) {
            console.log('My folders configuration changed:', newValue);
            var styleSheetPath = atom.styles.getUserStyleSheetPath()
            return start(styleSheetPath)
        });

        return this.subscriptions.add(atom.commands.add('atom-workspace', {
            'active-files:toggle': (function(_this) {
                return function() {
                    return _this.toggle();
                };
            })(this),
            'active-files:folders': (function(_this) {
                return function() {
                    return _this.folders();
                };
            })(this)

        }));
    },
    deactivate: function() {
        return this.subscriptions.dispose();
    },
    toggle: function() {
        var hideFiles = atom.config.get("active-files.hideFiles")
        return atom.config.set("active-files.hideFiles", hideFiles ? false : true)
    },
    folders: function() {
        var hideFolders = atom.config.get("active-files.hideUnusedFoldersWhenActive")
        return atom.config.set("active-files.hideUnusedFoldersWhenActive", hideFolders ? false : true)
    }
};



if (typeof String.prototype.startsWith != 'function') {
    String.prototype.startsWith = function(str) {
        return this.slice(0, str.length) == str;
    };
}


function rename(fromFile, toFile, callback) {
    fs.rename(fromFile, toFile, function(err) {
        if (err) {
            console.error('ERROR: ' + err);
            return;
        } else {
            return callback()
        }
    });
}

function start(cssFilename) {

    fs.exists(cssFilename, function(exists) {
        if (exists) {
            processFile(cssFilename)
        }
    });
}

function processFile(filename) {
    var lines = []
    var foundToggle = 0
    var rd = readline.createInterface({
        input: fs.createReadStream(filename),
        output: process.stdout,
        terminal: false
    });

    rd.on('line', function(line) {
        lines.push(line)
    });

    rd.on('close', function(line) {
        var buildFile = filename + ".build"
        var tempFile = filename + ".tmp"

        var file = fs.createWriteStream(buildFile);
        file.on('error', function(err) {
            console.error(err);
        });

        var hideFolders = atom.config.get("active-files.hideUnusedFoldersWhenActive")
        var hideFiles = atom.config.get("active-files.hideFiles")
        console.log('active-files hideFiles:' + hideFiles + ' hideFolders:' + hideFolders);

        lines.forEach(function(text) {

            var matches = text.match(/\s*(\/\*|)\s*(.*?)\s*(\/\*|)\s*toggle-comment\s*\*\/\s*/)
            if (matches) {
                foundToggle = 1
                    //console.log(matches);
                var commment = matches[1]
                var content = matches[2]

                //  var active = commment.startsWith("/*")

                if (hideFiles) {
                    text = "\t" + content + " /* toggle-comment */"
                } else {
                    text = "/* " + content + " toggle-comment */"
                }

            }

            //    if (folder) {
            //	if (hideFolders) {
            var matchesFolder = text.match(/\s*(\/\*|)\s*(.*?)\s*(\/\*|)\s*toggle-folder-comment\s*\*\/\s*/)
            if (matchesFolder) {
                foundToggle = 1
                    //console.log(matches);
                    //	var commment = matchesFolder[1]
                var content = matchesFolder[2]

                if (hideFolders && hideFiles) {
                    text = "\t" + content + " /* toggle-folder-comment */"
                } else {
                    text = "/* " + content + " toggle-folder-comment */"
                }
            }
            //    }
            file.write(text + '\n');
        });

        if (!foundToggle) {
            file.write(customCSS + '\n');
        }

        file.end();

        rename(filename, tempFile, function() {
            rename(buildFile, filename, function() {
                fs.unlink(tempFile, function() {})
            })
        })
    })
}
