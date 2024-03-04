import { RowDataPacket } from 'mysql2/promise';
import util from 'util';
import 'dotenv/config';
import DatabaseConnection from '@/database/databaseConnection.js';

async function run(): Promise<void> {
    const db = await DatabaseConnection.getInstanceAsync();

    const [results, fields] = await db.query<RowDataPacket[]>(
        'SELECT * FROM `groups2` ORDER BY parent_id'
    );

    tree2console(results, null);
    console.log(util.inspect(representation, false, null, true));
    nice(representation);
}

let representation: RowDataPacket[] = [];

function tree2console(items: RowDataPacket[], root: null | RowDataPacket) {
    let filteredItems: RowDataPacket[] = Array.from(items);

    if (root !== null) {
        filteredItems = items.filter((i) => i.parent_id === root.id);
        return filteredItems;
    }

    for (const item of filteredItems) {
        item.children = [];

        if (item.parent_id === null && root === null) {
            representation.push(item);
        }

        item.children = tree2console(items, item);
    }
}

function nice(items: RowDataPacket[], prefix = '-') {
    for (const item of items) {
        console.log('\n' + prefix + `[${item.id}] ${item.name}`);
        nice(item.children, prefix + '-');
    }
}

run();
