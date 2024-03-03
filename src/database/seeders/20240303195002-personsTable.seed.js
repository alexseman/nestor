
let dbm;
let type;
let seed;

exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db) {
	return null;
};

exports.down = function(db) {
	return null;
};

exports._meta = {
  "version": 1
};
