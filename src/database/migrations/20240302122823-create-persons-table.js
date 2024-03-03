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
		create table IF NOT EXISTS persons
		(
			id         int auto_increment,
			first_name varchar(50) not null,
			last_name  varchar(50) not null,
			group_id   int         not null,
			created_at datetime default (now()) not null,
			updated_at datetime default (now()) not null on update CURRENT_TIMESTAMP,
			constraint id
				primary key (id),
			constraint persons_group___fk
				foreign key (group_id) references \`groups\` (id)
					on delete cascade
		);
	`);
};

exports.down = function(db) {
	return db.runSql(`DROP TABLE IF EXISTS persons`);
};

exports._meta = {
	"version": 1
};
