import { RowDataPacket } from 'mysql2/promise';
import 'dotenv/config';
import DatabaseConnection from '@/database/databaseConnection.js';
import process from 'process';

async function run(): Promise<void> {
    const db = await DatabaseConnection.getInstanceAsync();

    const [results, fields] = await db.query<RowDataPacket[]>(
        'SELECT * FROM `groups` ORDER BY parent_id'
    );

    tree2console(results, null);
    // console.log(util.inspect(representation, false, null, true));
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
    const padding = (number: number | null, maxLength: number = 3) => {
        if (!number) {
            return number;
        }

        const length: number = String(number).length;
        return `${number}${' '.repeat(maxLength - length)}`;
    };

    for (const item of items) {
        console.log(
            '\n' +
                prefix +
                `   [LFT: ${padding(item.lft)}] [RGT: ${padding(item.rgt)}] [ID: ${padding(item.id)}] [PARENT: ${padding(item.parent_id)}] ${item.name}`
        );
        console.log(`${' '.repeat(prefix.length)}   |`);
        nice(item.children, prefix + '-');
    }
}

await run();
process.exit(0);
