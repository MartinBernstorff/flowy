import { createCollection } from "@tanstack/react-db";
import { rxdbCollectionOptions } from "@tanstack/rxdb-db-collection";
import { z } from "zod";

import { createRxDatabase, addRxPlugin } from 'rxdb/plugins/core';

/**
 * Here we use IndexedDB based storage for RxDB.
 * RxDB has a wide range of storages based on Dexie.js, IndexedDB, SQLite and more.
 */

// Import IndexedDB storage
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

// add json-schema validation (optional)
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';

// Enable dev mode (optional, recommended during development)
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
addRxPlugin(RxDBDevModePlugin)

const db = await createRxDatabase({
  name: 'graph-db',
  storage: wrappedValidateAjvStorage({
    storage: getRxStorageDexie()
  })
})

const customNodeRxdbSchema = {
  title: "custom_nodes",
  version: 0,
  type: "object",
  primaryKey: "id",
  properties: {
    id: { type: "string", maxLength: 100 },
    label: { type: "string" },
    parents: { type: "array", items: { type: "string" } },
    isNew: { type: "boolean" },
    graph: { type: "string" }
  },
  required: ["id", "label", "parents"]
};

await db.addCollections({
  customNodes: {
    schema: customNodeRxdbSchema
  }
});

const CustomNodeId = z.string().brand<'CustomNodeId'>();
export type CustomNodeId = z.infer<typeof CustomNodeId>;

const GraphId = z.string().brand<'GraphId'>();
export type GraphId = z.infer<typeof GraphId>;

const CustomNodeSchema = z.object({
  id: CustomNodeId,
  label: z.string(),
  parents: z.array(CustomNodeId),
  isNew: z.boolean().default(false),
  graph: GraphId
});
export type CustomNode = z.infer<typeof CustomNodeSchema>;

// Use your RxDB collection instance here
export const nodeCollection = createCollection(
  rxdbCollectionOptions({
    rxCollection: db.customNodes,
    startSync: true,
    schema: CustomNodeSchema,
  })
);