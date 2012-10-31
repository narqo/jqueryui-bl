var PATH = require('path'),
    FS = require('fs'),
    BEM = require('bem'),
    ESPRIMA = require('esprima'),
    Q = BEM.require('q');


function trim(s) {
    return ('' + s).replace(/^(?:\s)+([^\s]+)(?:\s)*/, '$1');
}


MAKE.decl('Arch', {

    libraries : {

        'common.blocks/i-jquery-ui' : {
            type : 'git',
            url : 'git://github.com/jquery/jquery-ui.git',
            treeish : '1.9.1',
            npmPacakges : false
        }

    },

    createCustomNodes : function(common, libs) {

        var node = new (MAKE.getNodeClass('BuildLibrary'))({
                id : 'buildme',
                root : this.root,
                targets : libs
            });

        this.arch.setNode(node, libs);

        return node.getId();

    }

});


MAKE.decl('BuildLibrary', 'Node', {

    __constructor : function(o) {

        this.root = o.root;
        this.targets = o.targets;

        this.__base(o);

    },

    make : function() {

        this.targets.forEach(function(lib) {
            this._buildFromSource(lib);
        }, this);

    },

    _buildFromSource : function(lib) {

        var _this = this,
            level = BEM.createLevel(PATH.resolve(this.root, 'common.blocks')),
            libPath = PATH.resolve(this.root, 'common.blocks', 'i-jquery-ui'),
            decl;

        this._filterSources().forEach(function(file) {

            if(!(decl = _this._parseItemName(file)))
                return;

            var prefix = level.getByObj(decl),
                p;

            BEM.util.readFile(PATH.resolve(libPath, 'ui', file))
                .then(function(res) {

                    var head = ESPRIMA.parse(res, { comment: true }),
                        meta = {
                            title: '',
                            depends: []
                        };

                    head = head.comments ? head.comments[0].value : '';

                    meta.title = _this._getItemTitle(head);
                    meta.depends = _this._getItemDepends(head);

                    var techs = ['js', 'deps.js', 'title.txt'].map(function(tech) {
                        return _this._storeCreateResults(level, tech, meta, prefix, res);
                    });

                    return Q.all(techs);

                })
                .fin();

            var css = PATH.resolve(libPath, 'themes/base', PATH.basename(file, '.js') + '.css');

            BEM.util.isExists(css) && BEM.util.readFile(css).then(function(res) {

                _this._storeCreateResults(level, 'css', null, prefix, res);

            })
            .fin();

        }, this);

    },

    _filterSources : function() {

        var mask = /^jquery\.ui\./;
        return BEM.util.getFiles(PATH.resolve(
                this.root, 'common.blocks', 'i-jquery-ui', 'ui')).filter(function(file) {
                    return file.match(mask);
                });

    },

    _parseItemName : function(name) {

        var match = /^jquery\.ui\.([a-z]+)(?:-([a-z]+))?\.js$/,
            decl, elem, mod, val,
            m;

        m = match.exec(name);

        if(!m) return;

        elem = m[1];
        mod = '';
        val = '';

        m[2] && (mod = m[2], val = 'yes');

        decl = {
            block: 'i-jqueryui',
            elem: elem,
            mod: mod,
            val: val
        };

        return decl;

    },

    _getItemTitle : function(data) {

        var title = data.split('\n *');

        return title[1] ? trim(title[1].replace('@VERSION', '')) : '';

    },

    _getItemDescription : function(data) {

        // TODO

    },

    _getItemDepends : function(data) {

        var depends = /Depends:.*(?:\s+\*\s+([^*]+)\n)+/mi.exec(data);
        if(!depends) return [];

        return depends[0].split('\n *').slice(1).map(function(item) {
                return item.replace(/^(?:\s)+([^\s]+)(?:\s)*/, '$1');
            });

    },

    _getItemSourceJs : function() {

        // TODO

    },

    _getItemSourceStyles : function() {

        // TODO

    },

    _storeCreateResults : function(level, techName, meta, prefix, res) {

        var tech = level.getTech(techName),
            data,
            result = {};

        switch(techName) {

        case 'js':
            data = res;
            break;

        case 'deps.js':
            data = '(' + JSON.stringify({ mustDeps: meta.depends.map(this._parseItemName, this) },
                    null, 4) + ')\n';
            break;

        case 'title.txt':
            data = meta.title || PATH.basename(prefix)
            break;

        default:
            data = res;
            break;

        }

        result[techName] = data

        return tech.storeCreateResults(prefix, result, true);
    }

}, {

    createId : function(o) {
        return o.id
    }

});
