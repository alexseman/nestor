let dbm;
let type;
let seed;

exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db) {

	return db.runSql(`
		create table IF NOT EXISTS \`groups\`
		(
			id         int auto_increment,
			lft        int         not null,
			rgt        int         not null,
			parent_id  int null,
			name       varchar(50) not null,
			created_at datetime default (now()) not null,
			updated_at datetime default (now()) not null on update CURRENT_TIMESTAMP
			constraint id
				primary key (id)
		);
	`);
};

exports.down = function(db) {
  return db.runSql(`DROP TABLE IF EXISTS groups`);
};

exports._meta = {
  "version": 12
};
