let dbm;
let type;
let seed;

exports.setup = function (options: unknown, seedLink: unknown) {
    // @ts-ignore
    dbm = options.dbmigrate;
    type = dbm.dataType;
    seed = seedLink;
};

exports.up = function (db: unknown) {
    // @ts-ignore
    return db.runSql(`
		create table IF NOT EXISTS persons
		(
			id         int auto_increment,
			first_name varchar(50) not null,
			last_name  varchar(50) not null,
			job_title  varchar(50) not null,
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

exports.down = function (db: unknown) {
    // @ts-ignore
    return db.runSql(`DROP TABLE IF EXISTS persons`);
};

exports._meta = {
    version: 1,
};
