import { RowDataPacket } from 'mysql2/promise';
import Repository from '../../utils/abstractions/repository.abstract.js';
import { GroupResult } from './group.type.js';
import HttpException from '../../utils/exceptions/http.exception.js';

class GroupRepository extends Repository {
    static table: string = '`groups`';

    public constructor() {
        super();
    }

    public async subGroupsLinear(startNodeId: number, filters: object) {
        const params: string | number[] = [startNodeId];
        const filterStrings: string[] = Object.keys(filters).map(
            (k: string): string => {
                // @ts-ignore
                params.push(filters[k]);
                return ` AND p.${k} LIKE CONCAT("%", REPLACE("?", "'", ""), "%")`;
            }
        );

        return (
            await this.db.query(
                `
                    SELECT g.id,
                           g.name,
                           g.parent_id,
                           g.lft,
                           JSON_ARRAYAGG(IF(p.id IS NULL, NULL, JSON_OBJECT('id', p.id, 'first_name', p.first_name,
                                                                            'last_name', p.last_name, 'job_title',
                                                                            p.job_title))) AS persons
                    FROM ${GroupRepository.table} AS parent,
                         ${GroupRepository.table} AS g
                             LEFT JOIN persons p ON g.id = p.group_id
                    WHERE 1
                      AND parent.id = ?
                      AND g.lft > parent.lft
                      AND g.rgt < parent.rgt
                        ${filterStrings.join('')}
                    GROUP BY g.id, g.lft
                    ORDER BY g.lft`,
                params
            )
        )[0] as RowDataPacket[];
    }

    public async all() {
        let tree: RowDataPacket;

        // TODO: make this a module
        const toTree = function (
            items: RowDataPacket[],
            root: null | RowDataPacket
        ) {
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

                if (Array.isArray(item.persons) && !item.persons.pop()) {
                    delete item.persons;
                }

                item.groups = toTree(items, item);

                if (Array.isArray(item.persons) && !item.persons.pop()) {
                    delete item.persons;
                }

                if (!item.groups.length) {
                    delete item.groups;
                }
            }
        };

        const result = (
            await this.db.query(`
                SELECT g.id,
                       g.parent_id,
                       g.lft,
                       g.name,
                       JSON_ARRAYAGG(IF(p.id IS NULL, NULL, JSON_OBJECT('id', p.id, 'first_name', p.first_name,
                                                                        'last_name', p.last_name, 'job_title',
                                                                        p.job_title))) AS persons
                FROM ${GroupRepository.table} AS g
                         LEFT JOIN persons p ON g.id = p.group_id
                GROUP BY g.id, g.lft
                ORDER BY g.lft`)
        )[0] as RowDataPacket[];

        toTree(result, null);
        return tree;
    }

    public async create(name: string, parentId: null | number) {
        const getParentBounds = async (): Promise<GroupResult> => {
            if (parentId === null) {
                const [result] = await this.db.execute(`SELECT lft, rgt
                                                        FROM ${GroupRepository.table}
                                                        WHERE parent_id IS NULL`);

                if ((result as []).length) {
                    throw new HttpException(400, 'Root group already exists');
                }

                return {
                    lft: 0,
                    rgt: 1,
                };
            }

            const [result] = await (this.db.execute(
                `SELECT lft, rgt
                 FROM ${GroupRepository.table}
                 WHERE id = ?`,
                [parentId]
            ) as Promise<RowDataPacket[]>);

            if (!(result as []).length) {
                throw new HttpException(
                    404,
                    `Parent node with id of ${parentId} not found.`
                );
            }

            return (result as []).pop();
        };

        const parentBounds: GroupResult = await getParentBounds();

        await this.performTransaction(async () => {
            await this.db.execute(
                `UPDATE ${GroupRepository.table}
                 SET rgt = rgt + 2
                 WHERE rgt >= ?`,
                [parentBounds.rgt]
            );
            await this.db.execute(
                `UPDATE ${GroupRepository.table}
                 SET lft = lft + 2
                 WHERE lft > ?`,
                [
                    parentBounds.rgt - parentBounds.lft === 1 ||
                    !parentBounds.lft
                        ? parentBounds.lft
                        : parentBounds.rgt,
                ]
            );
            await this.db.execute(
                `INSERT INTO ${GroupRepository.table} (lft, rgt, parent_id, name)
                 VALUES (?, ?, ?, ?)`,
                [parentBounds.rgt, parentBounds.rgt + 1, parentId, name]
            );
        }, 'groups:subgroups:*');

        return {
            name,
            parentId,
        };
    }

    public async update(
        id: number,
        fields: { name?: string; parent_id?: number }
    ) {
        const [current] = await this.db.execute(
            `SELECT name, parent_id
             FROM ${GroupRepository.table}
             WHERE id = ?`,
            [id]
        );

        if (!(current as []).length) {
            throw new HttpException(404, `Node id of ${id} does not exist`);
        }

        const currentNode: GroupResult = (current as []).pop();

        if (fields.name) {
            await this.db.execute(
                `
                    UPDATE ${GroupRepository.table}
                    SET name = ?
                    WHERE id = ?
                `,
                [fields.name, id]
            );

            if (!fields.parent_id) {
                await this.invalidateCache(`groups:subgroups:${id}`);
                return {
                    name: fields.name,
                };
            }
        }

        const [parent] = await this.db.execute(
            `SELECT name, parent_id, lft, rgt
             FROM ${GroupRepository.table}
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

        await this.performTransaction(async () => {
            // temporary "remove" moving node
            await this.db.execute(
                `
                    UPDATE ${GroupRepository.table}
                    SET lft = 0 - (lft),
                        rgt = 0 - (rgt)
                    WHERE lft >= ?
                      AND rgt <= ?
                `,
                [currentNode.lft, currentNode.rgt]
            );

            // decrease left and/or right position values of currently 'lower' items (and parents)
            await this.db.execute(
                `
                    UPDATE ${GroupRepository.table}
                    SET lft = (lft) - ?
                    WHERE lft > ?
                `,
                [nodeSize, currentNode.rgt]
            );
            await this.db.execute(
                `
                    UPDATE ${GroupRepository.table}
                    SET rgt = (rgt) - ?
                    WHERE rgt > ?
                `,
                [nodeSize, currentNode.rgt]
            );

            // increase left and/or right position values of future 'lower' items (and parents)
            await this.db.execute(
                `
                    UPDATE ${GroupRepository.table}
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
            await this.db.execute(
                `
                    UPDATE ${GroupRepository.table}
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
            await this.db.execute(
                `
                    UPDATE ${GroupRepository.table}
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
            await this.db.execute(
                `
                    UPDATE ${GroupRepository.table}
                    SET parent_id = ?
                    WHERE id = ?
                `,
                [fields.parent_id, id]
            );
        }, 'groups:subgroups:*');

        return {
            parent_id: fields.parent_id,
        };
    }

    public async delete(id: null | number) {
        const [current] = await this.db.execute(
            `SELECT lft, rgt, (rgt - lft + 1) as depth
             FROM ${GroupRepository.table}
             WHERE id = ?`,
            [id]
        );

        if (!(current as []).length) {
            throw new HttpException(404, `Node id of ${id} does not exist`);
        }

        const currentNode: GroupResult = (current as []).pop();

        await this.performTransaction(async () => {
            await this.db.execute(
                `DELETE
                 FROM ${GroupRepository.table}
                 WHERE lft BETWEEN ? AND ?`,
                [currentNode.lft, currentNode.rgt]
            );
            await this.db.execute(
                `UPDATE ${GroupRepository.table}
                 SET rgt = rgt - ?
                 WHERE rgt > ?`,
                [currentNode.depth, currentNode.rgt]
            );
            await this.db.execute(
                `UPDATE ${GroupRepository.table}
                 SET lft = lft - ?
                 WHERE lft > ?`,
                [currentNode.depth, currentNode.lft]
            );
            await this.db.commit();
        }, 'groups:subgroups:*');
    }
}

export default GroupRepository;
