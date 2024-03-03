import Repository from '@/utils/abstractions/repository.abstract';
import { RowDataPacket } from 'mysql2/promise';
import { GroupResult } from '@/resources/group/group.type';
import HttpException from '@/utils/exceptions/http.exception';
import DatabaseConnection from '@/database/databaseConnection';
import PersonRepository from "@/resources/person/person.repository";

class GroupRepository extends Repository {
    public constructor() {
        super();
        this.table = '`groups`';
    }

    public async all() {
        const db = await DatabaseConnection.getInstanceAsync();
        let tree: RowDataPacket;
        const toTree = function (items: RowDataPacket[], root: null|RowDataPacket) {
            let filteredItems: RowDataPacket[] = Array.from(items);

            if (root !== null) {
                filteredItems = items.filter((i) => i.parent_id === root.id);
                return filteredItems;
            }

            for (const item of filteredItems) {
                item.groups = [];

                if (item.parent_id === null && root === null) {
                    tree = item;
                }

                item.groups = toTree(items, item);
            }
        }

        const result = (await db.query(`
            SELECT g.id,
                   g.parent_id,
                   g.lft,
                   g.name,
                   JSON_ARRAYAGG(JSON_OBJECT('id', p.id, 'first_name', p.first_name,
                                             'last_name', p.last_name)) AS persons
            FROM ${this.table} g
                     JOIN persons p ON g.id = p.group_id
            GROUP BY g.id, g.lft
            ORDER BY g.lft`))[0] as RowDataPacket[];

        toTree(result, null);
        return tree;
    }

    public async create(name: string, parentId: null | number) {
        const db = await DatabaseConnection.getInstanceAsync();

        const getParentBounds = async (): Promise<GroupResult> => {
            if (parentId === null) {
                const [result] = await db.execute(`SELECT lft, rgt
                                                   FROM ${this.table}
                                                   WHERE parent_id IS NULL`);

                if ((result as []).length) {
                    throw new HttpException(400, 'Root group already exists');
                }

                return {
                    lft: 0,
                    rgt: 1,
                };
            }

            const [result] = await (db.execute(
                `SELECT lft, rgt
                 FROM ${this.table}
                 WHERE id = ?`,
                [parentId]
            ) as Promise<RowDataPacket[]>);

            if (!(result as []).length) {
                throw new Error(`Node with id of ${parentId} not found.`);
            }

            return (result as []).pop();
        };

        const parentBounds: GroupResult = await getParentBounds();

        try {
            await db.beginTransaction();
            await db.execute(
                `UPDATE ${this.table}
                 SET rgt = rgt + 2
                 WHERE rgt >= ?`,
                [parentBounds.rgt]
            );
            await db.execute(
                `UPDATE ${this.table}
                 SET lft = lft + 2
                 WHERE lft > ?`,
                [
                    parentBounds.rgt - parentBounds.lft === 1 ||
                    !parentBounds.lft
                        ? parentBounds.lft
                        : parentBounds.rgt,
                ]
            );
            await db.execute(
                `INSERT INTO ${this.table} (lft, rgt, parent_id, name)
                 VALUES (?, ?, ?, ?)`,
                [parentBounds.rgt, parentBounds.rgt + 1, parentId, name]
            );
            await db.commit();
        } catch (e) {
            await db.rollback();
            throw e;
        }

        return {
            name,
            parentId,
        };
    }

    public async update(
        id: number,
        fields: { name?: string; parent_id?: number }
    ) {
        const db = await DatabaseConnection.getInstanceAsync();
        const [current] = await db.execute(
            `SELECT name, parent_id
             FROM ${this.table}
             WHERE id = ?`,
            [id]
        );

        if (!(current as []).length) {
            throw new HttpException(404, `Node id of ${id} does not exist`);
        }

        const currentNode: GroupResult = (current as []).pop();

        if (fields.name) {
            await db.execute(
                `
                    UPDATE ${this.table}
                    SET name = ?
                    WHERE id = ?
                `,
                [fields.name, id]
            );

            if (!fields.parent_id) {
                // cache invalidation
                return {
                    name: fields.name,
                };
            }
        }

        const [parent] = await db.execute(
            `SELECT name, parent_id, lft, rgt
             FROM ${this.table}
             WHERE id = ?`,
            [fields.parent_id]
        );

        if (!(parent as []).length) {
            throw new HttpException(
                404,
                `Node id of ${fields.parent_id} does not exist`
            );
        }

        const newParentNode: GroupResult = (current as []).pop();

        if (newParentNode.parent_id === id) {
            throw new HttpException(
                400,
                'Cannot have the father and child nodes to switch roles'
            );
        }

        const nodeSize: number = currentNode.rgt - currentNode.lft + 1;

        try {
            await db.beginTransaction();

            // temporary "remove" moving node
            await db.execute(
                `
                    UPDATE ${this.table}
                    SET lft = 0 - (lft),
                        rgt = 0 - (rgt)
                    WHERE lft >= ?
                      AND rgt <= ?
                `,
                [currentNode.lft, currentNode.rgt]
            );

            // decrease left and/or right position values of currently 'lower' items (and parents)
            await db.execute(
                `
                    UPDATE ${this.table}
                    SET lft = (lft) - ?
                    WHERE lft > ?
                `,
                [nodeSize, currentNode.rgt]
            );
            await db.execute(
                `
                    UPDATE ${this.table}
                    SET rgt = (rgt) - ?
                    WHERE rgt > ?
                `,
                [nodeSize, currentNode.rgt]
            );

            // increase left and/or right position values of future 'lower' items (and parents)
            await db.execute(
                `
                    UPDATE ${this.table}
                    SET lft = (lft) + ?
                    WHERE lft >=
                          IF(? > ?, ? - ?, ?)
                `,
                [
                    nodeSize,
                    newParentNode.rgt,
                    currentNode.rgt,
                    newParentNode.rgt,
                    nodeSize,
                    newParentNode.rgt,
                ]
            );
            await db.execute(
                `
                    UPDATE ${this.table}
                    SET rgt = (rgt) + ?
                    WHERE rgt >=
                          IF(? > ?, ? - ?, ?)
                `,
                [
                    nodeSize,
                    newParentNode.rgt,
                    currentNode.rgt,
                    newParentNode.rgt,
                    nodeSize,
                    newParentNode.rgt,
                ]
            );

            // move node (ant its sub-nodes) and update its parent item id
            await db.execute(
                `
                    UPDATE ${this.table}
                    SET lft = 0 - (lft) +
                              IF(? > ?, ? - ? - 1,
                                 ? - ? - 1 + ?),
                        rgt = 0 - (rgt) +
                              IF(? > ?, ? - ? - 1,
                                 ? - ? - 1 + ?)
                    WHERE lft <= 0 - ?
                      AND rgt >= 0 - ?
                `,
                [
                    newParentNode.rgt,
                    currentNode.rgt,
                    newParentNode.rgt,
                    currentNode.rgt,
                    newParentNode.rgt,
                    currentNode.rgt,
                    nodeSize,
                    newParentNode.rgt,
                    currentNode.rgt,
                    newParentNode.rgt,
                    currentNode.rgt,
                    newParentNode.rgt,
                    currentNode.rgt,
                    nodeSize,
                    currentNode.lft,
                    currentNode.rgt,
                ]
            );
            await db.execute(
                `
                    UPDATE ${this.table}
                    SET parent_id = ?
                    WHERE id = ?
                `,
                [fields.parent_id, id]
            );
            await db.commit();
        } catch (e) {
            await db.rollback();
            throw e;
        }

        // cache invalidation
        return {
            parent_id: fields.parent_id,
        };
    }

    public async delete(id: null | number) {
        const db = await DatabaseConnection.getInstanceAsync();
        const [current] = await db.execute(
            `SELECT lft, rgt, (rgt - lft + 1) as depth
             FROM ${this.table}
             WHERE id = ?`,
            [id]
        );

        if (!(current as []).length) {
            throw new HttpException(404, `Node id of ${id} does not exist`);
        }

        const currentNode: GroupResult = (current as []).pop();

        try {
            await db.beginTransaction();
            await db.execute(
                `DELETE
                 FROM ${this.table}
                 WHERE lft BETWEEN ? AND ?`,
                [currentNode.lft, currentNode.rgt]
            );
            await db.execute(
                `UPDATE ${this.table}
                 SET rgt = rgt - ?
                 WHERE rgt > ?`,
                [currentNode.depth, currentNode.rgt]
            );
            await db.execute(
                `UPDATE ${this.table}
                 SET lft = lft - ?
                 WHERE lft > ?`,
                [currentNode.depth, currentNode.lft]
            );
            await db.commit();
        } catch (e) {
            await db.rollback();
            throw e;
        }
        // update cache
    }
}

export default GroupRepository;
