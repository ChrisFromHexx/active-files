var ActiveFiles, CompositeDisposable;

CompositeDisposable = require('atom').CompositeDisposable;

var fs = require('fs')
var path = require('path')
var readline = require('readline');

var customCSS='\
.tree-view .entry.file {\n\tdisplay: none; /* toggle-comment */\n}\n\n\
.tree-view .entry.directory > .header {\n\tdisplay: block;\n}\n\n\
.tree-view .entry.file.status-modified {\n\tdisplay: block;\n}\n\n\
.tree-view .entry.file.status-added {\n\tdisplay: block;\n}\n\n'

module.exports = ActiveFiles = {
	subscriptions: null,
	activate: function(state)
	{
		this.subscriptions = new CompositeDisposable;
		return this.subscriptions.add(atom.commands.add('atom-workspace',
		{
			'active-files:toggle': (function(_this)
			{
				return function()
				{
					return _this.toggle();
				};
			})(this)
		}));
	},
	deactivate: function()
	{
		return this.subscriptions.dispose();
	},
	toggle: function()
	{
		 var styleSheetPath =atom.styles.getUserStyleSheetPath()
		// console.log('active-files was toggled! '+styleSheetPath);
     start(styleSheetPath)
	}
};



if (typeof String.prototype.startsWith != 'function')
{
	String.prototype.startsWith = function(str)
	{
		return this.slice(0, str.length) == str;
	};
}


function rename(fromFile, toFile, callback)
{
	fs.rename(fromFile, toFile, function(err)
	{
		if (err)
		{
			console.error('ERROR: ' + err);
			return;
		}
		else
		{
			return callback()
		}
	});
}

function start(cssFilename)
{

	fs.exists(cssFilename, function(exists)
	{
		if (exists)
		{
			processFile(cssFilename)
		}
	});
}

function processFile(filename)
{
	var lines = []
	var foundToggle = 0
	var rd = readline.createInterface(
	{
		input: fs.createReadStream(filename),
		output: process.stdout,
		terminal: false
	});

	rd.on('line', function(line)
	{
		lines.push(line)
	});

	rd.on('close', function(line)
	{
		var buildFile = filename + ".build"
		var tempFile = filename + ".tmp"

		var file = fs.createWriteStream(buildFile);
		file.on('error', function(err)
		{
			console.error(err);
		});

		lines.forEach(function(text)
		{
			var matches = text.match(/\s*(\/\*|)\s*(.*?)\s*(\/\*|)\s*toggle-comment\s*\*\/\s*/)

			if (matches)
			{
				foundToggle = 1
					//console.log(matches);
				var commment = matches[1]
				var content = matches[2]
				if (commment.startsWith("/*"))
				{
					text = content + " /* toggle-comment */"
				}
				else
				{
					text = "/* " + content + " toggle-comment */"
				}
			}

			file.write(text + '\n');
		});

		if (!foundToggle)
		{
			file.write(customCSS + '\n');
		}

		file.end();

		rename(filename, tempFile, function()
		{
			rename(buildFile, filename, function()
			{
				fs.unlink(tempFile, function() {})
			})
		})
	})
}
